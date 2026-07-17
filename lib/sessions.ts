export interface BacktestSession {
  id: string
  name: string
  strategyId: string
  strategy: string
  pair: string
  periodDays: number
  uploadDate: string
  tags: string[]
  trades: number
  pnlPercent: number
  accountSize: number | null
  reportFilename: string | null
  reportPath: string | null
}

export type SessionFilterKey = "pairs" | "strategies" | "tags"
export type SessionFilters = Record<SessionFilterKey, string[]>

export const emptySessionFilters: SessionFilters = {
  pairs: [],
  strategies: [],
  tags: [],
}

const sessionTagColors = [
  "orange",
  "amber",
  "lime",
  "teal",
  "cyan",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
] as const

export function getSessionTagColor(tag: string) {
  const hash = [...tag].reduce((value, character) => {
    return (value * 31 + character.charCodeAt(0)) | 0
  }, 0)

  return sessionTagColors[Math.abs(hash) % sessionTagColors.length]
}
