import assert from "node:assert/strict"

import { parseTradingViewReport } from "../lib/tradingview-report.ts"
import { selectTradingViewFiles } from "../lib/tradingview-files.ts"

const headers = ["", "All NONE", "All %", "Long NONE", "Long %", "Short NONE", "Short %"]
const report = parseTradingViewReport([
  {
    name: "Performance",
    rows: [
      headers,
      ["Initial capital", 100_000, null, null, null, null, null],
      ["Net profit", 2_500, 2.5, 3_000, 3, -500, -0.5],
      ["Average run-up duration (close-to-close)", "3 days", null, null, null, null, null],
      ["Annualized return (CAGR)", null, 10.2, null, 12, null, -2],
    ],
  },
  {
    name: "Trades analysis",
    rows: [
      headers,
      ["Total trades", 42, null, 30, null, 12, null],
      ["Average bars in trades", 8.5, null, 9, null, 7.25, null],
    ],
  },
  {
    name: "Risk-adjusted performance",
    rows: [
      headers,
      ["Sharpe ratio", 1.4, null, 1.8, null, 0.4, null],
      ["Margin calls", 0, null, 0, null, 0, null],
    ],
  },
])

assert.equal(report.accountSize, 100_000)
assert.equal(report.tradeCount, 42)
assert.equal(report.metrics.length, 23)
assert.deepEqual(
  report.metrics.find(
    (metric) => metric.metric_key === "annualized_return_cagr" && metric.scope === "all",
  ),
  {
    category: "performance",
    metric_key: "annualized_return_cagr",
    metric_label: "Annualized return (CAGR)",
    scope: "all",
    unit: "percent",
    value: 10.2,
  },
)
assert.equal(
  report.metrics.find(
    (metric) => metric.metric_key === "average_bars_in_trades" && metric.scope === "short",
  )?.unit,
  "bars",
)
assert.equal(
  report.metrics.find(
    (metric) => metric.metric_key === "average_run_up_duration_close_to_close",
  )?.value,
  259_200,
)

const csvFile = { name: "session.csv", size: 10 }
const xlsxFile = { name: "session.xlsx", size: 10 }
assert.deepEqual(selectTradingViewFiles([csvFile]), { csv: csvFile, report: null })
assert.deepEqual(selectTradingViewFiles([csvFile, xlsxFile]), {
  csv: csvFile,
  report: xlsxFile,
})
assert.throws(() => selectTradingViewFiles([xlsxFile]))
assert.throws(() => selectTradingViewFiles([csvFile, csvFile]))

console.log("tradingview report check passed")
