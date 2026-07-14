"use client"

import {
  IconArchive,
  IconDots,
  IconEdit,
  IconFileSpreadsheet,
} from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

import {
  SessionFields,
  type SessionFormValues,
} from "@/components/sessions/session-fields"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { backtestImportsBucket, reportSourcePath } from "@/lib/backtest-storage"
import type { StrategyOption } from "@/lib/strategies"
import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/lib/supabase/database.types"
import {
  readTradingViewReport,
  type TradingViewReport,
} from "@/lib/tradingview-report"

const maxFileSize = 25 * 1024 * 1024

export interface EditableSession {
  id: string
  name: string
  strategyId: string
  pair: string
  tags: string[]
  accountSize: number | null
  reportFilename: string | null
  reportPath: string | null
  trades: number
}

export function SessionActions({
  session,
  strategies,
  tagOptions,
  onChanged,
}: {
  session: EditableSession
  strategies: StrategyOption[]
  tagOptions: string[]
  onChanged: () => void | Promise<void>
}) {
  const [editOpen, setEditOpen] = useState(false)
  const [values, setValues] = useState<SessionFormValues>(() => formValues(session))
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [report, setReport] = useState<TradingViewReport | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [archiving, setArchiving] = useState(false)

  function openEdit() {
    setValues(formValues(session))
    setReportFile(null)
    setReport(null)
    setError("")
    setEditOpen(true)
  }

  async function validateReport(file?: File) {
    if (!file) {
      setReportFile(null)
      setReport(null)
      return
    }
    setError("")
    setReportFile(null)
    setReport(null)

    try {
      if (!file.name.toLowerCase().endsWith(".xlsx")) {
        throw new Error("Choose a TradingView XLSX report.")
      }
      if (file.size > maxFileSize) throw new Error("The XLSX must be smaller than 25 MB.")

      const nextReport = await readTradingViewReport(file)
      if (nextReport.tradeCount !== session.trades) {
        throw new Error("The XLSX trade count does not match this session.")
      }
      setReportFile(file)
      setReport(nextReport)
      setValues((current) => ({ ...current, accountSize: String(nextReport.accountSize) }))
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "The XLSX is invalid.")
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!values.name.trim() || !values.strategyId || !values.pair.trim()) {
      setError("Name, strategy, and pair are required.")
      return
    }
    const accountSize = values.accountSize ? Number(values.accountSize) : null
    if (accountSize !== null && (!Number.isFinite(accountSize) || accountSize <= 0)) {
      setError("Account size must be positive.")
      return
    }

    setError("")
    setSaving(true)
    const supabase = createClient()
    let nextReportPath: string | undefined

    if (reportFile) {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError("Your session expired. Sign in again.")
        setSaving(false)
        return
      }

      nextReportPath = reportSourcePath(user.id, session.id)
      const { error: storageError } = await supabase.storage
        .from(backtestImportsBucket)
        .upload(nextReportPath, reportFile, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        })
      if (storageError) {
        setError(storageError.message)
        setSaving(false)
        return
      }
    }

    const { error: updateError } = await supabase.rpc("update_backtest_session", {
      p_account_size: accountSize,
      p_metrics: report ? report.metrics as unknown as Json : undefined,
      p_name: values.name.trim(),
      p_pair: values.pair.trim(),
      p_report_filename: reportFile?.name,
      p_report_path: nextReportPath,
      p_session_id: session.id,
      p_strategy_id: values.strategyId,
      p_tags: values.tags,
    })

    if (updateError) {
      if (nextReportPath) {
        await supabase.storage.from(backtestImportsBucket).remove([nextReportPath])
      }
      setError(updateError.message)
      setSaving(false)
      return
    }

    setEditOpen(false)
    setSaving(false)
    if (nextReportPath && session.reportPath) {
      await supabase.storage.from(backtestImportsBucket).remove([session.reportPath])
    }
    await onChanged()
  }

  async function archive() {
    setError("")
    setArchiving(true)
    const { error: archiveError } = await createClient().rpc("archive_backtest_session", {
      p_session_id: session.id,
    })
    if (archiveError) {
      setError(archiveError.message)
      setArchiving(false)
      return
    }
    await onChanged()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Session actions"
          render={<Button variant="ghost" size="icon-lg" />}
        >
          <IconDots data-icon="inline-start" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={1} className="w-36 rounded-3xl bg-muted py-1.5">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openEdit}>
              <IconEdit />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem disabled={archiving} onClick={() => void archive()}>
              <IconArchive />
              {archiving ? "Archiving..." : "Archive"}
            </DropdownMenuItem>
            {error && !editOpen && (
              <DropdownMenuLabel className="whitespace-normal text-destructive">
                {error}
              </DropdownMenuLabel>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={(open) => !saving && setEditOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EDIT SESSION</DialogTitle>
            <DialogDescription>
              Update session details or attach its TradingView XLSX report.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={save}>
            <SessionFields
              id={`edit-${session.id}`}
              onChange={setValues}
              strategies={strategies}
              tagOptions={tagOptions}
              value={values}
            />
            <Field>
              <FieldLabel htmlFor={`report-${session.id}`}>TradingView XLSX</FieldLabel>
              <Input
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                id={`report-${session.id}`}
                onChange={(event) => void validateReport(event.target.files?.[0])}
                type="file"
              />
              <FieldDescription>
                {reportFile?.name ?? session.reportFilename ?? "Optional. Adds account and report metrics."}
              </FieldDescription>
            </Field>
            {report && (
              <Alert>
                <IconFileSpreadsheet />
                <AlertTitle>Report ready</AlertTitle>
                <AlertDescription>
                  {report.metrics.length} metrics · account size {report.accountSize.toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not save</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button disabled={saving} onClick={() => setEditOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={saving} type="submit">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

function formValues(session: EditableSession): SessionFormValues {
  return {
    name: session.name,
    strategyId: session.strategyId,
    pair: session.pair,
    tags: session.tags,
    accountSize: session.accountSize === null ? "" : String(session.accountSize),
  }
}
