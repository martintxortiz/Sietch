"use client"

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group"
import type { StrategyOption } from "@/lib/strategies"

import { TagCombobox } from "./tag-combobox"

export interface SessionFormValues {
  name: string
  strategyId: string
  pair: string
  tags: string[]
  accountSize: string
}

export function SessionFields({
  id,
  strategies,
  tagOptions,
  value,
  onChange,
}: {
  id: string
  strategies: StrategyOption[]
  tagOptions: string[]
  value: SessionFormValues
  onChange: (value: SessionFormValues) => void
}) {
  const selectedStrategy = strategies.find(
    (strategy) => strategy.id === value.strategyId,
  ) ?? null

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          className="h-10 px-3"
          id={`${id}-name`}
          maxLength={120}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          required
          value={value.name}
        />
      </Field>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-strategy`}>Strategy</FieldLabel>
          <Combobox
            autoHighlight
            isItemEqualToValue={(strategy, selected) => strategy.id === selected.id}
            itemToStringLabel={(strategy) => strategy.name}
            itemToStringValue={(strategy) => strategy.id}
            items={strategies}
            onValueChange={(strategy) => onChange({
              ...value,
              strategyId: strategy?.id ?? "",
            })}
            value={selectedStrategy}
          >
            <ComboboxInput id={`${id}-strategy`} placeholder="Find a strategy" />
            <ComboboxContent>
              <ComboboxList>
                {strategies.map((strategy) => (
                  <ComboboxItem key={strategy.id} value={strategy}>
                    {strategy.name}
                  </ComboboxItem>
                ))}
              </ComboboxList>
              <ComboboxEmpty>No strategies found.</ComboboxEmpty>
            </ComboboxContent>
          </Combobox>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-pair`}>Pair</FieldLabel>
          <Input
            className="h-10 px-3"
            id={`${id}-pair`}
            maxLength={40}
            onChange={(event) => onChange({ ...value, pair: event.target.value })}
            required
            value={value.pair}
          />
        </Field>
      </FieldGroup>
      <FieldGroup className="grid items-start gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor={`${id}-account-size`}>Account size</FieldLabel>
          <InputGroup className="h-10">
            <InputGroupAddon>$</InputGroupAddon>
            <InputGroupInput
              id={`${id}-account-size`}
              inputMode="decimal"
              min="0.01"
              onChange={(event) => onChange({ ...value, accountSize: event.target.value })}
              placeholder="From XLSX"
              step="any"
              type="number"
              value={value.accountSize}
            />
          </InputGroup>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-tags`}>Tags</FieldLabel>
          <TagCombobox
            id={`${id}-tags`}
            onChange={(tags) => onChange({ ...value, tags })}
            options={tagOptions}
            value={value.tags}
          />
        </Field>
      </FieldGroup>
    </FieldGroup>
  )
}
