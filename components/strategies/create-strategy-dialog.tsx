"use client"

import { IconPlus } from "@tabler/icons-react"
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
  DialogTrigger,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"

export function CreateStrategyDialog({
  onCreated,
}: {
  onCreated: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function reset() {
    setName("")
    setDescription("")
    setError("")
    setSaving(false)
  }

  async function createStrategy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) return

    setError("")
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setError("Your session expired. Sign in again.")
      setSaving(false)
      return
    }

    const { error: insertError } = await supabase.from("strategies").insert({
      description: description.trim() || null,
      name: name.trim(),
      user_id: user.id,
    })

    if (insertError) {
      setError(
        insertError.code === "23505"
          ? "A strategy with this name already exists."
          : insertError.message,
      )
      setSaving(false)
      return
    }

    setOpen(false)
    reset()
    await onCreated()
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
        New Strategy
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>NEW STRATEGY</DialogTitle>
          <DialogDescription>Create a strategy to organize backtest sessions.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={createStrategy}>
          <StrategyFields
            description={description}
            id="strategy"
            name={name}
            onDescriptionChange={setDescription}
            onNameChange={setName}
          />
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not create strategy</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button disabled={saving} onClick={() => setOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={saving || !name.trim()} type="submit">
              {saving ? "Creating..." : "Create strategy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
