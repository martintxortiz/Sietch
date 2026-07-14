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
export type SessionSortKey =
  | "name"
  | "strategy"
  | "pair"
  | "periodDays"
  | "trades"
  | "pnlPercent"
export type SessionSort = {
  key: SessionSortKey
  direction: "asc" | "desc"
} | null

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

const unique = (values: string[]) => [...new Set(values)]

export function getSessionFilterOptions(
  sessions: BacktestSession[],
): Record<SessionFilterKey, string[]> {
  return {
    pairs: unique(sessions.map(({ pair }) => pair)),
    strategies: unique(sessions.map(({ strategy }) => strategy)),
    tags: unique(sessions.flatMap(({ tags }) => tags)),
  }
}

export function filterSessions(
  items: BacktestSession[],
  query: string,
  filters: SessionFilters
) {
  const search = query.trim().toLowerCase()

  return items.filter((session) =>
    (!search ||
      `${session.name} ${session.strategy} ${session.pair} ${session.tags.join(" ")}`
        .toLowerCase()
        .includes(search)) &&
    (filters.pairs.length === 0 || filters.pairs.includes(session.pair)) &&
    (filters.strategies.length === 0 ||
      filters.strategies.includes(session.strategy)) &&
    (filters.tags.length === 0 ||
      session.tags.some((tag) => filters.tags.includes(tag)))
  )
}

export function nextSessionSort(
  current: SessionSort,
  key: SessionSortKey
): SessionSort {
  if (!current || current.key !== key) return { key, direction: "asc" }
  if (current.direction === "asc") return { key, direction: "desc" }
  return null
}

export function sortSessions(items: BacktestSession[], sort: SessionSort) {
  if (!sort) return items

  const direction = sort.direction === "asc" ? 1 : -1
  return [...items].sort((a, b) => {
    const left = a[sort.key]
    const right = b[sort.key]
    const comparison =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right))

    return comparison * direction
  })
}
