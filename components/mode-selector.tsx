"use client";

import {
  IconAnalyzeFilled,
  IconBookFilled,
  IconCaretUpDownFilled,
  IconCreditCardFilled,
} from "@tabler/icons-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type AppMode = "backtest" | "journal" | "wallet";

const modes = [
  {
    value: "backtest",
    label: "BACKTEST",
    icon: IconAnalyzeFilled,
  },
  { value: "journal", label: "JOURNAL", icon: IconBookFilled },
  { value: "wallet", label: "WALLET", icon: IconCreditCardFilled },
] as const;

interface ModeSelectorProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
}

export function ModeSelector({ mode, onModeChange }: ModeSelectorProps) {
  const [open, setOpen] = useState(false);
  const selectedMode = modes.find(({ value }) => value === mode) ?? modes[0];
  const SelectedIcon = selectedMode.icon;

  function selectMode(nextMode: AppMode) {
    setOpen(false);
    if (nextMode === mode) return;
    onModeChange(nextMode);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        aria-label={`Mode: ${selectedMode.label}`}
        render={
          <Button
            variant="ghost"
            className="sidebar-shell-reveal group/mode size-11 cursor-pointer justify-center !p-3 !capitalize sm:h-10 sm:w-full sm:justify-start text-foreground/80"
          />
        }
      >
        <span className="hidden size-4 sm:inline-grid">
          <SelectedIcon
            data-icon="inline-start"
            className="col-start-1 row-start-1 transition-opacity duration-150 group-hover/mode:opacity-0 group-data-popup-open/mode:opacity-0"
          />
          <IconCaretUpDownFilled
            data-icon="inline-start"
            className="col-start-1 row-start-1 opacity-0 transition-opacity duration-150 group-hover/mode:opacity-100 group-data-popup-open/mode:opacity-100"
          />
        </span>
        <IconCaretUpDownFilled
          data-icon="inline-start"
          className="sm:hidden"
        />
        <span className="hidden pl-1.5 sm:inline">{selectedMode.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={1}
        className="w-44 sm:w-(--anchor-width)"
      >
        <DropdownMenuGroup>
          <DropdownMenuRadioGroup
            value={mode}
            onValueChange={(value) => selectMode(value as AppMode)}
          >
            {modes.map(({ value, label, icon: Icon }) => (
              <DropdownMenuRadioItem
                key={value}
                value={value}
                closeOnClick
              >
                <Icon />
                <span>{label}</span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
