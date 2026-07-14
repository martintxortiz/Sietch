"use client"

import {
  IconChevronLeft,
  IconChevronRight,
  IconLayoutGridFilled,
  IconSearch,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"

import { SessionActions } from "@/components/sessions/session-actions"
import {
  SessionFilterChips,
  SessionFilterMenu,
} from "@/components/sessions/session-filters"
import { SessionSortHeader } from "@/components/sessions/session-sort-header"
import { UploadSessionDialog } from "@/components/sessions/upload-session-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import {
  emptySessionFilters,
  filterSessions,
  getSessionFilterOptions,
  getSessionTagColor,
  nextSessionSort,
  sortSessions,
  type BacktestSession,
  type SessionFilterKey,
  type SessionFilters,
  type SessionSort,
  type SessionSortKey,
} from "@/lib/sessions"
import { createClient } from "@/lib/supabase/client"
import type { StrategyOption } from "@/lib/strategies"

const PAGE_SIZE = 8
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default function SessionsPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<BacktestSession[]>([])
  const [strategies, setStrategies] = useState<StrategyOption[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")
  const [query, setQuery] = useState("")
  const [filters, setFilters] =
    useState<SessionFilters>(emptySessionFilters)
  const [sort, setSort] = useState<SessionSort>(null)
  const [cardView, setCardView] = useState(false)
  const [page, setPage] = useState(1)

  const loadSessions = useCallback(async () => {
    const [sessionsResult, strategiesResult] = await Promise.all([
      supabase
        .from("backtest_sessions")
        .select(
          "id, name, strategy_id, pair, tags, period_days, trade_count, pnl_percent, created_at, account_size, report_filename, report_path, strategy:strategies(name)",
        )
        .is("archived_at", null)
        .order("created_at", { ascending: false }),
      supabase.from("strategies").select("id, name").order("name"),
    ])

    if (sessionsResult.error || strategiesResult.error) {
      setLoadError(
        sessionsResult.error?.message ?? strategiesResult.error?.message ?? "Could not load sessions.",
      )
    } else {
      setLoadError("")
      setSessions(
        sessionsResult.data.map((session) => ({
          id: session.id,
          name: session.name,
          strategyId: session.strategy_id,
          strategy: session.strategy.name,
          pair: session.pair,
          periodDays: session.period_days,
          uploadDate: session.created_at,
          tags: session.tags,
          trades: session.trade_count,
          pnlPercent: session.pnl_percent,
          accountSize: session.account_size,
          reportFilename: session.report_filename,
          reportPath: session.report_path,
        })),
      )
      setStrategies(strategiesResult.data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Supabase resolves before this callback updates local explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSessions()
  }, [loadSessions])

  const filterOptions = useMemo(
    () => getSessionFilterOptions(sessions),
    [sessions],
  )
  const filtered = useMemo(
    () => sortSessions(filterSessions(sessions, query, filters), sort),
    [sessions, query, filters, sort]
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleSessions = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  )

  function changeFilters(nextFilters: SessionFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  function changeSort(key: SessionSortKey) {
    setSort((current) => nextSessionSort(current, key))
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

  function openSession(id: string) {
    router.push(`/sessions/${id}`)
  }

  function openSessionFromKeyboard(
    event: KeyboardEvent<HTMLElement>,
    id: string,
  ) {
    if (
      event.currentTarget !== event.target ||
      (event.key !== "Enter" && event.key !== " ")
    ) {
      return
    }

    event.preventDefault()
    openSession(id)
  }

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">SESSIONS</h1>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <InputGroup className="h-10 max-w-80 rounded-full px-1">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            aria-label="Search sessions"
            placeholder="Search sessions"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            className="pr-3"
          />
        </InputGroup>
        <div className="flex items-center gap-1">
          <SessionFilterMenu
            filters={filters}
            options={filterOptions}
            onChange={changeFilters}
          />
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Toggle card view"
            aria-pressed={cardView}
            className={cn(
              "size-10",
              cardView
                ? "bg-muted hover:bg-muted/80"
                : "hover:bg-muted/50"
            )}
            onClick={() => setCardView((current) => !current)}
          >
            <IconLayoutGridFilled data-icon="inline-start" />
          </Button>
        </div>
        <UploadSessionDialog
          strategies={strategies}
          tagOptions={filterOptions.tags}
          onUploaded={loadSessions}
        />
      </div>

      <SessionFilterChips filters={filters} onChange={changeFilters} />

      <ScrollArea className="min-h-0 flex-1">
        {cardView ? (
          <div className="flex min-h-full flex-col px-px py-4">
            {loading ? (
              <SessionCardSkeletons />
            ) : visibleSessions.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {visibleSessions.map((session) => (
                  <Card
                    key={session.id}
                    className="group/session-card cursor-pointer [--card-spacing:--spacing(3)] !gap-1 !px-1.5"
                    onClick={() => openSession(session.id)}
                    onKeyDown={(event) =>
                      openSessionFromKeyboard(event, session.id)
                    }
                    tabIndex={0}
                  >
                    <CardHeader>
                      <CardTitle className="flex min-w-0 items-center gap-2">
                        <span className="truncate">{session.name}</span>
                        <span className="flex shrink-0 gap-1">
                          {session.tags.map((tag) => (
                            <SessionTag
                              key={tag}
                              onClick={() => toggleFilter("tags", tag)}
                              tag={tag}
                            />
                          ))}
                        </span>
                      </CardTitle>
                      <CardAction
                        className="pointer-events-none opacity-0 transition-opacity duration-150 group-hover/session-card:pointer-events-auto group-hover/session-card:opacity-100 group-focus-within/session-card:pointer-events-auto group-focus-within/session-card:opacity-100"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <SessionActions
                          session={session}
                          strategies={strategies}
                          tagOptions={filterOptions.tags}
                          onChanged={loadSessions}
                        />
                      </CardAction>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-3">
                      <SessionMetric
                        label="Strategy"
                        onClick={() =>
                          toggleFilter("strategies", session.strategy)
                        }
                        value={session.strategy}
                      />
                      <SessionMetric
                        label="Pair"
                        onClick={() => toggleFilter("pairs", session.pair)}
                        value={session.pair}
                      />
                      <SessionMetric
                        label="% P&L"
                        valueClassName={
                          session.pnlPercent < 0
                            ? "text-xs text-[#ff5000]"
                            : "text-xs text-[#00c805]"
                        }
                        value={formatPercent(session.pnlPercent)}
                      />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="m-auto text-sm text-muted-foreground">
                {loadError || "No sessions yet."}
              </p>
            )}
          </div>
        ) : (
          <Table className="min-w-180 table-fixed">
            <colgroup>
              <col className="w-[24%]" />
              <col className="w-[22%]" />
              <col className="w-[15%]" />
              <col className="w-[25%]" />
              <col className="w-[10%]" />
              <col className="w-[4%]" />
            </colgroup>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <SessionSortHeader
                  label="Name"
                  sortKey="name"
                  sort={sort}
                  onSort={changeSort}
                />
                <SessionSortHeader
                  label="Strategy"
                  sortKey="strategy"
                  sort={sort}
                  onSort={changeSort}
                />
                <SessionSortHeader
                  label="Pair"
                  sortKey="pair"
                  sort={sort}
                  onSort={changeSort}
                />
                <TableHead>Tags</TableHead>
                <SessionSortHeader
                  label="% P&L"
                  sortKey="pnlPercent"
                  sort={sort}
                  align="right"
                  onSort={changeSort}
                />
                <TableHead aria-label="Actions" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <SessionTableSkeletons />
              ) : visibleSessions.length ? (
                visibleSessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="cursor-pointer"
                    onClick={() => openSession(session.id)}
                    onKeyDown={(event) =>
                      openSessionFromKeyboard(event, session.id)
                    }
                    tabIndex={0}
                  >
                    <TableCell className="font-medium">
                      <div className="truncate">{session.name}</div>
                    </TableCell>
                    <TableCell>
                      <SessionFilterValue
                        onClick={() =>
                          toggleFilter("strategies", session.strategy)
                        }
                        value={session.strategy}
                      />
                    </TableCell>
                    <TableCell>
                      <SessionFilterValue
                        onClick={() => toggleFilter("pairs", session.pair)}
                        value={session.pair}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 overflow-hidden">
                        {session.tags.map((tag) => (
                          <SessionTag
                            key={tag}
                            onClick={() => toggleFilter("tags", tag)}
                            tag={tag}
                          />
                        ))}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-medium tabular-nums",
                        session.pnlPercent < 0
                          ? "text-xs text-[#ff5000]"
                          : "text-xs text-[#00c805]",
                      )}
                    >
                      {formatPercent(session.pnlPercent)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div onClick={(event) => event.stopPropagation()}>
                        <SessionActions
                          session={session}
                          strategies={strategies}
                          tagOptions={filterOptions.tags}
                          onChanged={loadSessions}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="h-32 text-center text-muted-foreground"
                  >
                    {loadError || "No sessions yet."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        {!cardView && <ScrollBar orientation="horizontal" />}
      </ScrollArea>

      <footer className="flex shrink-0 translate-y-2 items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pageCount} · {filtered.length} sessions
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={"!rounded-full"}
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
          >
            <IconChevronLeft data-icon="inline-start" />
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={"!rounded-full"}
            disabled={page === pageCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
            <IconChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </footer>
    </section>
  )
}

function SessionMetric({
  label,
  onClick,
  value,
  valueClassName,
}: {
  label: string
  onClick?: () => void
  value: string
  valueClassName?: string
}) {
  const content = (
    <>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-0.5 truncate font-medium tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        className="-mx-1 min-w-0 rounded-sm px-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onClick={(event) => {
          event.stopPropagation()
          onClick()
        }}
        type="button"
      >
        {content}
      </button>
    )
  }

  return (
    <div className="min-w-0">
      {content}
    </div>
  )
}

function SessionFilterValue({
  onClick,
  value,
}: {
  onClick: () => void
  value: string
}) {
  return (
    <button
      className="-mx-1 max-w-full truncate rounded-sm px-1 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      type="button"
    >
      {value}
    </button>
  )
}

function SessionTag({ tag, onClick }: { tag: string; onClick: () => void }) {
  return (
    <button
      className="rounded-full border border-transparent transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      type="button"
    >
      <Badge color={getSessionTagColor(tag)} size="sm" variant="solid">
        {tag}
      </Badge>
    </button>
  )
}

function formatPercent(value: number) {
  return percentFormatter.format(value / 100)
}

function SessionTableSkeletons() {
  return Array.from({ length: 6 }, (_, index) => (
    <TableRow key={index}>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-5 w-28 rounded-full" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-4 w-14" /></TableCell>
      <TableCell><Skeleton className="ml-auto size-6 rounded-full" /></TableCell>
    </TableRow>
  ))
}

function SessionCardSkeletons() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className="[--card-spacing:--spacing(3)] !gap-3 !px-1.5">
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
