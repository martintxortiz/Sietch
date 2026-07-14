"use client"

import { IconDots, IconEdit } from "@tabler/icons-react"
import { type FormEvent, useState } from "react"

import { StrategyFields } from "@/components/strategies/strategy-fields"
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
import { createClient } from "@/lib/supabase/client"
import type { BacktestStrategyRow } from "@/lib/supabase/database.types"

export function StrategyActions({
  strategy,
  onChanged,
}: {
  strategy: BacktestStrategyRow
  onChanged: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(strategy.name)
  const [description, setDescription] = useState(strategy.description ?? "")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function openEdit() {
    setName(strategy.name)
    setDescription(strategy.description ?? "")
    setError("")
    setOpen(true)
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return

    setError("")
    setSaving(true)
    const { error: updateError } = await createClient()
      .from("strategies")
      .update({
        description: description.trim() || null,
        name: name.trim(),
      })
      .eq("id", strategy.id)

    if (updateError) {
      setError(
        updateError.code === "23505"
          ? "A strategy with this name already exists."
          : updateError.message,
      )
      setSaving(false)
      return
    }

    setOpen(false)
    setSaving(false)
    await onChanged()
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Actions for ${strategy.name}`}
          render={<Button size="icon-lg" variant="ghost" />}
        >
          <IconDots data-icon="inline-start" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 rounded-3xl bg-muted py-1.5" sideOffset={1}>
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
            <DialogTitle>EDIT STRATEGY</DialogTitle>
            <DialogDescription>Update the strategy name and description.</DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-4" onSubmit={save}>
            <StrategyFields
              description={description}
              id={`strategy-${strategy.id}`}
              name={name}
              onDescriptionChange={setDescription}
              onNameChange={setName}
            />
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Could not save strategy</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button disabled={saving} onClick={() => setOpen(false)} type="button" variant="ghost">
                Cancel
              </Button>
              <Button disabled={saving || !name.trim()} type="submit">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
