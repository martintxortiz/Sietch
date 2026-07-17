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
  DataSearch,
  FilterTag,
  FilterValue,
  nextExplorerSort,
  PaginationFooter,
  SortHeader,
  type ExplorerSort,
} from "@/components/data-explorer"
import {
  SessionFilterChips,
  SessionFilterMenu,
} from "@/components/sessions/session-filters"
import { TradeActions } from "@/components/trades/trade-actions"
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
  type SessionFilterKey,
  type SessionFilters,
} from "@/lib/sessions"
import { createClient } from "@/lib/supabase/client"
import type { BacktestTradeExplorerRow } from "@/lib/supabase/database.types"

const PAGE_SIZE = 11

type TradeSortKey =
  | "trade_number"
  | "session_name"
  | "strategy_name"
  | "pair"
  | "side"
  | "entry_at"
  | "net_pnl"
type TradeSort = ExplorerSort<TradeSortKey>

interface TradeItem {
  id: number
  sessionId: string
  tradeNumber: number
  sessionName: string
  strategyId: string
  strategyName: string
  pair: string
  side: string
  entryAt: string
  exitAt: string
  entrySignal: string
  exitSignal: string
  netPnl: number
  tags: string[]
}

interface TradeSessionOption {
  id: string
  name: string
  pair: string
  strategyId: string
  strategy: string
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
})
const pnlFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  currencyDisplay: "narrowSymbol",
  signDisplay: "exceptZero",
  style: "currency",
})

export default function TradesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [trades, setTrades] = useState<TradeItem[]>([])
  const [sessionOptions, setSessionOptions] = useState<TradeSessionOption[]>([])
  const [tagOptions, setTagOptions] = useState<string[]>([])
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState<SessionFilters>(emptySessionFilters)
  const [sessionIds, setSessionIds] = useState<string[]>([])
  const [sort, setSort] = useState<TradeSort>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const loadOptions = useCallback(async () => {
    const [sessionsResult, tagsResult] = await Promise.all([
      supabase
        .from("backtest_sessions")
        .select("id, name, pair, strategy:strategies(id, name)")
        .is("archived_at", null)
        .order("name"),
      supabase.from("backtest_trade_tag_options").select("tag").order("tag"),
    ])

    if (!sessionsResult.error) {
      setSessionOptions(sessionsResult.data.map((session) => ({
        id: session.id,
        name: session.name,
        pair: session.pair,
        strategyId: session.strategy.id,
        strategy: session.strategy.name,
      })))
    }
    if (!tagsResult.error) {
      setTagOptions(tagsResult.data.flatMap(({ tag }) => tag ? [tag] : []))
    }
  }, [supabase])

  const loadTrades = useCallback(async () => {
    setLoading(true)
    let request = supabase
      .from("backtest_trade_explorer")
      .select("*", { count: "exact" })

    const search = deferredQuery.trim().replace(/[,%()]/g, " ")
    if (search) {
      const textSearch = ["session_name", "strategy_name", "pair", "side", "entry_signal", "exit_signal"]
        .map((field) => `${field}.ilike.*${search}*`)
      const tradeNumber = Number(search)
      request = request.or([
        ...textSearch,
        ...(Number.isInteger(tradeNumber) ? [`trade_number.eq.${tradeNumber}`] : []),
      ].join(","))
    }
    if (filters.pairs.length) request = request.in("pair", filters.pairs)
    if (filters.strategies.length) request = request.in("strategy_name", filters.strategies)
    if (filters.tags.length) request = request.overlaps("tags", filters.tags)
    if (sessionIds.length) request = request.in("session_id", sessionIds)

    const orderKey = sort?.key ?? "entry_at"
    request = request
      .order(orderKey, { ascending: sort?.direction === "asc" })
      .order("id", { ascending: sort?.direction === "asc" })

    const from = (page - 1) * PAGE_SIZE
    const result = await request.range(from, from + PAGE_SIZE - 1)
    if (result.error) {
      setLoadError(result.error.message)
      setTrades([])
      setTotal(0)
    } else {
      setLoadError("")
      setTrades(result.data.flatMap(normalizeTrade))
      setTotal(result.count ?? 0)
    }
    setLoading(false)
  }, [deferredQuery, filters, page, sessionIds, sort, supabase])

  useEffect(() => {
    // Supabase resolves before these callbacks update explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    // Supabase resolves before these callbacks update explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTrades()
  }, [loadTrades])

  const filterOptions = useMemo(() => ({
    pairs: unique(sessionOptions.map(({ pair }) => pair)),
    strategies: unique(sessionOptions.map(({ strategy }) => strategy)),
    tags: tagOptions,
  }), [sessionOptions, tagOptions])
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

  function toggleSessionFilter(id: string) {
    setSessionIds((current) => current.includes(id)
      ? current.filter((sessionId) => sessionId !== id)
      : [...current, id])
    setPage(1)
  }

  function toggleSort(key: TradeSortKey) {
    setSort((current) => nextExplorerSort(current, key))
    setPage(1)
  }

  function openTrade(id: number) {
    router.push(`/trades/${id}`)
  }

  function openTradeFromKeyboard(event: KeyboardEvent<HTMLElement>, id: number) {
    if (event.currentTarget !== event.target || !["Enter", " "].includes(event.key)) return
    event.preventDefault()
    openTrade(id)
  }

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">TRADES</h1>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <DataSearch
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Search trades"
          value={query}
        />
        <SessionFilterMenu
          filters={filters}
          onChange={changeFilters}
          onSessionIdsChange={(ids) => {
            setSessionIds(ids)
            setPage(1)
          }}
          options={filterOptions}
          sessionIds={sessionIds}
          sessionOptions={sessionOptions.map(({ id, name }) => ({ id, name }))}
        />
      </div>

      <SessionFilterChips
        filters={filters}
        onChange={changeFilters}
        onSessionIdsChange={(ids) => {
          setSessionIds(ids)
          setPage(1)
        }}
        sessionIds={sessionIds}
        sessionOptions={sessionOptions.map(({ id, name }) => ({ id, name }))}
      />

      <ScrollArea className="min-h-0 flex-1">
        <TradeTable
          loading={loading}
          loadError={loadError}
          onOpen={openTrade}
          onOpenFromKeyboard={openTradeFromKeyboard}
          onReload={loadTrades}
          onSessionOpen={(id) => router.push(`/sessions/${id}`)}
          onSessionToggle={toggleSessionFilter}
          onSort={toggleSort}
          onStrategyOpen={(id) => router.push(`/strategies/${id}`)}
          onToggleFilter={toggleFilter}
          sort={sort}
          tagOptions={tagOptions}
          trades={trades}
        />
      </ScrollArea>

      <PaginationFooter
        label="trades"
        onPageChange={setPage}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </section>
  )
}

function TradeTable({
  loading,
  loadError,
  onOpen,
  onOpenFromKeyboard,
  onReload,
  onSessionOpen,
  onSessionToggle,
  onSort,
  onStrategyOpen,
  onToggleFilter,
  sort,
  tagOptions,
  trades,
}: {
  loading: boolean
  loadError: string
  onOpen: (id: number) => void
  onOpenFromKeyboard: (event: KeyboardEvent<HTMLElement>, id: number) => void
  onReload: () => void | Promise<void>
  onSessionOpen: (id: string) => void
  onSessionToggle: (id: string) => void
  onSort: (key: TradeSortKey) => void
  onStrategyOpen: (id: string) => void
  onToggleFilter: (key: SessionFilterKey, value: string) => void
  sort: TradeSort
  tagOptions: string[]
  trades: TradeItem[]
}) {
  return (
    <Table className="table-fixed">
      <colgroup>
        <col className="w-[7%]" />
        <col className="w-[17%]" />
        <col className="w-[14%]" />
        <col className="w-[9%]" />
        <col className="w-[17%]" />
        <col className="w-[7%]" />
        <col className="w-[15%]" />
        <col className="w-[10%]" />
        <col className="w-[4%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortHeader label="Trade" onSort={onSort} sort={sort} sortKey="trade_number" />
          <SortHeader label="Session" onSort={onSort} sort={sort} sortKey="session_name" />
          <SortHeader label="Strategy" onSort={onSort} sort={sort} sortKey="strategy_name" />
          <SortHeader label="Pair" onSort={onSort} sort={sort} sortKey="pair" />
          <TableHead>Tags</TableHead>
          <SortHeader label="Side" onSort={onSort} sort={sort} sortKey="side" />
          <SortHeader label="Opened" onSort={onSort} sort={sort} sortKey="entry_at" />
          <SortHeader align="right" label="P&amp;L" onSort={onSort} sort={sort} sortKey="net_pnl" />
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <TradeSkeletons />
        ) : trades.length ? (
          trades.map((trade) => (
            <TableRow
              className="cursor-pointer"
              key={trade.id}
              onClick={() => onOpen(trade.id)}
              onKeyDown={(event) => onOpenFromKeyboard(event, trade.id)}
              tabIndex={0}
            >
              <TableCell>
                <FilterValue className="font-medium" onOpen={() => onOpen(trade.id)} value={`#${trade.tradeNumber}`} />
              </TableCell>
              <TableCell>
                <FilterValue
                  className="font-medium"
                  onFilter={() => onSessionToggle(trade.sessionId)}
                  onOpen={() => onSessionOpen(trade.sessionId)}
                  value={trade.sessionName}
                />
              </TableCell>
              <TableCell>
                <FilterValue
                  onFilter={() => onToggleFilter("strategies", trade.strategyName)}
                  onOpen={() => onStrategyOpen(trade.strategyId)}
                  value={trade.strategyName}
                />
              </TableCell>
              <TableCell>
                <FilterValue onFilter={() => onToggleFilter("pairs", trade.pair)} value={trade.pair} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1 overflow-hidden">
                  {trade.tags.map((tag) => (
                    <FilterTag key={tag} onClick={() => onToggleFilter("tags", tag)} tag={tag} />
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-xs font-medium uppercase">{trade.side}</TableCell>
              <TableCell className="truncate text-muted-foreground">
                {dateFormatter.format(new Date(trade.entryAt))}
              </TableCell>
              <TableCell className={trade.netPnl < 0 ? "text-right text-xs text-[#ff5000]" : "text-right text-xs text-[#00c805]"}>
                {pnlFormatter.format(trade.netPnl)}
              </TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <TradeActions onChanged={onReload} tagOptions={tagOptions} trade={tradeActionValue(trade)} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-32 text-center text-muted-foreground" colSpan={9}>
              {loadError || "No trades found."}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function TradeSkeletons() {
  return Array.from({ length: PAGE_SIZE }, (_, index) => (
    <TableRow key={index}>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-14" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
      <TableCell />
    </TableRow>
  ))
}

function normalizeTrade(row: BacktestTradeExplorerRow): TradeItem[] {
  if (
    row.id === null || row.session_id === null || row.trade_number === null ||
    row.session_name === null || row.strategy_id === null || row.strategy_name === null || row.pair === null ||
    row.side === null || row.entry_at === null || row.exit_at === null ||
    row.entry_signal === null || row.exit_signal === null || row.net_pnl === null
  ) return []

  return [{
    id: row.id,
    sessionId: row.session_id,
    tradeNumber: row.trade_number,
    sessionName: row.session_name,
    strategyId: row.strategy_id,
    strategyName: row.strategy_name,
    pair: row.pair,
    side: row.side,
    entryAt: row.entry_at,
    exitAt: row.exit_at,
    entrySignal: row.entry_signal,
    exitSignal: row.exit_signal,
    netPnl: row.net_pnl,
    tags: row.tags ?? [],
  }]
}

function tradeActionValue(trade: TradeItem) {
  return {
    id: trade.id,
    entry_signal: trade.entrySignal,
    exit_signal: trade.exitSignal,
    tags: trade.tags,
  }
}

function unique(values: string[]) {
  return [...new Set(values)]
}
