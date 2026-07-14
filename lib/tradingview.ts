export interface TradingViewTrade {
  trade_number: number
  side: "long" | "short"
  entry_at: string
  exit_at: string
  entry_signal: string
  exit_signal: string
  entry_price: number
  exit_price: number
  quantity: number
  position_value: number
  net_pnl: number
  return_percent: number
  favorable_excursion: number
  favorable_excursion_percent: number
  adverse_excursion: number
  adverse_excursion_percent: number
  cumulative_pnl: number
  cumulative_pnl_percent: number
  duration_bars: number
}

export interface TradingViewImport {
  startedAt: string
  endedAt: string
  trades: TradingViewTrade[]
}

const requiredHeaders = {
  tradeNumber: "Trade number",
  type: "Type",
  timestamp: "Date and time",
  signal: "Signal",
  price: "Price",
  quantity: "Size (qty)",
  positionValue: "Size (value)",
  netPnl: "Net PnL",
  returnPercent: "Return %",
  favorableExcursion: "Favorable excursion",
  favorableExcursionPercent: "Favorable excursion %",
  adverseExcursion: "Adverse excursion",
  adverseExcursionPercent: "Adverse excursion %",
  cumulativePnl: "Cumulative PnL",
  cumulativePnlPercent: "Cumulative PnL %",
  durationBars: "Duration (bars)",
} as const

type TradingViewColumn = keyof typeof requiredHeaders
type TradingViewRow = Record<TradingViewColumn, string>

export function parseTradingViewCsv(csv: string): TradingViewImport {
  const rows = parseCsv(csv)
  const headers = rows.shift()?.map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  )

  if (!headers) throw new Error("The CSV is empty.")

  const indexes = Object.fromEntries(
    Object.entries(requiredHeaders).map(([key, label]) => [
      key,
      findHeader(headers, label),
    ]),
  ) as Record<TradingViewColumn, number>
  const missing = Object.entries(indexes)
    .filter(([, index]) => index === -1)
    .map(([key]) => requiredHeaders[key as TradingViewColumn])
  if (missing.length) {
    throw new Error(`Missing TradingView columns: ${missing.join(", ")}.`)
  }

  const trades = new Map<
    number,
    { entry?: TradingViewRow; exit?: TradingViewRow; side?: "long" | "short" }
  >()

  for (const values of rows) {
    if (values.length !== headers.length) {
      throw new Error("The CSV contains an incomplete row.")
    }

    const row = Object.fromEntries(
      Object.entries(indexes).map(([key, index]) => [
        key,
        values[index]?.trim() ?? "",
      ]),
    ) as TradingViewRow
    const tradeNumber = parseInteger(row.tradeNumber, "Trade number")
    if (tradeNumber <= 0) throw new Error("Trade number must be positive.")
    const type = /^(Entry|Exit) (long|short)$/i.exec(row.type)

    if (!type) throw new Error(`Unsupported trade type: ${row.type || "empty"}.`)

    const event = type[1].toLowerCase() as "entry" | "exit"
    const side = type[2].toLowerCase() as "long" | "short"
    const trade = trades.get(tradeNumber) ?? {}

    if (trade[event]) throw new Error(`Trade ${tradeNumber} has duplicate ${event} rows.`)
    if (trade.side && trade.side !== side) {
      throw new Error(`Trade ${tradeNumber} changes direction.`)
    }

    trade[event] = row
    trade.side = side
    trades.set(tradeNumber, trade)
  }

  if (trades.size === 0) throw new Error("The CSV does not contain any trades.")
  if (trades.size > 10000) throw new Error("A session can contain at most 10,000 trades.")

  const parsedTrades = [...trades.entries()]
    .sort(([left], [right]) => left - right)
    .map(([tradeNumber, trade]) => {
      if (!trade.entry || !trade.exit || !trade.side) {
        throw new Error(`Trade ${tradeNumber} needs one entry and one exit row.`)
      }

      const entryAt = parseTimestamp(trade.entry.timestamp)
      const exitAt = parseTimestamp(trade.exit.timestamp)

      if (exitAt < entryAt) throw new Error(`Trade ${tradeNumber} exits before it enters.`)

      return {
        trade_number: tradeNumber,
        side: trade.side,
        entry_at: entryAt,
        exit_at: exitAt,
        entry_signal: trade.entry.signal,
        exit_signal: trade.exit.signal,
        entry_price: parseNonNegative(trade.entry.price, "Entry price"),
        exit_price: parseNonNegative(trade.exit.price, "Exit price"),
        quantity: parsePositive(trade.entry.quantity, "Size"),
        position_value: parseNonNegative(trade.entry.positionValue, "Position value"),
        net_pnl: parseNumber(trade.exit.netPnl, "Net PnL"),
        return_percent: parseNumber(trade.exit.returnPercent, "Return"),
        favorable_excursion: parseNumber(
          trade.exit.favorableExcursion,
          "Favorable excursion",
        ),
        favorable_excursion_percent: parseNumber(
          trade.exit.favorableExcursionPercent,
          "Favorable excursion percent",
        ),
        adverse_excursion: parseNumber(
          trade.exit.adverseExcursion,
          "Adverse excursion",
        ),
        adverse_excursion_percent: parseNumber(
          trade.exit.adverseExcursionPercent,
          "Adverse excursion percent",
        ),
        cumulative_pnl: parseNumber(
          trade.exit.cumulativePnl,
          "Cumulative PnL",
        ),
        cumulative_pnl_percent: parseNumber(
          trade.exit.cumulativePnlPercent,
          "Cumulative PnL percent",
        ),
        duration_bars: parseNonNegativeInteger(
          trade.exit.durationBars,
          "Duration",
        ),
      }
    })

  return {
    startedAt: parsedTrades.reduce(
      (earliest, trade) => (trade.entry_at < earliest ? trade.entry_at : earliest),
      parsedTrades[0].entry_at,
    ),
    endedAt: parsedTrades.reduce(
      (latest, trade) => (trade.exit_at > latest ? trade.exit_at : latest),
      parsedTrades[0].exit_at,
    ),
    trades: parsedTrades,
  }
}

export function tradingViewFileDefaults(filename: string) {
  const match = /^Replay_Trading_(.+)_\d{4}-\d{2}-\d{2}(?:-\d+)?\.(?:csv|xlsx)$/i.exec(
    filename,
  )

  if (!match) {
    return {
      name: filename.replace(/\.(?:csv|xlsx)$/i, "").replaceAll("_", " "),
      pair: "",
    }
  }

  const symbol = match[1]
  const [exchange, ...tickerParts] = symbol.split("_")
  const ticker = tickerParts.join("_")

  return {
    name: `${ticker || exchange} Backtest`,
    pair: ticker ? `${exchange}:${ticker}` : exchange,
  }
}

function findHeader(headers: string[], label: string) {
  if (["Price", "Net PnL", "Favorable excursion", "Adverse excursion", "Cumulative PnL"].includes(label)) {
    return headers.findIndex(
      (header) => header === label || (header.startsWith(`${label} `) && !header.endsWith("%")),
    )
  }

  return headers.indexOf(label)
}

function parseCsv(csv: string) {
  const rows: string[][] = []
  let row: string[] = []
  let value = ""
  let quoted = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]

    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        value += '"'
        index += 1
      } else if (character === '"') {
        quoted = false
      } else {
        value += character
      }
    } else if (character === '"' && value === "") {
      quoted = true
    } else if (character === ",") {
      row.push(value)
      value = ""
    } else if (character === "\n") {
      row.push(value.replace(/\r$/, ""))
      if (row.some((cell) => cell.trim() !== "")) rows.push(row)
      row = []
      value = ""
    } else {
      value += character
    }
  }

  if (quoted) throw new Error("The CSV contains an unclosed quote.")
  row.push(value.replace(/\r$/, ""))
  if (row.some((cell) => cell.trim() !== "")) rows.push(row)
  return rows
}

function parseNumber(value: string, label: string) {
  const normalized = value.replace(/[,$%\s]/g, "").replace("−", "-")
  if (!normalized) throw new Error(`${label} is required.`)

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not a valid number.`)
  return parsed
}

function parsePositive(value: string, label: string) {
  const parsed = parseNumber(value, label)
  if (parsed <= 0) throw new Error(`${label} must be positive.`)
  return parsed
}

function parseNonNegative(value: string, label: string) {
  const parsed = parseNumber(value, label)
  if (parsed < 0) throw new Error(`${label} cannot be negative.`)
  return parsed
}

function parseInteger(value: string, label: string) {
  const parsed = parseNumber(value, label)
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be a whole number.`)
  return parsed
}

function parseNonNegativeInteger(value: string, label: string) {
  const parsed = parseInteger(value, label)
  if (parsed < 0) throw new Error(`${label} cannot be negative.`)
  return parsed
}

function parseTimestamp(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) throw new Error(`Invalid TradingView date: ${value || "empty"}.`)

  const [, year, month, day, hour, minute, second = "00"] = match
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second))
  if (
    date.getUTCFullYear() !== +year ||
    date.getUTCMonth() !== +month - 1 ||
    date.getUTCDate() !== +day ||
    date.getUTCHours() !== +hour ||
    date.getUTCMinutes() !== +minute ||
    date.getUTCSeconds() !== +second
  ) {
    throw new Error(`Invalid TradingView date: ${value}.`)
  }

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
}
