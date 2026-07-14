export const backtestImportsBucket = "backtest-imports"

export function tradeSourcePath(userId: string, sessionId: string) {
  return `${userId}/${sessionId}/trades.csv`
}

export function reportSourcePath(userId: string, sessionId: string) {
  return `${userId}/${sessionId}/report-${crypto.randomUUID()}.xlsx`
}
