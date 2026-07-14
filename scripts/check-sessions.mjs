import assert from "node:assert/strict"

import {
  emptySessionFilters,
  filterSessions,
  getSessionTagColor,
  getSessionFilterOptions,
  nextSessionSort,
  sortSessions,
} from "../lib/sessions.ts"

const sessions = [
  { id: "one", name: "Gold Breakout", strategy: "Opening Range", pair: "XAU/USD", periodDays: 30, uploadDate: "2026-07-12", tags: ["Breakout", "Metal"], trades: 84, pnlPercent: 3.24 },
  { id: "two", name: "Euro Trend", strategy: "Trend Following", pair: "EUR/USD", periodDays: 90, uploadDate: "2026-07-10", tags: ["Trend", "Forex"], trades: 47, pnlPercent: -0.62 },
]

assert.equal(filterSessions(sessions, "gold", emptySessionFilters).length, 1)
assert.deepEqual(
  filterSessions(sessions, "", {
    ...emptySessionFilters,
    pairs: ["XAU/USD", "GBP/USD"],
    tags: ["Breakout"],
  }).map(({ id }) => id),
  ["one"]
)
assert.deepEqual(
  filterSessions(sessions, "trend", emptySessionFilters).map(({ id }) => id),
  ["two"]
)
assert.equal(
  filterSessions(sessions, "", emptySessionFilters).length,
  sessions.length
)
assert.deepEqual(
  filterSessions(sessions, "opening range", emptySessionFilters).map(({ id }) => id),
  ["one"]
)
assert.deepEqual(
  filterSessions(sessions, "", {
    ...emptySessionFilters,
    strategies: ["Trend Following"],
  }).map(({ id }) => id),
  ["two"]
)
assert.equal(getSessionTagColor("Forex"), getSessionTagColor("Forex"))
assert.deepEqual(getSessionFilterOptions(sessions).pairs, ["XAU/USD", "EUR/USD"])

const ascending = nextSessionSort(null, "trades")
const descending = nextSessionSort(ascending, "trades")
assert.deepEqual(ascending, { key: "trades", direction: "asc" })
assert.deepEqual(descending, { key: "trades", direction: "desc" })
assert.equal(nextSessionSort(descending, "trades"), null)
assert.equal(sortSessions(sessions, ascending)[0].trades, 47)
assert.equal(sortSessions(sessions, descending)[0].trades, 84)

console.log("sessions check passed")
