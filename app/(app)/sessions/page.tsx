"use client"

import { useRouter } from "next/navigation"
import {
  type KeyboardEvent,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react"

import {
  CardMetric,
  CardViewToggle,
  DataSearch,
  FilterTag,
  FilterValue,
  nextExplorerSort,
  PaginationFooter,
  SortHeader,
  type ExplorerSort,
  usePersistedCardView,
} from "@/components/data-explorer"
import { SessionActions } from "@/components/sessions/session-actions"
import {
  SessionFilterChips,
  SessionFilterMenu,
} from "@/components/sessions/session-filters"
import { UploadSessionDialog } from "@/components/sessions/upload-session-dialog"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  emptySessionFilters,
  type BacktestSession,
  type SessionFilterKey,
  type SessionFilters,
} from "@/lib/sessions"
import type { StrategyOption } from "@/lib/strategies"
import { createClient } from "@/lib/supabase/client"
import type { BacktestSessionExplorerRow } from "@/lib/supabase/database.types"

const PAGE_SIZE = 4

type SessionSortKey =
  | "name"
  | "strategy_name"
  | "pair"
  | "period_days"
  | "trade_count"
  | "pnl_percent"
type SessionSort = ExplorerSort<SessionSortKey>

const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
  style: "percent",
})

export default function SessionsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<BacktestSession[]>([])
  const [strategies, setStrategies] = useState<StrategyOption[]>([])
  const [filterOptions, setFilterOptions] = useState<Record<SessionFilterKey, string[]>>({
    pairs: [],
    strategies: [],
    tags: [],
  })
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState<SessionFilters>(emptySessionFilters)
  const [sort, setSort] = useState<SessionSort>(null)
  const [cardView, setCardView] = usePersistedCardView("backview:sessions:view")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const loadOptions = useCallback(async () => {
    const [strategiesResult, optionsResult] = await Promise.all([
      supabase.from("strategies").select("id, name").is("archived_at", null).order("name"),
      supabase.from("backtest_session_filter_options").select("kind, value").order("value"),
    ])

    if (!strategiesResult.error) setStrategies(strategiesResult.data)
    if (!optionsResult.error) {
      const next: Record<SessionFilterKey, string[]> = { pairs: [], strategies: [], tags: [] }
      for (const { kind, value } of optionsResult.data) {
        if (value && (kind === "pairs" || kind === "strategies" || kind === "tags")) {
          next[kind].push(value)
        }
      }
      setFilterOptions(next)
    }
  }, [supabase])

  const loadSessions = useCallback(async () => {
    setLoading(true)
    let request = supabase
      .from("backtest_session_explorer")
      .select("*", { count: "exact" })

    const search = deferredQuery.trim().replace(/[,%()]/g, " ")
    if (search) request = request.or(`name.ilike.*${search}*,strategy_name.ilike.*${search}*,pair.ilike.*${search}*`)
    if (filters.pairs.length) request = request.in("pair", filters.pairs)
    if (filters.strategies.length) request = request.in("strategy_name", filters.strategies)
    if (filters.tags.length) request = request.overlaps("tags", filters.tags)

    const orderKey = sort?.key ?? "created_at"
    request = request
      .order(orderKey, { ascending: sort?.direction === "asc" })
      .order("id", { ascending: sort?.direction === "asc" })

    const from = (page - 1) * PAGE_SIZE
    const result = await request.range(from, from + PAGE_SIZE - 1)
    if (result.error) {
      setLoadError(result.error.message)
      setSessions([])
      setTotal(0)
    } else {
      setLoadError("")
      setSessions(result.data.flatMap(normalizeSession))
      setTotal(result.count ?? 0)
    }
    setLoading(false)
  }, [deferredQuery, filters, page, sort, supabase])

  useEffect(() => {
    // Supabase resolves before these callbacks update explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    // Supabase resolves before these callbacks update explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions()
  }, [loadSessions])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeFilters(nextFilters: SessionFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  function toggleFilter(key: SessionFilterKey, value: string) {
    changeFilters({
      ...filters,
      [key]: filters[key].includes(value)
        ? filters[key].filter((item) => item !== value)
        : [...filters[key], value],
    })
  }

  function changeSort(key: SessionSortKey) {
    setSort((current) => nextExplorerSort(current, key))
    setPage(1)
  }

  function openSession(id: string) {
    router.push(`/sessions/${id}`)
  }

  function openSessionFromKeyboard(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.currentTarget !== event.target || !["Enter", " "].includes(event.key)) return
    event.preventDefault()
    openSession(id)
  }

  async function reload() {
    await Promise.all([loadSessions(), loadOptions()])
  }

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">SESSIONS</h1>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <DataSearch
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Search sessions"
          value={query}
        />
        <div className="flex items-center gap-1">
          <SessionFilterMenu filters={filters} onChange={changeFilters} options={filterOptions} />
          <CardViewToggle active={cardView} onClick={() => setCardView(!cardView)} />
        </div>
        <UploadSessionDialog onUploaded={reload} strategies={strategies} tagOptions={filterOptions.tags} />
      </div>

      <SessionFilterChips filters={filters} onChange={changeFilters} />

      <ScrollArea className="min-h-0 flex-1">
        {cardView ? (
          <SessionCards
            error={loadError}
            loading={loading}
            onOpen={openSession}
            onOpenFromKeyboard={openSessionFromKeyboard}
            onReload={reload}
            onStrategyOpen={(id) => router.push(`/strategies/${id}`)}
            onToggleFilter={toggleFilter}
            sessions={sessions}
            strategies={strategies}
            tagOptions={filterOptions.tags}
          />
        ) : (
          <SessionTable
            error={loadError}
            loading={loading}
            onOpen={openSession}
            onOpenFromKeyboard={openSessionFromKeyboard}
            onReload={reload}
            onSort={changeSort}
            onStrategyOpen={(id) => router.push(`/strategies/${id}`)}
            onToggleFilter={toggleFilter}
            sessions={sessions}
            sort={sort}
            strategies={strategies}
            tagOptions={filterOptions.tags}
          />
        )}
      </ScrollArea>

      <PaginationFooter
        label="sessions"
        onPageChange={setPage}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </section>
  )
}

function SessionTable({
  error,
  loading,
  onOpen,
  onOpenFromKeyboard,
  onReload,
  onSort,
  onStrategyOpen,
  onToggleFilter,
  sessions,
  sort,
  strategies,
  tagOptions,
}: {
  error: string
  loading: boolean
  onOpen: (id: string) => void
  onOpenFromKeyboard: (event: KeyboardEvent<HTMLElement>, id: string) => void
  onReload: () => void | Promise<void>
  onSort: (key: SessionSortKey) => void
  onStrategyOpen: (id: string) => void
  onToggleFilter: (key: SessionFilterKey, value: string) => void
  sessions: BacktestSession[]
  sort: SessionSort
  strategies: StrategyOption[]
  tagOptions: string[]
}) {
  return (
    <Table className="table-fixed">
      <colgroup>
        <col className="w-[20%]" />
        <col className="w-[16%]" />
        <col className="w-[10%]" />
        <col className="w-[18%]" />
        <col className="w-[10%]" />
        <col className="w-[9%]" />
        <col className="w-[12%]" />
        <col className="w-[4%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortHeader label="Name" onSort={onSort} sort={sort} sortKey="name" />
          <SortHeader label="Strategy" onSort={onSort} sort={sort} sortKey="strategy_name" />
          <SortHeader label="Pair" onSort={onSort} sort={sort} sortKey="pair" />
          <TableHead>Tags</TableHead>
          <SortHeader label="Period" onSort={onSort} sort={sort} sortKey="period_days" />
          <SortHeader label="Trades" onSort={onSort} sort={sort} sortKey="trade_count" />
          <SortHeader align="right" label="% P&amp;L" onSort={onSort} sort={sort} sortKey="pnl_percent" />
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <SessionTableSkeletons />
        ) : sessions.length ? (
          sessions.map((session) => (
            <TableRow
              className="cursor-pointer"
              key={session.id}
              onClick={() => onOpen(session.id)}
              onKeyDown={(event) => onOpenFromKeyboard(event, session.id)}
              tabIndex={0}
            >
              <TableCell>
                <FilterValue className="font-medium" onOpen={() => onOpen(session.id)} value={session.name} />
              </TableCell>
              <TableCell>
                <FilterValue
                  onFilter={() => onToggleFilter("strategies", session.strategy)}
                  onOpen={() => onStrategyOpen(session.strategyId)}
                  value={session.strategy}
                />
              </TableCell>
              <TableCell>
                <FilterValue onFilter={() => onToggleFilter("pairs", session.pair)} value={session.pair} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1 overflow-hidden">
                  {session.tags.map((tag) => (
                    <FilterTag key={tag} onClick={() => onToggleFilter("tags", tag)} tag={tag} />
                  ))}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{session.periodDays} days</TableCell>
              <TableCell className="tabular-nums">{session.trades}</TableCell>
              <TableCell className={session.pnlPercent < 0 ? "text-right text-xs text-[#ff5000]" : "text-right text-xs text-[#00c805]"}>
                {formatPercent(session.pnlPercent)}
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <SessionActions onChanged={onReload} session={session} strategies={strategies} tagOptions={tagOptions} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-32 text-center text-muted-foreground" colSpan={8}>{error || "No sessions yet."}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function SessionCards({
  error,
  loading,
  onOpen,
  onOpenFromKeyboard,
  onReload,
  onStrategyOpen,
  onToggleFilter,
  sessions,
  strategies,
  tagOptions,
}: Omit<Parameters<typeof SessionTable>[0], "onSort" | "sort">) {
  if (loading) return <SessionCardSkeletons />
  if (!sessions.length) {
    return <p className="flex min-h-full items-center justify-center text-sm text-muted-foreground">{error || "No sessions yet."}</p>
  }

  return (
    <div className="grid gap-3 px-px py-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {sessions.map((session) => (
        <Card
          className="group/session-card cursor-pointer [--card-spacing:--spacing(3)] !gap-1 !px-1.5"
          key={session.id}
          onClick={() => onOpen(session.id)}
          onKeyDown={(event) => onOpenFromKeyboard(event, session.id)}
          tabIndex={0}
        >
          <CardHeader>
            <CardTitle className="flex min-w-0 items-center gap-2">
              <span className="truncate">{session.name}</span>
              <span className="flex shrink-0 gap-1">
                {session.tags.map((tag) => (
                  <FilterTag key={tag} onClick={() => onToggleFilter("tags", tag)} tag={tag} />
                ))}
              </span>
            </CardTitle>
            <CardAction
              className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover/session-card:pointer-events-auto group-hover/session-card:opacity-100 group-focus-within/session-card:pointer-events-auto group-focus-within/session-card:opacity-100"
              onClick={(event) => event.stopPropagation()}
            >
              <SessionActions onChanged={onReload} session={session} strategies={strategies} tagOptions={tagOptions} />
            </CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <CardMetric
              label="Strategy"
              onFilter={() => onToggleFilter("strategies", session.strategy)}
              onOpen={() => onStrategyOpen(session.strategyId)}
              value={session.strategy}
            />
            <CardMetric label="Pair" onFilter={() => onToggleFilter("pairs", session.pair)} value={session.pair} />
            <CardMetric
              label="% P&amp;L"
              value={formatPercent(session.pnlPercent)}
              valueClassName={session.pnlPercent < 0 ? "text-xs text-[#ff5000]" : "text-xs text-[#00c805]"}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function SessionTableSkeletons() {
  return Array.from({ length: PAGE_SIZE }, (_, index) => (
    <TableRow key={index}>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-4 w-14" /></TableCell>
      <TableCell />
    </TableRow>
  ))
}

function SessionCardSkeletons() {
  return (
    <div className="grid gap-3 px-px py-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <Card className="[--card-spacing:--spacing(3)] !gap-3 !px-1.5" key={index}>
          <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-20" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function normalizeSession(row: BacktestSessionExplorerRow): BacktestSession[] {
  if (
    row.id === null || row.name === null || row.strategy_id === null ||
    row.strategy_name === null || row.pair === null || row.period_days === null ||
    row.trade_count === null || row.pnl_percent === null || row.created_at === null
  ) return []

  return [{
    accountSize: row.account_size,
    id: row.id,
    name: row.name,
    pair: row.pair,
    periodDays: row.period_days,
    pnlPercent: row.pnl_percent,
    reportFilename: row.report_filename,
    reportPath: row.report_path,
    strategy: row.strategy_name,
    strategyId: row.strategy_id,
    tags: row.tags ?? [],
    trades: row.trade_count,
    uploadDate: row.created_at,
  }]
}

function formatPercent(value: number) {
  return percentFormatter.format(value / 100)
}
