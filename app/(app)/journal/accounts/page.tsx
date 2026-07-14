"use client"

import { IconRefresh } from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { AddAccountDialog } from "@/components/accounts/add-account-dialog"
import { Badge } from "@/components/ui/badge"
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
import { createClient } from "@/lib/supabase/client"
import type { BrokerAccountRow } from "@/lib/supabase/database.types"

const accountColumns =
  "id, user_id, provider, start_date, server, login, account_name, status, currency, balance, equity, last_synced_at, sync_error, created_at, updated_at" as const

function formatBalance(account: BrokerAccountRow) {
  if (account.balance === null) return "—"

  return new Intl.NumberFormat(undefined, {
    currency: account.currency ?? "USD",
    currencyDisplay: "narrowSymbol",
    style: "currency",
  }).format(account.balance)
}

export default function AccountsPage() {
  const supabase = useMemo(() => createClient(), [])
  const [accounts, setAccounts] = useState<BrokerAccountRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadAccounts = useCallback(async () => {
    const result = await supabase
      .from("broker_accounts")
      .select(accountColumns)
      .order("created_at", { ascending: false })

    if (result.error) setError(result.error.message)
    else {
      setError("")
      setAccounts(result.data as BrokerAccountRow[])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Supabase resolves before this callback updates local account state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccounts()
  }, [loadAccounts])

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">ACCOUNTS</h1>
      </header>

      <div className="flex shrink-0 items-center">
        <AddAccountDialog onCreated={loadAccounts} />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[22%]" />
            <col className="w-[4%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Account</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Last updated</TableHead>
              <TableHead className="text-center">Sync</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-64 max-w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-10 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="mx-auto size-4 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : accounts.length ? (
              accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="truncate font-medium">
                    {account.account_name || `MT5 ${account.login}`} · {account.server}
                  </TableCell>
                  <TableCell><Badge size="sm">MT5</Badge></TableCell>
                  <TableCell>
                    <Badge
                      color={
                        account.status === "connected"
                          ? "lime"
                          : account.status === "error"
                            ? "orange"
                            : "amber"
                      }
                      size="sm"
                      title={account.sync_error ?? undefined}
                    >
                      {account.status.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatBalance(account)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.last_synced_at
                      ? new Date(account.last_synced_at).toLocaleString()
                      : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <IconRefresh
                      aria-label={
                        account.status === "connected"
                          ? "Sync active"
                          : "Waiting for sync worker"
                      }
                      className={
                        account.status === "connected"
                          ? "mx-auto size-4 text-[#00c805]"
                          : "mx-auto size-4 text-muted-foreground"
                      }
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  className="h-32 text-center text-muted-foreground"
                  colSpan={6}
                >
                  {error || "No accounts yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </section>
  )
}
