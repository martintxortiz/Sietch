import assert from "node:assert/strict"

import {
  parseTradingViewCsv,
  tradingViewFileDefaults,
} from "../lib/tradingview.ts"

const csv = `Trade number,Type,Date and time,Signal,Price USD,Size (qty),Size (value),Net PnL USD,Return %,Favorable excursion USD,Favorable excursion %,Adverse excursion USD,Adverse excursion %,Cumulative PnL USD,Cumulative PnL %,Duration (bars)
1,Exit long,2026-07-07 11:40,Sell market order,69.13,1,69440,-310,-0.45,300,0.43,-470,-0.68,-310,-0.03,35
1,Entry long,2026-07-07 08:45,"Buy, market order",69.44,1,69440,-310,-0.45,300,0.43,-470,-0.68,-310,-0.03,35`

const parsed = parseTradingViewCsv(csv)
assert.equal(parsed.trades.length, 1)
assert.equal(parsed.trades[0].entry_signal, "Buy, market order")
assert.equal(parsed.trades[0].net_pnl, -310)
assert.equal(parsed.startedAt, "2026-07-07 08:45:00")
const unitless = parseTradingViewCsv(
  csv
    .replace("Price USD", "Price")
    .replaceAll(" PnL USD", " PnL NONE")
    .replaceAll("excursion USD", "excursion NONE"),
)
assert.equal(unitless.trades[0].net_pnl, -310)
assert.deepEqual(
  tradingViewFileDefaults("Replay_Trading_NYMEX_CL1!_2026-07-14.csv"),
  { name: "CL1! Backtest", pair: "NYMEX:CL1!" },
)
assert.deepEqual(
  tradingViewFileDefaults("Replay_Trading_NYMEX_CL1!_2026-07-14-1.csv"),
  { name: "CL1! Backtest", pair: "NYMEX:CL1!" },
)
assert.deepEqual(
  tradingViewFileDefaults("Replay_Trading_NASDAQ_NDX_2026-07-14.xlsx"),
  { name: "NDX Backtest", pair: "NASDAQ:NDX" },
)
assert.deepEqual(tradingViewFileDefaults("custom.csv"), {
  name: "custom",
  pair: "",
})
assert.throws(() => parseTradingViewCsv(csv.split("\n").slice(0, 2).join("\n")))

console.log("tradingview check passed")
