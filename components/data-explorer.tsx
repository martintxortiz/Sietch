"use client"

import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronUp,
  IconExternalLink,
  IconFilter,
  IconLayoutGridFilled,
  IconSearch,
} from "@tabler/icons-react"
import { useEffect, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { TableHead } from "@/components/ui/table"
import { getSessionTagColor } from "@/lib/sessions"
import { cn } from "@/lib/utils"

export type ExplorerSort<Key extends string> = {
  key: Key
  direction: "asc" | "desc"
} | null

export function nextExplorerSort<Key extends string>(
  sort: ExplorerSort<Key>,
  key: Key,
): ExplorerSort<Key> {
  if (sort?.key !== key) return { key, direction: "asc" }
  if (sort.direction === "asc") return { key, direction: "desc" }
  return null
}

export function DataSearch({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <InputGroup className="h-10 max-w-80 rounded-full px-1">
      <InputGroupAddon><IconSearch /></InputGroupAddon>
      <InputGroupInput
        aria-label={placeholder}
        className="pr-3"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="search"
        value={value}
      />
    </InputGroup>
  )
}

export function CardViewToggle({
  active,
  onClick,
}: {
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      aria-label="Toggle card view"
      aria-pressed={active}
      className={cn(
        "size-10",
        active ? "bg-muted hover:bg-muted/80" : "hover:bg-muted/50",
      )}
      onClick={onClick}
      size="icon-lg"
      variant="ghost"
    >
      <IconLayoutGridFilled data-icon="inline-start" />
    </Button>
  )
}

export function SortHeader<Key extends string>({
  align = "left",
  label,
  onSort,
  sort,
  sortKey,
}: {
  align?: "left" | "right"
  label: string
  onSort: (key: Key) => void
  sort: ExplorerSort<Key>
  sortKey: Key
}) {
  const direction = sort?.key === sortKey ? sort.direction : null

  return (
    <TableHead
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
      className={cn(align === "right" && "text-right")}
    >
      <Button
        className={cn(
          "h-auto !rounded-full px-2 font-medium",
          align === "left" ? "-ml-2" : "ml-auto -mr-2",
        )}
        onClick={() => onSort(sortKey)}
        size="sm"
        variant="ghost"
      >
        {label}
        {direction === "asc" && <IconChevronUp data-icon="inline-end" />}
        {direction === "desc" && <IconChevronDown data-icon="inline-end" />}
      </Button>
    </TableHead>
  )
}

export function PaginationFooter({
  label,
  onPageChange,
  page,
  pageCount,
  total,
}: {
  label: string
  onPageChange: (page: number) => void
  page: number
  pageCount: number
  total: number
}) {
  return (
    <footer className="flex shrink-0 translate-y-2 items-center justify-between gap-4">
      <span className="text-sm text-muted-foreground">
        Page {page} of {pageCount} · {total} {label}
      </span>
      <div className="flex gap-1">
        <Button
          className="!rounded-full"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          size="sm"
          variant="ghost"
        >
          <IconChevronLeft data-icon="inline-start" />
          Previous
        </Button>
        <Button
          className="!rounded-full"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          size="sm"
          variant="ghost"
        >
          Next
          <IconChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </footer>
  )
}

export function FilterValue({
  className,
  onFilter,
  onOpen,
  value,
}: {
  className?: string
  onFilter?: () => void
  onOpen?: () => void
  value: string
}) {
  return (
    <span
      className={cn(
        "group/action inline-flex max-w-full items-center gap-0.5 rounded-full px-1 transition-colors hover:bg-muted focus-within:bg-muted",
        className,
      )}
    >
      <span className="truncate">{value}</span>
      <span className="flex shrink-0 opacity-0 transition-opacity group-hover/action:opacity-100 group-focus-within/action:opacity-100">
        {onFilter && (
          <ValueAction
            icon={<IconFilter />}
            label={`Filter by ${value}`}
            onClick={onFilter}
          />
        )}
        {onOpen && (
          <ValueAction
            icon={<IconExternalLink />}
            label={`Open ${value}`}
            onClick={onOpen}
          />
        )}
      </span>
    </span>
  )
}

function ValueAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button
      aria-label={label}
      className="size-5 hover:bg-transparent"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      size="icon-lg"
      title={label}
      type="button"
      variant="ghost"
    >
      {icon}
    </Button>
  )
}

export function FilterTag({
  onClick,
  tag,
}: {
  onClick: () => void
  tag: string
}) {
  return (
    <button
      className="rounded-full border border-transparent transition-colors hover:border-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      onClick={(event) => {
        event.stopPropagation()
        onClick()
      }}
      type="button"
    >
      <Badge color={getSessionTagColor(tag)} size="sm" variant="solid">
        {tag}
      </Badge>
    </button>
  )
}

export function CardMetric({
  label,
  onFilter,
  onOpen,
  value,
  valueClassName,
}: {
  label: string
  onFilter?: () => void
  onOpen?: () => void
  value: string
  valueClassName?: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-muted-foreground">{label}</div>
      {onFilter || onOpen ? (
        <FilterValue
          className={cn("mt-0.5 font-medium tabular-nums", valueClassName)}
          onFilter={onFilter}
          onOpen={onOpen}
          value={value}
        />
      ) : (
        <div className={cn("mt-0.5 truncate font-medium tabular-nums", valueClassName)}>
          {value}
        </div>
      )}
    </div>
  )
}

export function usePersistedCardView(key: string) {
  const [cardView, setCardView] = useState(false)

  useEffect(() => {
    // localStorage is only available after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCardView(localStorage.getItem(key) === "cards")
  }, [key])

  function update(next: boolean) {
    setCardView(next)
    localStorage.setItem(key, next ? "cards" : "table")
  }

  return [cardView, update] as const
}
