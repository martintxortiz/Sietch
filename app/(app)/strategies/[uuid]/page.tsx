import Link from "next/link"
import { notFound } from "next/navigation"

import { StrategyActions } from "@/components/strategies/strategy-actions"
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

export default async function StrategyPage({
  params,
}: {
  params: Promise<{ uuid: string }>
}) {
  const { uuid } = await params
  const supabase = await createClient()
  const [strategyResult, sessionsResult] = await Promise.all([
    supabase
      .from("strategy_explorer")
      .select("*")
      .eq("id", uuid)
      .maybeSingle(),
    supabase
      .from("backtest_sessions")
      .select("id, name, pair, tags, trade_count, net_pnl, pnl_percent, period_days")
      .eq("strategy_id", uuid)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ])

  if (strategyResult.error) throw strategyResult.error
  if (sessionsResult.error) throw sessionsResult.error
  if (!strategyResult.data) notFound()

  const strategy = strategyResult.data
  if (!strategy.id || !strategy.user_id || !strategy.name || !strategy.created_at) notFound()
  const sessions = sessionsResult.data
  const rows = [
    ["Sessions", String(strategy.session_count ?? 0)],
    ["Trades", String(strategy.trade_count ?? 0)],
    ["Net P&L", moneyFormatter.format(strategy.net_pnl ?? 0)],
    ["Win rate", percentFormatter.format(strategy.win_rate ?? 0)],
  ] as const

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-8 px-2 pt-2 pb-8">
      <header className="flex items-start justify-between gap-4 border-b pb-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-xl font-semibold">{strategy.name}</h1>
          {strategy.description && <p className="text-sm text-muted-foreground">{strategy.description}</p>}
          {!!strategy.tags?.length && (
            <div className="flex flex-wrap gap-1">
              {strategy.tags.map((tag) => (
                <Badge color={getSessionTagColor(tag)} key={tag} size="sm" variant="solid">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <StrategyActions
          afterRemoveHref="/strategies"
          strategy={{
            archived_at: strategy.archived_at,
            created_at: strategy.created_at,
            description: strategy.description,
            id: strategy.id,
            name: strategy.name,
            tags: strategy.tags ?? [],
            user_id: strategy.user_id,
          }}
          tagOptions={strategy.tags ?? []}
        />
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">OVERVIEW</h2>
        <Table>
          <TableBody>
            {rows.map(([label, value]) => (
              <TableRow key={label}>
                <TableCell className="font-medium">{label}</TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium tabular-nums",
                    label === "Net P&L" && (strategy.net_pnl ?? 0) < 0 && "text-[#ff5000]",
                    label === "Net P&L" && (strategy.net_pnl ?? 0) >= 0 && "text-[#00c805]",
                  )}
                >
                  {value}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-medium text-muted-foreground">SESSIONS</h2>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Pair</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">% P&amp;L</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id}>
                <TableCell className="font-medium">
                  <Link className="hover:underline" href={`/sessions/${session.id}`}>{session.name}</Link>
                </TableCell>
                <TableCell>{session.pair}</TableCell>
                <TableCell className="text-right tabular-nums">{session.trade_count}</TableCell>
                <TableCell className={cn("text-right tabular-nums", session.pnl_percent < 0 ? "text-[#ff5000]" : "text-[#00c805]")}>
                  {percentFormatter.format(session.pnl_percent / 100)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
    </section>
  )
}
