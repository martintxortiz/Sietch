"use client"

import { IconFileUpload, IconPlus } from "@tabler/icons-react"
import { type DragEvent, type FormEvent, useRef, useState } from "react"

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
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  backtestImportsBucket,
  reportSourcePath,
  tradeSourcePath,
} from "@/lib/backtest-storage"
import type { StrategyOption } from "@/lib/strategies"
import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/lib/supabase/database.types"
import { selectTradingViewFiles } from "@/lib/tradingview-files"
import {
  readTradingViewReport,
  type TradingViewReport,
} from "@/lib/tradingview-report"
import {
  parseTradingViewCsv,
  tradingViewFileDefaults,
  type TradingViewImport,
} from "@/lib/tradingview"
import { cn } from "@/lib/utils"

const emptyValues: SessionFormValues = {
  name: "",
  strategyId: "",
  pair: "",
  tags: [],
  accountSize: "",
}

export function UploadSessionDialog({
  strategies,
  tagOptions,
  onUploaded,
}: {
  strategies: StrategyOption[]
  tagOptions: string[]
  onUploaded: () => void | Promise<void>
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [reportFile, setReportFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<TradingViewImport | null>(null)
  const [report, setReport] = useState<TradingViewReport | null>(null)
  const [values, setValues] = useState<SessionFormValues>(emptyValues)
  const [error, setError] = useState("")
  const [validating, setValidating] = useState(false)
  const [saving, setSaving] = useState(false)

  function reset() {
    setDragging(false)
    setCsvFile(null)
    setReportFile(null)
    setParsed(null)
    setReport(null)
    setValues(emptyValues)
    setError("")
    setValidating(false)
    setSaving(false)
    if (inputRef.current) inputRef.current.value = ""
  }

  async function validateFiles(files: File[]) {
    setError("")
    setValidating(true)

    try {
      const selected = selectTradingViewFiles(files)
      const [csvText, nextReport] = await Promise.all([
        selected.csv.text(),
        selected.report ? readTradingViewReport(selected.report) : null,
      ])
      const nextParsed = parseTradingViewCsv(csvText)

      if (nextReport && nextReport.tradeCount !== nextParsed.trades.length) {
        throw new Error("The CSV and XLSX trade counts do not match.")
      }

      const defaults = tradingViewFileDefaults(selected.csv.name)
      setCsvFile(selected.csv)
      setReportFile(selected.report)
      setParsed(nextParsed)
      setReport(nextReport)
      setValues({
        ...emptyValues,
        accountSize: nextReport ? String(nextReport.accountSize) : "",
        name: defaults.name,
        pair: defaults.pair,
      })
    } catch (validationError) {
      setError(
        validationError instanceof Error
          ? validationError.message
          : "The files could not be validated.",
      )
    } finally {
      setValidating(false)
    }
  }

  function dropFiles(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    const files = Array.from(event.dataTransfer.files)
    void validateFiles(csvFile && parsed && !report ? [csvFile, ...files] : files)
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!csvFile || !parsed || !reportFile || !report) return
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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError("Your session expired. Sign in again.")
      setSaving(false)
      return
    }

    const sessionId = crypto.randomUUID()
    const sourcePath = tradeSourcePath(user.id, sessionId)
    const nextReportPath = reportSourcePath(user.id, sessionId)
    const storedPaths = [sourcePath]
    const { error: csvStorageError } = await supabase.storage
      .from(backtestImportsBucket)
      .upload(sourcePath, csvFile, { contentType: "text/csv" })

    if (csvStorageError) {
      setError(csvStorageError.message)
      setSaving(false)
      return
    }

    const { error: reportStorageError } = await supabase.storage
      .from(backtestImportsBucket)
      .upload(nextReportPath, reportFile, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })
    if (reportStorageError) {
      await supabase.storage.from(backtestImportsBucket).remove(storedPaths)
      setError(reportStorageError.message)
      setSaving(false)
      return
    }
    storedPaths.push(nextReportPath)

    const { error: uploadError } = await supabase.rpc("import_backtest_session", {
      p_account_size: accountSize,
      p_metrics: report.metrics as unknown as Json,
      p_name: values.name.trim(),
      p_pair: values.pair.trim(),
      p_report_filename: reportFile.name,
      p_report_path: nextReportPath,
      p_session_id: sessionId,
      p_source_filename: csvFile.name,
      p_source_path: sourcePath,
      p_strategy_id: values.strategyId,
      p_tags: values.tags,
      p_trades: parsed.trades as unknown as Json,
    })

    if (uploadError) {
      await supabase.storage.from(backtestImportsBucket).remove(storedPaths)
      setError(uploadError.message)
      setSaving(false)
      return
    }

    setOpen(false)
    reset()
    await onUploaded()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen && !saving) reset()
      }}
    >
      <DialogTrigger render={<Button className="ml-auto h-10 !px-5" size="lg" />}>
        <IconPlus data-icon="inline-start" />
        Upload Session
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>UPLOAD SESSION</DialogTitle>
          <DialogDescription>
            Select the TradingView CSV and matching XLSX. Both are required.
          </DialogDescription>
        </DialogHeader>

        {parsed && csvFile && report && reportFile ? (
          <form className="flex flex-col gap-4" onSubmit={upload}>
            <Alert>
              <AlertTitle>{csvFile.name}</AlertTitle>
              <AlertDescription>
                {parsed.trades.length} {parsed.trades.length === 1 ? "trade" : "trades"}
                {` · ${reportFile.name}`}
              </AlertDescription>
            </Alert>

            <SessionFields
              id="upload-session"
              onChange={setValues}
              strategies={strategies}
              tagOptions={tagOptions}
              value={values}
            />

            {!strategies.length && (
              <Alert variant="destructive">
                <AlertTitle>Create a strategy first</AlertTitle>
                <AlertDescription>Sessions must belong to one of your strategies.</AlertDescription>
              </Alert>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Upload failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button disabled={saving || !strategies.length} type="submit">
                {saving ? "Uploading..." : "Upload session"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <>
            {parsed && csvFile && (
              <Alert>
                <AlertTitle>{csvFile.name}</AlertTitle>
                <AlertDescription>
                  CSV ready · now add its matching XLSX report.
                </AlertDescription>
              </Alert>
            )}
            <div
              className={cn(
                "flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 text-center transition-colors",
                dragging && "bg-muted",
              )}
              onDragEnter={(event) => {
                event.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={dropFiles}
            >
              <IconFileUpload className="size-6 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {validating
                    ? "Reading TradingView files..."
                    : parsed && csvFile
                      ? "Drop the matching XLSX here"
                      : "Drop the CSV and XLSX here"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {parsed && csvFile ? "XLSX · 25 MB maximum" : "One CSV + one XLSX · 25 MB each"}
                </p>
              </div>
              <Button
                disabled={validating}
                onClick={() => inputRef.current?.click()}
                type="button"
                variant="outline"
              >
                {parsed && csvFile ? "Browse XLSX" : "Browse files"}
              </Button>
              <Input
                ref={inputRef}
                accept={
                  parsed && csvFile
                    ? ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    : ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                }
                className="sr-only"
                multiple={!parsed || !csvFile}
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  void validateFiles(parsed && csvFile ? [csvFile, ...files] : files)
                }}
                type="file"
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Invalid files</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
