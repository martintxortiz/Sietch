"use client"

import { IconFilterFilled, IconSearch, IconX } from "@tabler/icons-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
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

type MenuQueryKey = SessionFilterKey | "sessions"

interface SessionFiltersProps {
  filters: SessionFilters
  groups?: SessionFilterKey[]
  options: Record<SessionFilterKey, string[]>
  onChange: (filters: SessionFilters) => void
}

interface SessionOption {
  id: string
  name: string
}

interface SessionPickerProps {
  sessionIds?: string[]
  sessionOptions?: SessionOption[]
  onSessionIdsChange?: (ids: string[]) => void
}

export function SessionFilterMenu({
  filters,
  groups = selectableGroups.map(({ key }) => key),
  options,
  onChange,
  sessionIds = [],
  sessionOptions = [],
  onSessionIdsChange,
}: SessionFiltersProps & SessionPickerProps) {
  const [queries, setQueries] = useState<Partial<Record<MenuQueryKey, string>>>(
    {},
  )
  const active = Object.values(filters).some((values) => values.length > 0)
    || sessionIds.length > 0

  function toggle(key: SessionFilterKey, value: string) {
    const selected = filters[key]
    onChange({
      ...filters,
      [key]: selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    })
  }

  function toggleSession(id: string) {
    onSessionIdsChange?.(
      sessionIds.includes(id)
        ? sessionIds.filter((item) => item !== id)
        : [...sessionIds, id],
    )
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
      <DropdownMenuContent className="w-48" sideOffset={1}>
        <DropdownMenuGroup>
          {selectableGroups.filter(({ key }) => groups.includes(key)).map((group) => {
            const query = queries[group.key]?.toLowerCase() ?? ""
            const matchingOptions = options[group.key].filter((option) =>
              option.toLowerCase().includes(query),
            )

            return (
              <DropdownMenuSub key={group.key}>
                <DropdownMenuSubTrigger>{group.label}</DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-56">
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
                  <FilterOptions
                    options={matchingOptions}
                    selected={filters[group.key]}
                    onToggle={(option) => toggle(group.key, option)}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )
          })}
          {!!sessionOptions.length && onSessionIdsChange && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>SESSIONS</DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-56">
                <InputGroup className="h-9 rounded-full">
                  <InputGroupAddon><IconSearch /></InputGroupAddon>
                  <InputGroupInput
                    aria-label="Search sessions"
                    onChange={(event) =>
                      setQueries((current) => ({ ...current, sessions: event.target.value }))
                    }
                    placeholder="Search sessions"
                    type="search"
                    value={queries.sessions ?? ""}
                  />
                </InputGroup>
                <FilterOptions
                  options={sessionOptions
                    .filter((session) => session.name.toLowerCase().includes((queries.sessions ?? "").toLowerCase()))
                    .map(({ id, name }) => ({ id, label: name }))}
                  selected={sessionIds}
                  onToggle={toggleSession}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function FilterOptions({
  onToggle,
  options,
  selected,
}: {
  onToggle: (value: string) => void
  options: string[] | Array<{ id: string; label: string }>
  selected: string[]
}) {
  const items = options.map((option) =>
    typeof option === "string" ? { id: option, label: option } : option,
  )
  const content = (
    <DropdownMenuGroup>
      {items.length ? items.map(({ id, label }) => (
        <DropdownMenuCheckboxItem
          checked={selected.includes(id)}
          closeOnClick={false}
          key={id}
          onCheckedChange={() => onToggle(id)}
        >
          <span className="truncate">{label}</span>
        </DropdownMenuCheckboxItem>
      )) : (
        <div className="px-3 py-2 text-sm text-muted-foreground">No matches</div>
      )}
    </DropdownMenuGroup>
  )

  return items.length > 5
    ? <ScrollArea className="mt-1.5 h-56">{content}</ScrollArea>
    : <div className="mt-1.5">{content}</div>
}

export function SessionFilterChips({
  filters,
  onChange,
  sessionIds = [],
  sessionOptions = [],
  onSessionIdsChange,
}: Omit<SessionFiltersProps, "options"> & SessionPickerProps) {
  const active = selectableGroups.flatMap((group) =>
    filters[group.key].map((value) => ({ ...group, value }))
  )

  if (active.length === 0 && sessionIds.length === 0) return null

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
      {sessionIds.map((id) => {
        const name = sessionOptions.find((session) => session.id === id)?.name ?? "Session"
        return (
          <Button
            aria-label={`Remove session filter ${name}`}
            key={id}
            onClick={() => onSessionIdsChange?.(sessionIds.filter((item) => item !== id))}
            size="sm"
            variant="outline"
          >
            Session: {name}
            <IconX data-icon="inline-end" />
          </Button>
        )
      })}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onChange(emptySessionFilters)
          onSessionIdsChange?.([])
        }}
      >
        Clear all
      </Button>
    </div>
  )
}
