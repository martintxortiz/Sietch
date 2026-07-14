"use client"

import { IconSearch } from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { CreateStrategyDialog } from "@/components/strategies/create-strategy-dialog"
import { StrategyActions } from "@/components/strategies/strategy-actions"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
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
import type { BacktestStrategyRow } from "@/lib/supabase/database.types"

export default function StrategiesPage() {
  const supabase = useMemo(() => createClient(), [])
  const [strategies, setStrategies] = useState<BacktestStrategyRow[]>([])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadStrategies = useCallback(async () => {
    const result = await supabase
      .from("strategies")
      .select("id, user_id, name, description, created_at")
      .order("created_at", { ascending: false })

    if (result.error) setError(result.error.message)
    else {
      setError("")
      setStrategies(result.data)
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    // Supabase resolves before this callback updates local strategy state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadStrategies()
  }, [loadStrategies])

  const visibleStrategies = strategies.filter((strategy) =>
    `${strategy.name} ${strategy.description ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  return (
    <section className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">STRATEGIES</h1>
      </header>

      <div className="flex shrink-0 items-center gap-2">
        <InputGroup className="h-10 max-w-80 rounded-full px-1">
          <InputGroupAddon><IconSearch /></InputGroupAddon>
          <InputGroupInput
            aria-label="Search strategies"
            className="pr-3"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search strategies"
            type="search"
            value={query}
          />
        </InputGroup>
        <CreateStrategyDialog onCreated={loadStrategies} />
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-[28%]" />
            <col className="w-[52%]" />
            <col className="w-[14%]" />
            <col className="w-[6%]" />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
              <TableHead aria-label="Actions" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }, (_, index) => (
                <TableRow key={index}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64 max-w-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="ml-auto size-6 rounded-full" /></TableCell>
                </TableRow>
              ))
            ) : visibleStrategies.length ? (
              visibleStrategies.map((strategy) => (
                <TableRow key={strategy.id}>
                  <TableCell className="font-medium">{strategy.name}</TableCell>
                  <TableCell className="truncate text-muted-foreground">
                    {strategy.description || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(strategy.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <StrategyActions strategy={strategy} onChanged={loadStrategies} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell className="h-32 text-center text-muted-foreground" colSpan={4}>
                  {error || "No strategies yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </section>
  )
}
