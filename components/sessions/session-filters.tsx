"use client"

import { IconFilterFilled, IconSearch, IconX } from "@tabler/icons-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  emptySessionFilters,
  type SessionFilterKey,
  type SessionFilters,
} from "@/lib/sessions"
import { cn } from "@/lib/utils"

const selectableGroups = [
  { key: "pairs", label: "PAIRS", chipLabel: "Pair" },
  { key: "strategies", label: "STRATEGIES", chipLabel: "Strategy" },
  { key: "tags", label: "TAGS", chipLabel: "Tag" },
] satisfies Array<{
  key: SessionFilterKey
  label: string
  chipLabel: string
}>

const plannedGroups = ["PERIOD", "UPLOAD DATE"]

interface SessionFiltersProps {
  filters: SessionFilters
  options: Record<SessionFilterKey, string[]>
  onChange: (filters: SessionFilters) => void
}

export function SessionFilterMenu({
  filters,
  options,
  onChange,
}: SessionFiltersProps) {
  const [queries, setQueries] = useState<
    Partial<Record<SessionFilterKey, string>>
  >({})
  const active = Object.values(filters).some((values) => values.length > 0)

  function toggle(key: SessionFilterKey, value: string) {
    const selected = filters[key]
    onChange({
      ...filters,
      [key]: selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Filters"
        render={
          <Button
            variant="ghost"
            size="icon-lg"
            className={cn(
              "size-10",
              active && "bg-muted hover:bg-muted/80"
            )}
          />
        }
      >
        <IconFilterFilled data-icon="inline-start" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={1}
        className="w-48 rounded-3xl bg-muted py-1.5"
      >
        <DropdownMenuGroup>
          {selectableGroups.map((group) => {
            const query = queries[group.key]?.toLowerCase() ?? ""
            const matchingOptions = options[group.key].filter((option) =>
              option.toLowerCase().includes(query),
            )

            return (
              <DropdownMenuSub key={group.key}>
                <DropdownMenuSubTrigger>{group.label}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56 p-1.5">
                  <InputGroup className="h-9 rounded-full">
                    <InputGroupAddon>
                      <IconSearch />
                    </InputGroupAddon>
                    <InputGroupInput
                      aria-label={`Search ${group.label.toLowerCase()}`}
                      onChange={(event) =>
                        setQueries((current) => ({
                          ...current,
                          [group.key]: event.target.value,
                        }))
                      }
                      placeholder={`Search ${group.label.toLowerCase()}`}
                      type="search"
                      value={queries[group.key] ?? ""}
                    />
                  </InputGroup>
                  <ScrollArea className="mt-1.5 h-56">
                    <DropdownMenuGroup>
                      {matchingOptions.map((option) => (
                        <DropdownMenuCheckboxItem
                          key={option}
                          checked={filters[group.key].includes(option)}
                          closeOnClick={false}
                          onCheckedChange={() => toggle(group.key, option)}
                        >
                          {option}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuGroup>
                  </ScrollArea>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          })}
          {plannedGroups.map((label) => (
            <DropdownMenuItem
              key={label}
              disabled
              className="h-10 rounded-full px-3 font-medium text-muted-foreground"
            >
              {label}
              <span className="ml-auto text-xs">PLANNED</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function SessionFilterChips({
  filters,
  onChange,
}: Omit<SessionFiltersProps, "options">) {
  const active = selectableGroups.flatMap((group) =>
    filters[group.key].map((value) => ({ ...group, value }))
  )

  if (active.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active.map(({ key, chipLabel, value }) => (
        <Button
          key={`${key}-${value}`}
          variant="outline"
          size="sm"
          aria-label={`Remove ${chipLabel.toLowerCase()} filter ${value}`}
          onClick={() =>
            onChange({
              ...filters,
              [key]: filters[key].filter((item) => item !== value),
            })
          }
        >
          {chipLabel}: {value}
          <IconX data-icon="inline-end" />
        </Button>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(emptySessionFilters)}
      >
        Clear all
      </Button>
    </div>
  )
}
