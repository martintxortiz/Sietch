import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  calculateSessionMetrics,
  type ConditionMetrics,
  type DirectionMetrics,
  type SessionMetricTrade,
} from "@/lib/session-metrics"
import type { BacktestSessionMetricRow } from "@/lib/supabase/database.types"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})
const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

type MetricRow = {
  label: string
  value: string
  definition: string
  tone?: "positive" | "negative"
}

export default async function SessionPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params
  const supabase = await createClient()
  const sessionRequest = supabase
    .from("backtest_sessions")
    .select(
      "name, pair, tags, net_pnl, pnl_percent, trade_count, account_size, report_filename, strategy:strategies(name)",
    )
    .eq("id", uuid)
    .maybeSingle()
  const metricsRequest = supabase
    .from("backtest_session_metrics")
    .select("metric_key, metric_label, unit, value")
    .eq("session_id", uuid)
    .eq("scope", "all")
  const [sessionResult, trades, sourceMetricsResult] = await Promise.all([
    sessionRequest,
    loadSessionTrades(supabase, uuid),
    metricsRequest,
  ])

  if (sessionResult.error) throw sessionResult.error
  if (sourceMetricsResult.error) throw sourceMetricsResult.error
  if (!sessionResult.data) notFound()

  const session = sessionResult.data
  const metrics = calculateSessionMetrics(trades)
  const sourceMetrics = sourceMetricsResult.data
  const pnlVerified =
    metrics.tradeCount === session.trade_count &&
    Math.abs(metrics.netProfit - session.net_pnl) < 0.005

  const performance: MetricRow[] = [
    {
      label: "P&L data check",
      value: pnlVerified ? "Verified" : "Mismatch",
      definition: "Trade count and summed trade P&L match the stored session.",
      tone: pnlVerified ? "positive" : "negative",
    },
    moneyMetric("Net profit", metrics.netProfit, "Sum of all closed-trade P&L."),
    moneyMetric(
      "Gross profit",
      metrics.grossProfit,
      "Sum of profitable trades.",
    ),
    moneyMetric("Gross loss", metrics.grossLoss, "Sum of losing trades."),
    moneyMetric(
      "Expected payoff",
      metrics.expectedPayoff,
      "Net profit divided by closed trades.",
    ),
    {
      label: "Cumulative P&L",
      value: formatPercent(session.pnl_percent),
      definition: "Final cumulative P&L percentage supplied by TradingView.",
      tone: tone(session.pnl_percent),
    },
    {
      label: "Win rate",
      value: formatPercent(metrics.winRate * 100),
      definition: `${metrics.wins} wins, ${metrics.losses} losses, ${metrics.breakeven} breakeven.`,
    },
    {
      label: "Profit factor",
      value: formatOptional(metrics.profitFactor),
      definition: "Gross profit divided by absolute gross loss.",
    },
    moneyMetric(
      "Average winner",
      metrics.averageWin,
      "Gross profit divided by winning trades.",
    ),
    moneyMetric(
      "Average loser",
      metrics.averageLoss,
      "Gross loss divided by losing trades.",
    ),
  ]
  const risk: MetricRow[] = [
    moneyMetric(
      "Max drawdown (close-to-close)",
      -metrics.maxDrawdownClose,
      "Largest decline from a closed-trade equity peak.",
    ),
    moneyMetric(
      "Average drawdown (close-to-close)",
      -metrics.averageDrawdown,
      "Mean peak-to-trough decline across drawdown episodes.",
    ),
    {
      label: "Average drawdown duration",
      value: formatDuration(metrics.averageDrawdownDurationMinutes),
      definition: "Mean time from equity peak to episode trough.",
    },
    {
      label: "Recovery factor",
      value: formatOptional(metrics.recoveryFactor),
      definition: "Net profit divided by max close-to-close drawdown.",
    },
    moneyMetric(
      "Max drawdown (intrabar)",
      -metrics.maxDrawdownIntrabar,
      "Largest adverse excursion reported for one trade.",
    ),
    moneyMetric(
      "Average adverse excursion",
      -metrics.averageAdverseExcursion,
      "Mean adverse excursion across closed trades.",
    ),
    moneyMetric(
      "Max run-up (close-to-close)",
      metrics.maxRunupClose,
      "Largest rise from a closed-trade equity trough.",
    ),
    moneyMetric(
      "Average run-up (close-to-close)",
      metrics.averageRunup,
      "Mean trough-to-peak gain across run-up episodes.",
    ),
    {
      label: "Average run-up duration",
      value: formatDuration(metrics.averageRunupDurationMinutes),
      definition: "Mean time from equity trough to episode peak.",
    },
    moneyMetric(
      "Max run-up (intrabar)",
      metrics.maxRunupIntrabar,
      "Largest favorable excursion reported for one trade.",
    ),
    moneyMetric(
      "Average favorable excursion",
      metrics.averageFavorableExcursion,
      "Mean favorable excursion across closed trades.",
    ),
  ]
  const execution: MetricRow[] = [
    {
      label: "Max contracts held",
      value: numberFormatter.format(metrics.maxContractsHeld),
      definition: "Peak concurrent sum of open trade quantities.",
    },
    moneyMetric(
      "Average position value",
      metrics.averagePositionValue,
      "Mean entry position value.",
    ),
    moneyMetric(
      "Peak position value",
      metrics.maxPositionValue,
      "Largest entry position value.",
    ),
    {
      label: "Average holding duration",
      value: formatDuration(metrics.averageDurationMinutes),
      definition: "Mean elapsed time from entry to exit.",
    },
    {
      label: "Average duration",
      value: `${numberFormatter.format(metrics.averageDurationBars)} bars`,
      definition: "Mean TradingView trade duration in bars.",
    },
    moneyMetric(
      "Largest profit",
      metrics.largestProfit,
      "Best closed trade.",
    ),
    moneyMetric("Largest loss", metrics.largestLoss, "Worst closed trade."),
    percentMetric(
      "Net P&L as % of largest loss",
      metrics.netPnlToLargestLossPercent,
      "Net profit divided by the absolute largest loss.",
    ),
    percentMetric(
      "Largest profit as % of gross profit",
      metrics.largestProfitSharePercent,
      "How concentrated gross profit is in the largest winner.",
    ),
    percentMetric(
      "Largest loss as % of gross loss",
      metrics.largestLossSharePercent,
      "How concentrated gross loss is in the largest loser.",
    ),
  ]
  const reportMetrics = sourceMetricRows(session.account_size, sourceMetrics)
  const sourceMetric = (key: string, unit: string) =>
    sourceMetrics.find(
      (metric) => metric.metric_key === key && metric.unit === unit,
    )?.value ?? null
  const openPnl = sourceMetric("open_pnl", "amount")
  const balance = session.account_size === null
    ? null
    : session.account_size + metrics.netProfit
  const overview: MetricRow[] = [
    moneyMetric(
      "Equity",
      balance === null ? null : balance + (openPnl ?? 0),
      "Balance plus open P&L.",
    ),
    moneyMetric("Balance", balance, "Initial capital plus closed-trade net profit."),
    moneyMetric("Open P&L", openPnl, "Unrealized P&L at export time."),
    {
      label: "Win rate",
      value: formatPercent(metrics.winRate * 100),
      definition: "Winning closed trades divided by all closed trades.",
    },
    moneyMetric("Average profit", metrics.averageWin, "Average winning trade."),
    moneyMetric("Average loss", metrics.averageLoss, "Average losing trade."),
    {
      label: "Number of trades",
      value: numberFormatter.format(metrics.tradeCount),
      definition: "Closed trades imported from the CSV.",
    },
    {
      label: "Lots",
      value: numberFormatter.format(metrics.totalQuantity),
      definition: "Sum of TradingView trade quantity.",
    },
    {
      label: "Sharpe ratio",
      value: formatOptional(sourceMetric("sharpe_ratio", "ratio")),
      definition: "Risk-adjusted return supplied by the XLSX report.",
    },
    {
      label: "Average RRR",
      value: formatOptional(metrics.averageRiskReward),
      definition: "Average winner divided by the absolute average loser.",
    },
    moneyMetric("Expectancy", metrics.expectedPayoff, "Average P&L per closed trade."),
    {
      label: "Profit factor",
      value: formatOptional(metrics.profitFactor),
      definition: "Gross profit divided by absolute gross loss.",
    },
  ]

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-8 px-2 pt-2 pb-8">
      <header className="flex flex-col gap-3 border-b pb-4">
        <h1 className="text-xl font-semibold">{session.name}</h1>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge>{session.strategy.name}</Badge>
          <Badge>{session.pair}</Badge>
          {session.tags.map((tag) => (
            <Badge key={tag}>
              {tag}
            </Badge>
          ))}
        </div>
      </header>

      <MetricTable title="OVERVIEW" rows={overview} />
      <MetricTable title="PERFORMANCE" rows={performance} />
      <MetricTable title="RISK & RUN-UP" rows={risk} />
      <MetricTable title="POSITION & CONCENTRATION" rows={execution} />
      <DirectionTable
        long={metrics.directions.long}
        short={metrics.directions.short}
      />
      <ConditionTable title="ENTRY HOUR" rows={metrics.entryHours} />
      <ConditionTable title="SIZE / VOLUME" rows={metrics.quantities} />

      {session.report_filename ? (
        <MetricTable title="TRADINGVIEW REPORT" rows={reportMetrics} />
      ) : (
        <section className="flex flex-col gap-2 border-t pt-4">
          <h2 className="text-xs font-medium text-muted-foreground">CSV ONLY</h2>
          <p className="max-w-5xl text-sm text-muted-foreground">
            Edit this session to attach its matching XLSX and add benchmark,
            margin, liquidation, and risk-adjusted source metrics without
            re-uploading the CSV.
          </p>
        </section>
      )}
    </section>
  )
}

function sourceMetricRows(
  accountSize: number | null,
  metrics: Pick<
    BacktestSessionMetricRow,
    "metric_key" | "metric_label" | "unit" | "value"
  >[],
): MetricRow[] {
  const requested = [
    ["open_pnl", "amount", "Unrealized P&L at export time."],
    ["commission_paid", "amount", "Total commission reported by TradingView."],
    ["buy_and_hold_pnl", "amount", "Benchmark return over the same period."],
    ["strategy_outperformance", "amount", "Strategy P&L less buy-and-hold P&L."],
    ["annualized_return_cagr", "percent", "Annualized strategy return."],
    ["return_on_initial_capital", "percent", "Net return on starting capital."],
    ["account_size_required", "amount", "Capital TradingView estimates was required."],
    ["sharpe_ratio", "ratio", "Return relative to total volatility."],
    ["sortino_ratio", "ratio", "Return relative to downside volatility."],
    ["margin_calls", "count", "Margin calls during the test."],
  ] as const

  return [
    moneyMetric("Account size", accountSize, "Initial capital used by the backtest."),
    ...requested.flatMap(([key, unit, definition]) => {
      const metric = metrics.find(
        (candidate) => candidate.metric_key === key && candidate.unit === unit,
      )
      if (!metric) return []

      return [{
        label:
          key === "strategy_outperformance"
            ? metric.value < 0
              ? "Strategy underperformance"
              : "Strategy outperformance"
            : metric.metric_label,
        value: formatSourceMetric(metric.value, metric.unit),
        definition,
        tone: unit === "amount" || unit === "percent" ? tone(metric.value) : undefined,
      } satisfies MetricRow]
    }),
  ]
}

function MetricTable({ title, rows }: { title: string; rows: MetricRow[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      <Table className="table-fixed">
        <colgroup>
          <col className="w-[42%] sm:w-[32%]" />
          <col className="w-[58%] sm:w-[18%]" />
          <col className="hidden w-[50%] sm:table-column" />
        </colgroup>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Metric</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead className="hidden sm:table-cell">Definition</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium whitespace-normal">
                {row.label}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium tabular-nums",
                  row.tone === "positive" && "text-[#00c805]",
                  row.tone === "negative" && "text-[#ff5000]",
                )}
              >
                {row.value}
              </TableCell>
              <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">
                {row.definition}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

function DirectionTable({
  long,
  short,
}: {
  long: DirectionMetrics
  short: DirectionMetrics
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground">
        DIRECTION BREAKDOWN
      </h2>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Side</TableHead>
            <TableHead className="text-right">Trades</TableHead>
            <TableHead className="text-right">Win rate</TableHead>
            <TableHead className="text-right">Net P&L</TableHead>
            <TableHead className="text-right">Expected payoff</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {(["long", "short"] as const).map((side) => {
            const values = side === "long" ? long : short
            return (
              <TableRow key={side}>
                <TableCell className="font-medium capitalize">{side}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {values.trades}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatPercent(values.winRate * 100)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    values.netProfit < 0
                      ? "text-[#ff5000]"
                      : "text-[#00c805]",
                  )}
                >
                  {moneyFormatter.format(values.netProfit)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {moneyFormatter.format(values.expectedPayoff)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </section>
  )
}

function ConditionTable({
  title,
  rows,
}: {
  title: string
  rows: ConditionMetrics[]
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Condition</TableHead>
            <TableHead className="text-right">Trades</TableHead>
            <TableHead className="text-right">Win rate</TableHead>
            <TableHead className="text-right">Net P&L</TableHead>
            <TableHead className="text-right">Expectancy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.label}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right tabular-nums">{row.trades}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatPercent(row.winRate * 100)}
              </TableCell>
              <TableCell
                className={cn(
                  "text-right font-medium tabular-nums",
                  row.netProfit < 0 ? "text-[#ff5000]" : "text-[#00c805]",
                )}
              >
                {moneyFormatter.format(row.netProfit)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {moneyFormatter.format(row.expectedPayoff)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}

async function loadSessionTrades(
  supabase: Awaited<ReturnType<typeof createClient>>,
  uuid: string,
) {
  const trades: SessionMetricTrade[] = []
  const pageSize = 1_000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("backtest_trades")
      .select(
        "trade_number, side, entry_at, exit_at, quantity, position_value, net_pnl, favorable_excursion, adverse_excursion, duration_bars",
      )
      .eq("session_id", uuid)
      .order("trade_number")
      .range(from, from + pageSize - 1)

    if (error) throw error
    trades.push(...data)
    if (data.length < pageSize) return trades
  }
}

function moneyMetric(
  label: string,
  value: number | null,
  definition: string,
): MetricRow {
  return {
    label,
    value: value === null ? "—" : moneyFormatter.format(value),
    definition,
    tone: value === null ? undefined : tone(value),
  }
}

function percentMetric(
  label: string,
  value: number | null,
  definition: string,
): MetricRow {
  return {
    label,
    value: value === null ? "—" : formatPercent(value),
    definition,
  }
}

function formatPercent(value: number) {
  return percentFormatter.format(value / 100)
}

function formatOptional(value: number | null) {
  return value === null ? "—" : numberFormatter.format(value)
}

function formatSourceMetric(value: number, unit: string) {
  if (unit === "amount") return moneyFormatter.format(value)
  if (unit === "percent") return formatPercent(value)
  return numberFormatter.format(value)
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${numberFormatter.format(minutes)} min`
  if (minutes < 1_440) return `${numberFormatter.format(minutes / 60)} hr`
  return `${numberFormatter.format(minutes / 1_440)} days`
}

function tone(value: number): MetricRow["tone"] {
  if (value > 0) return "positive"
  if (value < 0) return "negative"
}
