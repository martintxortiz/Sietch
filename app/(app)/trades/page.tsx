"use client"

import { IconChevronLeft, IconChevronRight, IconSearch } from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import {
  SessionFilterChips,
  SessionFilterMenu,
} from "@/components/sessions/session-filters"
import { TradeSessionSelector } from "@/components/trades/trade-session-selector"
import { Button } from "@/components/ui/button"
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
import {
  emptySessionFilters,
  type SessionFilters,
} from "@/lib/sessions"
import { createClient } from "@/lib/supabase/client"
import type { BacktestTradeRow } from "@/lib/supabase/database.types"

const PAGE_SIZE = 15
const LOAD_SIZE = 1000
const pnlFormatter = new Intl.NumberFormat("en-US", {
  currency: "USD",
  signDisplay: "exceptZero",
  style: "currency",
})
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
})

interface TradeSession {
  id: string
  name: string
  pair: string
  strategy: string
  tags: string[]
}

interface TradeItem extends BacktestTradeRow {
  session: TradeSession
}

export default function TradesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [sessions, setSessions] = useState<TradeSession[]>([])
  const [trades, setTrades] = useState<TradeItem[]>([])
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState<SessionFilters>(emptySessionFilters)
  const [sessionId, setSessionId] = useState("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState("")

  const loadTrades = useCallback(async () => {
    setLoading(true)
    const sessionsResult = await supabase
      .from("backtest_sessions")
      .select("id, name, pair, tags, strategy:strategies(name)")
      .is("archived_at", null)
      .order("created_at", { ascending: false })

    if (sessionsResult.error) {
      setLoadError(sessionsResult.error.message)
      setLoading(false)
      return
    }

    const nextSessions = sessionsResult.data.map((session) => ({
      id: session.id,
      name: session.name,
      pair: session.pair,
      strategy: session.strategy.name,
      tags: session.tags,
    }))
    const nextTrades: BacktestTradeRow[] = []

    // ponytail: keep the complete client explorer until server pagination is measurably needed.
    for (let from = 0; ; from += LOAD_SIZE) {
      const tradesResult = await supabase
        .from("backtest_trades")
        .select("*")
        .order("entry_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + LOAD_SIZE - 1)

      if (tradesResult.error) {
        setLoadError(tradesResult.error.message)
        setLoading(false)
        return
      }

      nextTrades.push(...tradesResult.data)
      if (tradesResult.data.length < LOAD_SIZE) break
    }

    const sessionById = new Map(nextSessions.map((session) => [session.id, session]))
    setSessions(nextSessions)
    setTrades(
      nextTrades.flatMap((trade) => {
        const session = sessionById.get(trade.session_id)
        return session ? [{ ...trade, session }] : []
      }),
    )
    setLoadError("")
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Supabase resolves before this callback updates local explorer state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTrades()
  }, [loadTrades])

  const filterOptions = useMemo(
    () => ({
      pairs: unique(sessions.map((session) => session.pair)),
      strategies: unique(sessions.map((session) => session.strategy)),
      tags: unique(sessions.flatMap((session) => session.tags)),
    }),
    [sessions],
  )
  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase()

    return trades.filter((trade) =>
      (sessionId === "all" || trade.session_id === sessionId) &&
      (!search ||
        `${trade.trade_number} ${trade.session.name} ${trade.session.strategy} ${trade.session.pair} ${trade.side} ${trade.entry_signal} ${trade.exit_signal}`
          .toLowerCase()
          .includes(search)) &&
      (filters.pairs.length === 0 || filters.pairs.includes(trade.session.pair)) &&
      (filters.strategies.length === 0 ||
        filters.strategies.includes(trade.session.strategy)) &&
      (filters.tags.length === 0 ||
        trade.session.tags.some((tag) => filters.tags.includes(tag)))
    )
  }, [filters, query, sessionId, trades])
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const visibleTrades = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function changeFilters(nextFilters: SessionFilters) {
    setFilters(nextFilters)
    setPage(1)
  }

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">TRADES</h1>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <InputGroup className="h-10 max-w-80 rounded-full px-1">
          <InputGroupAddon>
            <IconSearch />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Search trades"
            className="pr-3"
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder="Search trades"
            type="search"
            value={query}
          />
        </InputGroup>
        <SessionFilterMenu filters={filters} onChange={changeFilters} options={filterOptions} />
        <TradeSessionSelector
          onChange={(value) => {
            setSessionId(value)
            setPage(1)
          }}
          sessions={sessions}
          value={sessionId}
        />
      </div>

      <SessionFilterChips filters={filters} onChange={changeFilters} />

      <ScrollArea className="min-h-0 flex-1">
        <Table className="min-w-240 table-fixed">
          <colgroup>
            <col className="w-[7%]" />
            <col className="w-[19%]" />
            <col className="w-[16%]" />
            <col className="w-[11%]" />
            <col className="w-[8%]" />
            <col className="w-[15%]" />
            <col className="w-[15%]" />
            <col className="w-[9%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Trade</TableHead>
              <TableHead>Session</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead>Side</TableHead>
              <TableHead>Opened</TableHead>
              <TableHead>Closed</TableHead>
              <TableHead className="text-right">P&amp;L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TradeSkeletons />
            ) : visibleTrades.length ? (
              visibleTrades.map((trade) => (
                <TableRow key={trade.id}>
                  <TableCell className="font-medium">#{trade.trade_number}</TableCell>
                  <TableCell className="truncate">{trade.session.name}</TableCell>
                  <TableCell className="truncate text-muted-foreground">
                    {trade.session.strategy}
                  </TableCell>
                  <TableCell>{trade.session.pair}</TableCell>
                  <TableCell className="text-xs font-medium uppercase">{trade.side}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormatter.format(new Date(trade.entry_at))}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {dateFormatter.format(new Date(trade.exit_at))}
                  </TableCell>
                  <TableCell
                    className={
                      trade.net_pnl < 0
                        ? "text-right text-xs text-[#ff5000]"
                        : "text-right text-xs text-[#00c805]"
                    }
                  >
                    {pnlFormatter.format(trade.net_pnl)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-32 text-center text-muted-foreground" colSpan={8}>
                  {loadError || "No trades found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <footer className="flex shrink-0 translate-y-2 items-center justify-between gap-4">
        <span className="text-sm text-muted-foreground">
          Page {page} of {pageCount} · {filtered.length} trades
        </span>
        <div className="flex gap-1">
          <Button
            className="!rounded-full"
            disabled={page === 1}
            onClick={() => setPage((current) => current - 1)}
            size="sm"
            variant="ghost"
          >
            <IconChevronLeft data-icon="inline-start" />
            Previous
          </Button>
          <Button
            className="!rounded-full"
            disabled={page === pageCount}
            onClick={() => setPage((current) => current + 1)}
            size="sm"
            variant="ghost"
          >
            Next
            <IconChevronRight data-icon="inline-end" />
          </Button>
        </div>
      </footer>
    </section>
  )
}

function TradeSkeletons() {
  return Array.from({ length: 8 }, (_, index) => (
    <TableRow key={index}>
      <TableCell><Skeleton className="h-4 w-8" /></TableCell>
      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-10" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="h-4 w-28" /></TableCell>
      <TableCell><Skeleton className="ml-auto h-4 w-16" /></TableCell>
    </TableRow>
  ))
}

function unique(values: string[]) {
  return [...new Set(values)]
}
