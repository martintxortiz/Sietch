"use client"

import { IconDots, IconEdit } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

import { TagCombobox } from "@/components/sessions/tag-combobox"
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

export function TradeActions({
  trade,
  onChanged,
  tagOptions = [],
}: {
  trade: { id: number; entry_signal: string; exit_signal: string; tags: string[] }
  onChanged?: () => void | Promise<void>
  tagOptions?: string[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [entrySignal, setEntrySignal] = useState(trade.entry_signal)
  const [exitSignal, setExitSignal] = useState(trade.exit_signal)
  const [tags, setTags] = useState(trade.tags)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setEntrySignal(trade.entry_signal)
    setExitSignal(trade.exit_signal)
    setTags(trade.tags)
    setError("")
    setOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    const { error: updateError } = await createClient()
      .from("backtest_trades")
      .update({ entry_signal: entrySignal.trim(), exit_signal: exitSignal.trim(), tags })
      .eq("id", trade.id)

    if (updateError) {
      setError(updateError.message)
      setSaving(false)
      return
    }

    setOpen(false)
    setSaving(false)
    toast.success("Trade updated")
    await onChanged?.()
    router.refresh()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger aria-label="Trade actions" render={<Button size="icon-lg" variant="ghost" />}>
          <IconDots data-icon="inline-start" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32" sideOffset={1}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openEdit}>
              <IconEdit />
              Edit
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={(nextOpen) => !saving && setOpen(nextOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>EDIT TRADE</DialogTitle>
            <DialogDescription>Update the imported entry and exit signal labels.</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={save}>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel htmlFor={`entry-signal-${trade.id}`}>Entry signal</FieldLabel>
                <Input className="h-10 px-3" id={`entry-signal-${trade.id}`} onChange={(event) => setEntrySignal(event.target.value)} value={entrySignal} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`exit-signal-${trade.id}`}>Exit signal</FieldLabel>
                <Input className="h-10 px-3" id={`exit-signal-${trade.id}`} onChange={(event) => setExitSignal(event.target.value)} value={exitSignal} />
              </Field>
              <Field>
                <FieldLabel htmlFor={`trade-tags-${trade.id}`}>Tags</FieldLabel>
                <TagCombobox
                  id={`trade-tags-${trade.id}`}
                  onChange={setTags}
                  options={[...new Set([...tagOptions, ...trade.tags])]}
                  value={tags}
                />
              </Field>
            </FieldGroup>
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not save trade</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button disabled={saving} onClick={() => setOpen(false)} type="button" variant="ghost">Cancel</Button>
              <Button disabled={saving} type="submit">{saving ? "Saving..." : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
