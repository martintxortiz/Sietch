import assert from "node:assert/strict"

import { calculateSessionMetrics } from "../lib/session-metrics.ts"

const trade = (tradeNumber, values) => ({
  trade_number: tradeNumber,
  side: "long",
  entry_at: `2026-01-01 ${values.entry}:00`,
  exit_at: `2026-01-01 ${values.exit}:00`,
  quantity: 1,
  position_value: 1_000,
  net_pnl: 0,
  favorable_excursion: 0,
  adverse_excursion: 0,
  duration_bars: 0,
  ...values,
})

const metrics = calculateSessionMetrics([
  trade(1, {
    entry: "08:00",
    exit: "09:00",
    quantity: 1,
    net_pnl: 100,
    favorable_excursion: 150,
    adverse_excursion: -10,
    duration_bars: 2,
  }),
  trade(2, {
    entry: "08:30",
    exit: "10:00",
    quantity: 2,
    position_value: 2_000,
    net_pnl: -40,
    favorable_excursion: 20,
    adverse_excursion: -60,
    duration_bars: 3,
  }),
  trade(3, {
    entry: "10:00",
    exit: "11:00",
    position_value: 1_500,
    net_pnl: -30,
    favorable_excursion: 10,
    adverse_excursion: -50,
    duration_bars: 4,
  }),
  trade(4, {
    entry: "11:00",
    exit: "12:00",
    side: "short",
    position_value: 2_500,
    net_pnl: 120,
    favorable_excursion: 180,
    adverse_excursion: -20,
    duration_bars: 5,
  }),
  trade(5, {
    entry: "12:00",
    exit: "13:00",
    side: "short",
    position_value: 1_200,
    net_pnl: -20,
    favorable_excursion: 5,
    adverse_excursion: -30,
    duration_bars: 6,
  }),
])

assert.equal(metrics.netProfit, 130)
assert.equal(metrics.grossProfit, 220)
assert.equal(metrics.grossLoss, -90)
assert.equal(metrics.expectedPayoff, 26)
assert.equal(metrics.wins, 2)
assert.equal(metrics.losses, 3)
assert.equal(metrics.winRate, 0.4)
assert.ok(Math.abs(metrics.profitFactor - 220 / 90) < 1e-12)
assert.equal(metrics.averageWin, 110)
assert.equal(metrics.averageLoss, -30)
assert.ok(Math.abs(metrics.averageRiskReward - 110 / 30) < 1e-12)
assert.equal(metrics.largestProfit, 120)
assert.equal(metrics.largestLoss, -40)
assert.equal(metrics.maxContractsHeld, 3)
assert.equal(metrics.totalQuantity, 6)
assert.equal(metrics.averagePositionValue, 1_640)
assert.equal(metrics.maxPositionValue, 2_500)
assert.equal(metrics.averageDurationMinutes, 66)
assert.equal(metrics.averageDurationBars, 4)
assert.equal(metrics.maxDrawdownClose, 70)
assert.equal(metrics.averageDrawdown, 45)
assert.equal(metrics.averageDrawdownDurationMinutes, 90)
assert.equal(metrics.maxRunupClose, 150)
assert.equal(metrics.averageRunup, 150)
assert.equal(metrics.averageRunupDurationMinutes, 240)
assert.equal(metrics.maxRunupIntrabar, 180)
assert.equal(metrics.averageFavorableExcursion, 73)
assert.equal(metrics.maxDrawdownIntrabar, 60)
assert.equal(metrics.averageAdverseExcursion, 34)
assert.ok(Math.abs(metrics.recoveryFactor - 130 / 70) < 1e-12)
assert.equal(metrics.netPnlToLargestLossPercent, 325)
assert.ok(Math.abs(metrics.largestProfitSharePercent - 120 / 220 * 100) < 1e-12)
assert.ok(Math.abs(metrics.largestLossSharePercent - 40 / 90 * 100) < 1e-12)
assert.deepEqual(metrics.directions.long, {
  trades: 3,
  netProfit: 30,
  winRate: 1 / 3,
  expectedPayoff: 10,
})
assert.deepEqual(metrics.directions.short, {
  trades: 2,
  netProfit: 100,
  winRate: 0.5,
  expectedPayoff: 50,
})
assert.deepEqual(metrics.entryHours[0], {
  label: "08:00 UTC",
  trades: 2,
  netProfit: 60,
  winRate: 0.5,
  expectedPayoff: 30,
})
assert.deepEqual(metrics.quantities, [
  {
    label: "1 qty",
    trades: 4,
    netProfit: 170,
    winRate: 0.5,
    expectedPayoff: 42.5,
  },
  {
    label: "2 qty",
    trades: 1,
    netProfit: -40,
    winRate: 0,
    expectedPayoff: -40,
  },
])

const empty = calculateSessionMetrics([])
assert.equal(empty.netProfit, 0)
assert.equal(empty.tradeCount, 0)
assert.equal(empty.profitFactor, null)
assert.equal(empty.averageRiskReward, null)

const immediate = calculateSessionMetrics([
  trade(1, {
    entry: "08:00",
    exit: "08:00",
    quantity: 2,
  }),
])
assert.equal(immediate.maxContractsHeld, 2)

console.log("session metrics check passed")
