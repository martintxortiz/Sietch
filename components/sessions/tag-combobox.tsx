"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSessionTagColor } from "@/lib/sessions"

export function TagCombobox({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [query, setQuery] = useState("")
  const matching = useMemo(
    () => options.filter((tag) => tag.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  )
  const canCreate = query.trim() && !options.some(
    (tag) => tag.toLowerCase() === query.trim().toLowerCase(),
  )

  function toggle(tag: string) {
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag])
  }

  return (
    <DropdownMenu onOpenChange={(open) => !open && setQuery("")}>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Select tags"
            className="min-h-8 h-auto w-full justify-start rounded-lg px-2.5 py-1.5"
            type="button"
            variant="outline"
          />
        }
      >
        {value.length ? (
          <span className="flex flex-wrap gap-1">
            {value.map((tag) => (
              <Badge color={getSessionTagColor(tag)} key={tag} size="sm" variant="solid">
                {tag}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">Select or create tags</span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="rounded-xl p-1.5" sideOffset={4}>
        <Input
          aria-label="Search tags"
          autoFocus
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && canCreate) {
              event.preventDefault()
              toggle(query.trim())
              setQuery("")
            }
          }}
          placeholder="Search tags"
          value={query}
        />
        <ScrollArea className="mt-1.5 h-44">
          <DropdownMenuGroup>
            {canCreate && (
              <DropdownMenuItem
                closeOnClick={false}
                onClick={() => {
                  toggle(query.trim())
                  setQuery("")
                }}
              >
                Create “{query.trim()}”
              </DropdownMenuItem>
            )}
            {matching.map((tag) => (
              <DropdownMenuCheckboxItem
                checked={value.includes(tag)}
                closeOnClick={false}
                key={tag}
                onCheckedChange={() => toggle(tag)}
              >
                <Badge color={getSessionTagColor(tag)} size="sm" variant="solid">
                  {tag}
                </Badge>
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
