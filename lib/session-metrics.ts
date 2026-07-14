export interface SessionMetricTrade {
  trade_number: number
  side: string
  entry_at: string
  exit_at: string
  quantity: number
  position_value: number
  net_pnl: number
  favorable_excursion: number
  adverse_excursion: number
  duration_bars: number
}

export interface DirectionMetrics {
  trades: number
  netProfit: number
  winRate: number
  expectedPayoff: number
}

export interface ConditionMetrics extends DirectionMetrics {
  label: string
}

export interface SessionMetrics {
  tradeCount: number
  wins: number
  losses: number
  breakeven: number
  winRate: number
  netProfit: number
  grossProfit: number
  grossLoss: number
  expectedPayoff: number
  profitFactor: number | null
  averageWin: number | null
  averageLoss: number | null
  averageRiskReward: number | null
  largestProfit: number | null
  largestLoss: number | null
  maxContractsHeld: number
  totalQuantity: number
  averagePositionValue: number
  maxPositionValue: number
  averageDurationMinutes: number
  averageDurationBars: number
  averageRunup: number
  averageRunupDurationMinutes: number
  maxRunupClose: number
  averageFavorableExcursion: number
  maxRunupIntrabar: number
  averageDrawdown: number
  averageDrawdownDurationMinutes: number
  maxDrawdownClose: number
  averageAdverseExcursion: number
  maxDrawdownIntrabar: number
  recoveryFactor: number | null
  netPnlToLargestLossPercent: number | null
  largestProfitSharePercent: number | null
  largestLossSharePercent: number | null
  directions: Record<"long" | "short", DirectionMetrics>
  entryHours: ConditionMetrics[]
  quantities: ConditionMetrics[]
}

type Excursion = { amount: number; durationMinutes: number }

export function calculateSessionMetrics(
  trades: SessionMetricTrade[],
): SessionMetrics {
  const ordered = [...trades].sort(
    (left, right) =>
      timestamp(left.exit_at) - timestamp(right.exit_at) ||
      left.trade_number - right.trade_number,
  )
  const profits = ordered.filter(({ net_pnl }) => net_pnl > 0)
  const losses = ordered.filter(({ net_pnl }) => net_pnl < 0)
  const netProfit = sum(ordered.map(({ net_pnl }) => net_pnl))
  const grossProfit = sum(profits.map(({ net_pnl }) => net_pnl))
  const grossLoss = sum(losses.map(({ net_pnl }) => net_pnl))
  const largestProfit = profits.length
    ? Math.max(...profits.map(({ net_pnl }) => net_pnl))
    : null
  const largestLoss = losses.length
    ? Math.min(...losses.map(({ net_pnl }) => net_pnl))
    : null
  const equity = closedEquity(ordered)
  const runups = equityExcursions(equity, "up")
  const drawdowns = equityExcursions(equity, "down")
  const maxDrawdownClose = max(drawdowns.map(({ amount }) => amount))
  const largestLossAbsolute = Math.abs(largestLoss ?? 0)

  const averageWin = profits.length ? grossProfit / profits.length : null
  const averageLoss = losses.length ? grossLoss / losses.length : null

  return {
    tradeCount: ordered.length,
    wins: profits.length,
    losses: losses.length,
    breakeven: ordered.length - profits.length - losses.length,
    winRate: ratio(profits.length, ordered.length),
    netProfit,
    grossProfit,
    grossLoss,
    expectedPayoff: ratio(netProfit, ordered.length),
    profitFactor: grossLoss ? grossProfit / Math.abs(grossLoss) : null,
    averageWin,
    averageLoss,
    averageRiskReward:
      averageWin !== null && averageLoss !== null
        ? averageWin / Math.abs(averageLoss)
        : null,
    largestProfit,
    largestLoss,
    maxContractsHeld: concurrentQuantity(ordered),
    totalQuantity: sum(ordered.map(({ quantity }) => quantity)),
    averagePositionValue: average(
      ordered.map(({ position_value }) => position_value),
    ),
    maxPositionValue: max(ordered.map(({ position_value }) => position_value)),
    averageDurationMinutes: average(
      ordered.map(
        ({ entry_at, exit_at }) =>
          (timestamp(exit_at) - timestamp(entry_at)) / 60_000,
      ),
    ),
    averageDurationBars: average(
      ordered.map(({ duration_bars }) => duration_bars),
    ),
    averageRunup: average(runups.map(({ amount }) => amount)),
    averageRunupDurationMinutes: average(
      runups.map(({ durationMinutes }) => durationMinutes),
    ),
    maxRunupClose: max(runups.map(({ amount }) => amount)),
    averageFavorableExcursion: average(
      ordered.map(({ favorable_excursion }) => favorable_excursion),
    ),
    maxRunupIntrabar: max(
      ordered.map(({ favorable_excursion }) => favorable_excursion),
    ),
    averageDrawdown: average(drawdowns.map(({ amount }) => amount)),
    averageDrawdownDurationMinutes: average(
      drawdowns.map(({ durationMinutes }) => durationMinutes),
    ),
    maxDrawdownClose,
    averageAdverseExcursion: average(
      ordered.map(({ adverse_excursion }) =>
        Math.abs(Math.min(0, adverse_excursion)),
      ),
    ),
    maxDrawdownIntrabar: max(
      ordered.map(({ adverse_excursion }) =>
        Math.abs(Math.min(0, adverse_excursion)),
      ),
    ),
    recoveryFactor: maxDrawdownClose ? netProfit / maxDrawdownClose : null,
    netPnlToLargestLossPercent: largestLossAbsolute
      ? (netProfit / largestLossAbsolute) * 100
      : null,
    largestProfitSharePercent:
      largestProfit !== null && grossProfit
        ? (largestProfit / grossProfit) * 100
        : null,
    largestLossSharePercent:
      largestLoss !== null && grossLoss
        ? (Math.abs(largestLoss) / Math.abs(grossLoss)) * 100
        : null,
    directions: {
      long: directionMetrics(ordered, "long"),
      short: directionMetrics(ordered, "short"),
    },
    entryHours: groupedMetrics(
      ordered,
      ({ entry_at }) => `${String(new Date(timestamp(entry_at)).getUTCHours()).padStart(2, "0")}:00 UTC`,
    ),
    quantities: groupedMetrics(
      ordered,
      ({ quantity }) => `${quantity} qty`,
      (left, right) => Number.parseFloat(left) - Number.parseFloat(right),
    ),
  }
}

function groupedMetrics(
  trades: SessionMetricTrade[],
  labelFor: (trade: SessionMetricTrade) => string,
  sort: (left: string, right: string) => number = (left, right) =>
    left.localeCompare(right),
) {
  const groups = new Map<string, SessionMetricTrade[]>()
  for (const trade of trades) {
    const label = labelFor(trade)
    const group = groups.get(label)
    if (group) group.push(trade)
    else groups.set(label, [trade])
  }

  return [...groups.entries()]
    .sort(([left], [right]) => sort(left, right))
    .map(([label, matches]) => ({
      label,
      ...directionMetrics(matches, "all"),
    }))
}

function directionMetrics(trades: SessionMetricTrade[], side: string) {
  const matches = side === "all"
    ? trades
    : trades.filter((trade) => trade.side === side)
  const netProfit = sum(matches.map(({ net_pnl }) => net_pnl))

  return {
    trades: matches.length,
    netProfit,
    winRate: ratio(
      matches.filter(({ net_pnl }) => net_pnl > 0).length,
      matches.length,
    ),
    expectedPayoff: ratio(netProfit, matches.length),
  }
}

function closedEquity(trades: SessionMetricTrade[]) {
  let value = 0

  if (!trades.length) return []

  return [
    {
      at: Math.min(...trades.map(({ entry_at }) => timestamp(entry_at))),
      value: 0,
    },
    ...trades.map((trade) => {
      value += trade.net_pnl
      return { at: timestamp(trade.exit_at), value }
    }),
  ]
}

function equityExcursions(
  points: { at: number; value: number }[],
  direction: "up" | "down",
) {
  if (!points.length) return []

  const excursions: Excursion[] = []
  let anchor = 0
  let anchorAt = points[0].at
  let current: Excursion | null = null

  for (const point of points) {
    const amount =
      direction === "up" ? point.value - anchor : anchor - point.value

    if (amount <= 0) {
      if (current) excursions.push(current)
      anchor = point.value
      anchorAt = point.at
      current = null
    } else if (!current || amount > current.amount) {
      current = {
        amount,
        durationMinutes: (point.at - anchorAt) / 60_000,
      }
    }
  }

  if (current) excursions.push(current)
  return excursions
}

function concurrentQuantity(trades: SessionMetricTrade[]) {
  const events = new Map<
    number,
    { entering: number; exiting: number; immediate: number }
  >()

  for (const trade of trades) {
    const entryAt = timestamp(trade.entry_at)
    const exitAt = timestamp(trade.exit_at)

    if (entryAt === exitAt) {
      eventAt(events, entryAt).immediate += trade.quantity
    } else {
      eventAt(events, entryAt).entering += trade.quantity
      eventAt(events, exitAt).exiting += trade.quantity
    }
  }

  let current = 0
  let highest = 0

  for (const [, event] of [...events].sort(([left], [right]) => left - right)) {
    current -= event.exiting
    highest = Math.max(highest, current + event.entering, event.immediate)
    current += event.entering
  }

  return highest
}

function eventAt(
  events: Map<
    number,
    { entering: number; exiting: number; immediate: number }
  >,
  at: number,
) {
  const event = events.get(at) ?? { entering: 0, exiting: 0, immediate: 0 }
  events.set(at, event)
  return event
}

function timestamp(value: string) {
  const normalized = value.replace(" ", "T")
  const parsed = Date.parse(
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(normalized)
      ? normalized
      : `${normalized}Z`,
  )

  if (!Number.isFinite(parsed)) throw new Error(`Invalid trade date: ${value}`)
  return parsed
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function average(values: number[]) {
  return ratio(sum(values), values.length)
}

function ratio(numerator: number, denominator: number) {
  return denominator ? numerator / denominator : 0
}

function max(values: number[]) {
  return values.length ? Math.max(...values) : 0
}
