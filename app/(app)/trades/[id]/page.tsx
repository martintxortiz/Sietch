import Link from "next/link"
import { notFound } from "next/navigation"

import { TradeActions } from "@/components/trades/trade-actions"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { getSessionTagColor } from "@/lib/sessions"
import { cn } from "@/lib/utils"

const moneyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
})
const percentFormatter = new Intl.NumberFormat("en-US", {
  style: "percent",
  signDisplay: "exceptZero",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export default async function TradePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const tradeResult = await supabase.from("backtest_trades").select("*").eq("id", Number(id)).maybeSingle()

  if (tradeResult.error) throw tradeResult.error
  if (!tradeResult.data) notFound()

  const trade = tradeResult.data
  const [sessionResult, tagsResult] = await Promise.all([
    supabase
      .from("backtest_sessions")
      .select("id, name, pair, strategy:strategies(id, name)")
      .eq("id", trade.session_id)
      .maybeSingle(),
    supabase.from("backtest_trade_tag_options").select("tag").order("tag"),
  ])

  if (sessionResult.error) throw sessionResult.error
  if (!sessionResult.data) notFound()

  const session = sessionResult.data
  const rows = [
    ["Side", trade.side.toUpperCase()],
    ["Entry", `${new Date(trade.entry_at).toLocaleString()} · ${trade.entry_price}`],
    ["Exit", `${new Date(trade.exit_at).toLocaleString()} · ${trade.exit_price}`],
    ["Quantity", String(trade.quantity)],
    ["Position value", moneyFormatter.format(trade.position_value)],
    ["Net P&L", moneyFormatter.format(trade.net_pnl)],
    ["Return", percentFormatter.format(trade.return_percent / 100)],
    ["Favorable excursion", moneyFormatter.format(trade.favorable_excursion)],
    ["Adverse excursion", moneyFormatter.format(trade.adverse_excursion)],
    ["Duration", `${trade.duration_bars} bars`],
    ["Entry signal", trade.entry_signal],
    ["Exit signal", trade.exit_signal],
  ] as const

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-8 px-2 pt-2 pb-8">
      <header className="flex items-start justify-between gap-4 border-b pb-4">
        <div className="flex min-w-0 flex-col gap-2">
          <h1 className="text-xl font-semibold">TRADE #{trade.trade_number}</h1>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:underline" href={`/sessions/${session.id}`}>{session.name}</Link>
            {" · "}
            <Link className="hover:underline" href={`/strategies/${session.strategy.id}`}>{session.strategy.name}</Link>
            {" · "}{session.pair}
          </p>
          {!!trade.tags.length && (
            <div className="flex flex-wrap gap-1">
              {trade.tags.map((tag) => (
                <Badge color={getSessionTagColor(tag)} key={tag} size="sm" variant="solid">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        <TradeActions
          tagOptions={tagsResult.data?.flatMap(({ tag }) => tag ? [tag] : []) ?? trade.tags}
          trade={{
            entry_signal: trade.entry_signal,
            exit_signal: trade.exit_signal,
            id: trade.id,
            tags: trade.tags,
          }}
        />
      </header>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Field</TableHead>
            <TableHead className="text-right">Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(([label, value]) => (
            <TableRow key={label}>
              <TableCell className="font-medium">{label}</TableCell>
              <TableCell className={cn("text-right tabular-nums", label === "Net P&L" && (trade.net_pnl < 0 ? "text-[#ff5000]" : "text-[#00c805]"))}>
                {value}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  )
}
