"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { IconCheck, IconChevronDown, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

const Combobox = ComboboxPrimitive.Root

function ComboboxInput({
  className,
  disabled = false,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <InputGroup className={cn("h-10", className)}>
      <ComboboxPrimitive.Input
        render={<InputGroupInput disabled={disabled} />}
        {...props}
      />
      <InputGroupAddon className="ml-auto pr-1 pl-0">
        <ComboboxPrimitive.Trigger
          data-slot="combobox-trigger"
          disabled={disabled}
          render={
            <Button
              aria-label="Toggle options"
              className="size-8"
              size="icon-lg"
              type="button"
              variant="ghost"
            />
          }
        >
          <IconChevronDown className="text-muted-foreground" />
        </ComboboxPrimitive.Trigger>
      </InputGroupAddon>
    </InputGroup>
  )
}

function ComboboxContent({
  align = "start",
  alignOffset = 0,
  anchor,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "align" | "alignOffset" | "anchor" | "side" | "sideOffset"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
        side={side}
        sideOffset={sideOffset}
      >
        <ComboboxPrimitive.Popup
          className={cn(
            "relative max-h-(--available-height) w-(--anchor-width) min-w-56 overflow-hidden rounded-3xl bg-muted p-1.5 text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className,
          )}
          data-slot="combobox-content"
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      className={cn("max-h-56 scroll-py-1 overflow-y-auto overscroll-contain", className)}
      data-slot="combobox-list"
      {...props}
    />
  )
}

function ComboboxItem({
  children,
  className,
  ...props
}: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      className={cn(
        "relative flex h-10 w-full cursor-pointer items-center gap-2 rounded-full px-3 pr-9 text-sm font-medium text-muted-foreground outline-hidden select-none transition-colors duration-150 data-highlighted:bg-foreground/15 data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className,
      )}
      data-slot="combobox-item"
      {...props}
    >
      <span className="min-w-0 flex-1 truncate">{children}</span>
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-3 flex size-4 items-center justify-center" />
        }
      >
        <IconCheck />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      className={cn("px-3 py-2 text-sm text-muted-foreground", className)}
      data-slot="combobox-empty"
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> &
  ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 dark:bg-input/30",
        className,
      )}
      data-slot="combobox-chips"
      {...props}
    />
  )
}

function ComboboxChip({
  children,
  className,
  ...props
}: ComboboxPrimitive.Chip.Props) {
  return (
    <ComboboxPrimitive.Chip
      className={cn(
        "flex h-6 w-fit items-center gap-1 rounded-full bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground",
        className,
      )}
      data-slot="combobox-chip"
      {...props}
    >
      {children}
      <ComboboxPrimitive.ChipRemove
        className="-mr-1 opacity-60 transition-opacity hover:opacity-100"
        data-slot="combobox-chip-remove"
        render={
          <Button
            aria-label={`Remove ${String(children)}`}
            className="size-5"
            size="icon-lg"
            type="button"
            variant="ghost"
          />
        }
      >
        <IconX />
      </ComboboxPrimitive.ChipRemove>
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({
  className,
  ...props
}: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      className={cn("min-w-24 flex-1 bg-transparent outline-none", className)}
      data-slot="combobox-chip-input"
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
}
