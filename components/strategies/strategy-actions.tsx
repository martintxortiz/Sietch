"use client"

import { IconArchive, IconDots, IconEdit, IconTrash } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { type FormEvent, useState } from "react"
import { toast } from "sonner"

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
  tagOptions,
  afterRemoveHref,
}: {
  strategy: BacktestStrategyRow
  onChanged?: () => void | Promise<void>
  tagOptions: string[]
  afterRemoveHref?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(strategy.name)
  const [description, setDescription] = useState(strategy.description ?? "")
  const [tags, setTags] = useState(strategy.tags)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  function openEdit() {
    setName(strategy.name)
    setDescription(strategy.description ?? "")
    setTags(strategy.tags)
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
        tags,
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
    toast.success("Strategy updated")
    await onChanged?.()
    router.refresh()
  }

  async function archive() {
    setError("")
    setArchiving(true)
    const { error: archiveError } = await createClient().rpc("archive_strategy", {
      p_strategy_id: strategy.id,
    })
    if (archiveError) {
      setError(archiveError.message)
      toast.error("Could not archive strategy", { description: archiveError.message })
    } else {
      toast.success("Strategy archived")
      await onChanged?.()
      if (afterRemoveHref) router.push(afterRemoveHref)
    }
    setArchiving(false)
  }

  async function remove() {
    setError("")
    setDeleting(true)
    const { error: deleteError } = await createClient().rpc("delete_strategy", {
      p_strategy_id: strategy.id,
    })
    if (deleteError) {
      setError(deleteError.message)
      toast.error("Could not delete strategy", { description: deleteError.message })
    }
    else {
      setDeleteOpen(false)
      toast.success("Strategy deleted")
      await onChanged?.()
      if (afterRemoveHref) router.push(afterRemoveHref)
    }
    setDeleting(false)
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
        <DropdownMenuContent align="end" className="w-32" sideOffset={1}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={openEdit}>
              <IconEdit />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem disabled={archiving} onClick={() => void archive()}>
              <IconArchive />
              {archiving ? "Archiving..." : "Archive"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} variant="destructive">
              <IconTrash />
              Delete
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
              onTagsChange={setTags}
              tagOptions={tagOptions}
              tags={tags}
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

      <Dialog open={deleteOpen} onOpenChange={(nextOpen) => !deleting && setDeleteOpen(nextOpen)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>DELETE STRATEGY</DialogTitle>
            <DialogDescription>
              This only works when no sessions use {strategy.name}.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Could not delete strategy</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button disabled={deleting} onClick={() => setDeleteOpen(false)} type="button" variant="ghost">
              Cancel
            </Button>
            <Button disabled={deleting} onClick={() => void remove()} type="button" variant="destructive">
              {deleting ? "Deleting..." : "Delete strategy"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
