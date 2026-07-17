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
import {
  SessionFilterChips,
  SessionFilterMenu,
} from "@/components/sessions/session-filters"
import { CreateStrategyDialog } from "@/components/strategies/create-strategy-dialog"
import { StrategyActions } from "@/components/strategies/strategy-actions"
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
  type SessionFilterKey,
  type SessionFilters,
} from "@/lib/sessions"
import { createClient } from "@/lib/supabase/client"
import type {
  BacktestStrategyRow,
  StrategyExplorerRow,
} from "@/lib/supabase/database.types"

const PAGE_SIZE = 6

type StrategySortKey =
  | "name"
  | "session_count"
  | "trade_count"
  | "pnl_percent"
  | "win_rate"
  | "created_at"
type StrategySort = ExplorerSort<StrategySortKey>

interface StrategyItem {
  base: BacktestStrategyRow
  pairs: string[]
  sessionCount: number
  tradeCount: number
  pnlPercent: number
  winRate: number
}

const pnlPercentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
  signDisplay: "exceptZero",
  style: "percent",
})
const percentFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 1,
  style: "percent",
})

export default function StrategiesPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [strategies, setStrategies] = useState<StrategyItem[]>([])
  const [query, setQuery] = useState("")
  const deferredQuery = useDeferredValue(query)
  const [filters, setFilters] = useState<SessionFilters>(emptySessionFilters)
  const [filterOptions, setFilterOptions] = useState<Record<SessionFilterKey, string[]>>({
    pairs: [],
    strategies: [],
    tags: [],
  })
  const [sort, setSort] = useState<StrategySort>(null)
  const [cardView, setCardView] = usePersistedCardView("backview:strategies:view")
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadOptions = useCallback(async () => {
    const result = await supabase
      .from("strategy_explorer")
      .select("pairs, tags")
      .is("archived_at", null)

    if (!result.error) {
      setFilterOptions({
        pairs: unique(result.data.flatMap(({ pairs }) => pairs ?? [])),
        strategies: [],
        tags: unique(result.data.flatMap(({ tags }) => tags ?? [])),
      })
    }
  }, [supabase])

  const loadStrategies = useCallback(async () => {
    setLoading(true)
    let request = supabase
      .from("strategy_explorer")
      .select("*", { count: "exact" })
      .is("archived_at", null)

    const search = deferredQuery.trim().replace(/[,%()]/g, " ")
    if (search) request = request.or(`name.ilike.*${search}*,description.ilike.*${search}*`)
    if (filters.pairs.length) request = request.overlaps("pairs", filters.pairs)
    if (filters.tags.length) request = request.overlaps("tags", filters.tags)

    const orderKey = sort?.key ?? "created_at"
    request = request
      .order(orderKey, { ascending: sort?.direction === "asc" })
      .order("id", { ascending: sort?.direction === "asc" })

    const from = (page - 1) * PAGE_SIZE
    const result = await request.range(from, from + PAGE_SIZE - 1)
    if (result.error) {
      setError(result.error.message)
      setStrategies([])
      setTotal(0)
    } else {
      setError("")
      setStrategies(result.data.flatMap(normalizeStrategy))
      setTotal(result.count ?? 0)
    }
    setLoading(false)
  }, [deferredQuery, filters.pairs, filters.tags, page, sort, supabase])

  useEffect(() => {
    // Supabase resolves before these callbacks update explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadOptions()
  }, [loadOptions])

  useEffect(() => {
    // Supabase resolves before these callbacks update explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStrategies()
  }, [loadStrategies])

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function changeFilters(nextFilters: SessionFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  function toggleFilter(key: "pairs" | "tags", value: string) {
    changeFilters({
      ...filters,
      [key]: filters[key].includes(value)
        ? filters[key].filter((item) => item !== value)
        : [...filters[key], value],
    })
  }

  function changeSort(key: StrategySortKey) {
    setSort((current) => nextExplorerSort(current, key))
    setPage(1)
  }

  function openStrategy(id: string) {
    router.push(`/strategies/${id}`)
  }

  function openStrategyFromKeyboard(event: KeyboardEvent<HTMLElement>, id: string) {
    if (event.currentTarget !== event.target || !["Enter", " "].includes(event.key)) return
    event.preventDefault()
    openStrategy(id)
  }

  async function reload() {
    await Promise.all([loadStrategies(), loadOptions()])
  }

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">STRATEGIES</h1>
      </header>

      <div className="flex shrink-0 items-center gap-2">
        <DataSearch
          onChange={(value) => {
            setQuery(value)
            setPage(1)
          }}
          placeholder="Search strategies"
          value={query}
        />
        <div className="flex items-center gap-1">
          <SessionFilterMenu
            filters={filters}
            groups={["pairs", "tags"]}
            onChange={changeFilters}
            options={filterOptions}
          />
          <CardViewToggle active={cardView} onClick={() => setCardView(!cardView)} />
        </div>
        <CreateStrategyDialog onCreated={reload} tagOptions={filterOptions.tags} />
      </div>

      <SessionFilterChips filters={filters} onChange={changeFilters} />

      <ScrollArea className="min-h-0 flex-1">
        {cardView ? (
          <StrategyCards
            error={error}
            loading={loading}
            onOpen={openStrategy}
            onOpenFromKeyboard={openStrategyFromKeyboard}
            onReload={reload}
            onToggleFilter={toggleFilter}
            strategies={strategies}
            tagOptions={filterOptions.tags}
          />
        ) : (
          <StrategyTable
            error={error}
            loading={loading}
            onOpen={openStrategy}
            onOpenFromKeyboard={openStrategyFromKeyboard}
            onReload={reload}
            onSort={changeSort}
            onToggleFilter={toggleFilter}
            sort={sort}
            strategies={strategies}
            tagOptions={filterOptions.tags}
          />
        )}
      </ScrollArea>

      <PaginationFooter
        label="strategies"
        onPageChange={setPage}
        page={page}
        pageCount={pageCount}
        total={total}
      />
    </section>
  )
}

function StrategyTable({
  error,
  loading,
  onOpen,
  onOpenFromKeyboard,
  onReload,
  onSort,
  onToggleFilter,
  sort,
  strategies,
  tagOptions,
}: {
  error: string
  loading: boolean
  onOpen: (id: string) => void
  onOpenFromKeyboard: (event: KeyboardEvent<HTMLElement>, id: string) => void
  onReload: () => void | Promise<void>
  onSort: (key: StrategySortKey) => void
  onToggleFilter: (key: "pairs" | "tags", value: string) => void
  sort: StrategySort
  strategies: StrategyItem[]
  tagOptions: string[]
}) {
  return (
    <Table className="table-fixed">
      <colgroup>
        <col className="w-[18%]" />
        <col className="w-[18%]" />
        <col className="w-[15%]" />
        <col className="w-[10%]" />
        <col className="w-[10%]" />
        <col className="w-[12%]" />
        <col className="w-[12%]" />
        <col className="w-[5%]" />
      </colgroup>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <SortHeader label="Name" onSort={onSort} sort={sort} sortKey="name" />
          <TableHead>Tags</TableHead>
          <TableHead>Pairs</TableHead>
          <SortHeader label="Sessions" onSort={onSort} sort={sort} sortKey="session_count" />
          <SortHeader label="Trades" onSort={onSort} sort={sort} sortKey="trade_count" />
          <SortHeader align="right" label="% P&amp;L" onSort={onSort} sort={sort} sortKey="pnl_percent" />
          <SortHeader align="right" label="Win rate" onSort={onSort} sort={sort} sortKey="win_rate" />
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          <StrategySkeletons />
        ) : strategies.length ? (
          strategies.map((strategy) => (
            <TableRow
              className="cursor-pointer"
              key={strategy.base.id}
              onClick={() => onOpen(strategy.base.id)}
              onKeyDown={(event) => onOpenFromKeyboard(event, strategy.base.id)}
              tabIndex={0}
            >
              <TableCell>
                <FilterValue className="font-medium" onOpen={() => onOpen(strategy.base.id)} value={strategy.base.name} />
              </TableCell>
              <TableCell>
                <div className="flex gap-1 overflow-hidden">
                  {strategy.base.tags.map((tag) => (
                    <FilterTag key={tag} onClick={() => onToggleFilter("tags", tag)} tag={tag} />
                  ))}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex gap-1 overflow-hidden">
                  {strategy.pairs.map((pair) => (
                    <FilterValue key={pair} onFilter={() => onToggleFilter("pairs", pair)} value={pair} />
                  ))}
                </div>
              </TableCell>
              <TableCell className="tabular-nums">{strategy.sessionCount}</TableCell>
              <TableCell className="tabular-nums">{strategy.tradeCount}</TableCell>
              <TableCell className={strategy.pnlPercent < 0 ? "text-right text-xs text-[#ff5000]" : "text-right text-xs text-[#00c805]"}>
                {pnlPercentFormatter.format(strategy.pnlPercent / 100)}
              </TableCell>
              <TableCell className="text-right tabular-nums">{percentFormatter.format(strategy.winRate)}</TableCell>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <StrategyActions onChanged={onReload} strategy={strategy.base} tagOptions={tagOptions} />
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell className="h-32 text-center text-muted-foreground" colSpan={8}>{error || "No strategies yet."}</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}

function StrategyCards({
  error,
  loading,
  onOpen,
  onOpenFromKeyboard,
  onReload,
  onToggleFilter,
  strategies,
  tagOptions,
}: Omit<Parameters<typeof StrategyTable>[0], "onSort" | "sort">) {
  if (loading) return <StrategyCardSkeletons />
  if (!strategies.length) {
    return <p className="flex min-h-full items-center justify-center text-sm text-muted-foreground">{error || "No strategies yet."}</p>
  }

  return (
    <div className="grid gap-3 px-px py-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {strategies.map((strategy) => (
        <Card
          className="group/strategy-card cursor-pointer [--card-spacing:--spacing(3)] !gap-1 !px-1.5"
          key={strategy.base.id}
          onClick={() => onOpen(strategy.base.id)}
          onKeyDown={(event) => onOpenFromKeyboard(event, strategy.base.id)}
          tabIndex={0}
        >
          <CardHeader>
            <CardTitle className="flex min-w-0 items-center gap-2">
              <span className="truncate">{strategy.base.name}</span>
              <span className="flex shrink-0 gap-1">
                {strategy.base.tags.map((tag) => (
                  <FilterTag key={tag} onClick={() => onToggleFilter("tags", tag)} tag={tag} />
                ))}
              </span>
            </CardTitle>
            <CardAction
              className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover/strategy-card:pointer-events-auto group-hover/strategy-card:opacity-100 group-focus-within/strategy-card:pointer-events-auto group-focus-within/strategy-card:opacity-100"
              onClick={(event) => event.stopPropagation()}
            >
              <StrategyActions onChanged={onReload} strategy={strategy.base} tagOptions={tagOptions} />
            </CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="text-xs text-muted-foreground">Pairs</div>
              <div className="mt-0.5 flex gap-1 overflow-hidden font-medium">
                {strategy.pairs.length ? strategy.pairs.map((pair) => (
                  <FilterValue key={pair} onFilter={() => onToggleFilter("pairs", pair)} value={pair} />
                )) : "—"}
              </div>
            </div>
            <CardMetric label="Sessions" value={String(strategy.sessionCount)} />
            <CardMetric
              label="% P&amp;L"
              value={pnlPercentFormatter.format(strategy.pnlPercent / 100)}
              valueClassName={strategy.pnlPercent < 0 ? "text-xs text-[#ff5000]" : "text-xs text-[#00c805]"}
            />
            <CardMetric label="Win rate" value={percentFormatter.format(strategy.winRate)} />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function StrategySkeletons() {
  return Array.from({ length: PAGE_SIZE }, (_, index) => (
    <TableRow key={index}>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-4 w-12" /></TableCell>
      <TableCell />
    </TableRow>
  ))
}

function StrategyCardSkeletons() {
  return (
    <div className="grid gap-3 px-px py-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: PAGE_SIZE }, (_, index) => (
        <Card className="[--card-spacing:--spacing(3)] !gap-3 !px-1.5" key={index}>
          <CardHeader><Skeleton className="h-5 w-28" /></CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (__, metric) => <Skeleton className="h-9 w-full" key={metric} />)}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function normalizeStrategy(row: StrategyExplorerRow): StrategyItem[] {
  if (row.id === null || row.user_id === null || row.name === null || row.created_at === null) return []

  return [{
    base: {
      archived_at: row.archived_at,
      created_at: row.created_at,
      description: row.description,
      id: row.id,
      name: row.name,
      tags: row.tags ?? [],
      user_id: row.user_id,
    },
    pairs: row.pairs ?? [],
    sessionCount: Number(row.session_count ?? 0),
    tradeCount: Number(row.trade_count ?? 0),
    pnlPercent: Number(row.pnl_percent ?? 0),
    winRate: Number(row.win_rate ?? 0),
  }]
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}
