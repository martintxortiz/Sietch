"use client"

import { IconSelector } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface TradeSessionOption {
  id: string
  name: string
}

export function TradeSessionSelector({
  sessions,
  value,
  onChange,
}: {
  sessions: TradeSessionOption[]
  value: string
  onChange: (value: string) => void
}) {
  const label = sessions.find((session) => session.id === value)?.name ?? "All sessions"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button className="ml-auto h-10 min-w-48 justify-between !px-5" size="lg" />}
      >
        <span className="max-w-48 truncate">{label}</span>
        <IconSelector data-icon="inline-end" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 rounded-3xl bg-muted py-1.5" sideOffset={1}>
        <ScrollArea className="max-h-72">
          <DropdownMenuGroup>
            <DropdownMenuRadioGroup onValueChange={onChange} value={value}>
              <DropdownMenuRadioItem value="all">All sessions</DropdownMenuRadioItem>
              {sessions.map((session) => (
                <DropdownMenuRadioItem key={session.id} value={session.id}>
                  <span className="truncate">{session.name}</span>
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
