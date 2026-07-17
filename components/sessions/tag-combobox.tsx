"use client"

import { IconPlus } from "@tabler/icons-react"
import { useMemo, useState } from "react"

import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from "@/components/ui/combobox"

export function TagCombobox({
  id,
  onChange,
  options,
  value,
}: {
  id?: string
  onChange: (value: string[]) => void
  options: string[]
  value: string[]
}) {
  const anchor = useComboboxAnchor()
  const [query, setQuery] = useState("")
  const typed = query.trim()
  const available = useMemo(
    () => unique([...options, ...value]),
    [options, value],
  )
  const existing = available.find(
    (tag) => tag.toLocaleLowerCase() === typed.toLocaleLowerCase(),
  )
  const canCreate = Boolean(typed && !existing)
  const items = canCreate ? [typed, ...available] : available

  return (
    <Combobox
      autoHighlight
      inputValue={query}
      items={items}
      multiple
      onInputValueChange={setQuery}
      onValueChange={(tags) => {
        onChange(unique(tags))
        setQuery("")
      }}
      value={value}
    >
      <ComboboxChips ref={anchor}>
        {value.map((tag) => (
          <ComboboxChip key={tag}>{tag}</ComboboxChip>
        ))}
        <ComboboxChipsInput
          id={id}
          placeholder={value.length ? "Add tag" : "Select or create tags"}
        />
      </ComboboxChips>
      <ComboboxContent anchor={anchor}>
        <ComboboxList>
          {items.map((tag) => (
            <ComboboxItem key={tag} value={tag}>
              {canCreate && tag === typed ? (
                <span className="flex items-center gap-2">
                  <IconPlus />
                  Create “{typed}”
                </span>
              ) : tag}
            </ComboboxItem>
          ))}
        </ComboboxList>
        <ComboboxEmpty>No tags found.</ComboboxEmpty>
      </ComboboxContent>
    </Combobox>
  )
}

function unique(values: string[]) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right))
}
