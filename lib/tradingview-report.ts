export type TradingViewMetricCategory =
  | "performance"
  | "trades_analysis"
  | "risk_adjusted"

export type TradingViewMetricUnit =
  | "amount"
  | "percent"
  | "count"
  | "ratio"
  | "bars"
  | "duration"

export interface TradingViewSourceMetric {
  category: TradingViewMetricCategory
  metric_key: string
  metric_label: string
  scope: "all" | "long" | "short"
  unit: TradingViewMetricUnit
  value: number
}

export interface TradingViewReport {
  accountSize: number
  metrics: TradingViewSourceMetric[]
  tradeCount: number
}

type Cell = string | number | boolean | Date | null | undefined
type Sheet = { name: string; rows: Cell[][] }

const reportSheets = {
  Performance: "performance",
  "Trades analysis": "trades_analysis",
  "Risk-adjusted performance": "risk_adjusted",
} as const satisfies Record<string, TradingViewMetricCategory>

const countMetrics = new Set([
  "max_contracts_held",
  "total_open_trades",
  "total_trades",
  "total_winners",
  "total_losers",
  "even_trades",
  "outliers",
  "margin_calls",
])
const ratioMetrics = new Set([
  "margin_efficiency",
  "return_of_max_drawdown",
  "average_profit_average_loss",
  "sharpe_ratio",
  "sortino_ratio",
  "profit_factor",
])

export async function readTradingViewReport(file: File) {
  const XLSX = await import("@e965/xlsx")
  const workbook = XLSX.read(await file.arrayBuffer(), {
    type: "array",
    cellDates: true,
  })
  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils.sheet_to_json(workbook.Sheets[name], {
      header: 1,
      raw: true,
      defval: null,
    }) as Cell[][],
  }))

  return parseTradingViewReport(sheets)
}

export function parseTradingViewReport(sheets: Sheet[]): TradingViewReport {
  const metrics = Object.entries(reportSheets).flatMap(([name, category]) => {
    const sheet = sheets.find((candidate) => candidate.name === name)
    if (!sheet) throw new Error(`The XLSX is missing the ${name} sheet.`)
    return parseMetricSheet(sheet.rows, category)
  })
  const accountSize = metricValue(metrics, "initial_capital", "all", "amount")
  const tradeCount = metricValue(metrics, "total_trades", "all", "count")

  if (accountSize <= 0) throw new Error("Initial capital must be positive.")
  if (!Number.isInteger(tradeCount) || tradeCount < 0) {
    throw new Error("The workbook has an invalid total trade count.")
  }

  return { accountSize, metrics, tradeCount }
}

function parseMetricSheet(
  rows: Cell[][],
  category: TradingViewMetricCategory,
) {
  const headers = rows[0]?.map(String)
  if (!headers?.length) throw new Error("A TradingView report sheet is empty.")

  return rows.slice(1).flatMap((row) => {
    const label = typeof row[0] === "string" ? row[0].trim() : ""
    if (!label) return []
    const metricKey = slug(label)

    return row.slice(1).flatMap((cell, offset) => {
      const column = headers[offset + 1]
      const scope = metricScope(column)
      const value = numericValue(cell, metricKey)
      if (!scope || value === null) return []

      return [{
        category,
        metric_key: metricKey,
        metric_label: label,
        scope,
        unit: metricUnit(column, metricKey),
        value,
      } satisfies TradingViewSourceMetric]
    })
  })
}

function metricScope(column: string) {
  const scope = /^(All|Long|Short)\b/i.exec(column)?.[1].toLowerCase()
  return scope === "all" || scope === "long" || scope === "short"
    ? scope
    : null
}

function metricUnit(column: string, metricKey: string): TradingViewMetricUnit {
  if (column.trim().endsWith("%")) return "percent"
  if (countMetrics.has(metricKey)) return "count"
  if (ratioMetrics.has(metricKey)) return "ratio"
  if (metricKey.startsWith("average_bars_")) return "bars"
  if (metricKey.includes("duration")) return "duration"
  return "amount"
}

function numericValue(cell: Cell, metricKey: string) {
  if (cell === null || cell === undefined || cell === "") return null
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null
  if (metricKey.includes("duration")) {
    const duration = durationSeconds(cell)
    if (duration !== null) return duration
  }

  const parsed = Number(String(cell).replace(/[,$%\s]/g, "").replace("−", "-"))
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid value for ${metricKey.replaceAll("_", " ")}.`)
  }
  return parsed
}

function durationSeconds(cell: Cell) {
  if (cell instanceof Date) {
    return Math.max(0, (cell.getTime() - Date.UTC(1899, 11, 30)) / 1000)
  }

  const value = String(cell).trim()
  const parts = [...value.matchAll(/(\d+(?:\.\d+)?)\s*(days?|hours?|minutes?|seconds?)/gi)]
  if (!parts.length || value.replace(/(\d+(?:\.\d+)?)\s*(days?|hours?|minutes?|seconds?)/gi, "").replace(/[\s,]+/g, "")) {
    return null
  }

  return parts.reduce((total, [, amount, unit]) => {
    const multiplier = unit.toLowerCase().startsWith("day")
      ? 86_400
      : unit.toLowerCase().startsWith("hour")
        ? 3_600
        : unit.toLowerCase().startsWith("minute")
          ? 60
          : 1
    return total + Number(amount) * multiplier
  }, 0)
}

function metricValue(
  metrics: TradingViewSourceMetric[],
  key: string,
  scope: TradingViewSourceMetric["scope"],
  unit: TradingViewMetricUnit,
) {
  const metric = metrics.find(
    (candidate) =>
      candidate.metric_key === key &&
      candidate.scope === scope &&
      candidate.unit === unit,
  )
  if (!metric) throw new Error(`The workbook is missing ${key.replaceAll("_", " ")}.`)
  return metric.value
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}
