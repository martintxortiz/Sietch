import { IconChevronDown, IconChevronUp } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { TableHead } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { SessionSort, SessionSortKey } from "@/lib/sessions"

interface SessionSortHeaderProps {
  label: string
  sortKey: SessionSortKey
  sort: SessionSort
  align?: "left" | "right"
  onSort: (key: SessionSortKey) => void
}

export function SessionSortHeader({
  label,
  sortKey,
  sort,
  align = "left",
  onSort,
}: SessionSortHeaderProps) {
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
        variant="ghost"
        size="sm"
        onClick={() => onSort(sortKey)}
        className={cn(
          "flex",
          align === "left" ? "-ml-2" : "ml-auto -mr-2"
        )}
      >
        {label}
        {direction === "asc" && (
          <IconChevronUp data-icon="inline-end" />
        )}
        {direction === "desc" && (
          <IconChevronDown data-icon="inline-end" />
        )}
      </Button>
    </TableHead>
  )
}
