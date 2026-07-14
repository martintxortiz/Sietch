"use client"

import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  const strategyItems = strategies.map(({ id: strategyId, name }) => ({
    label: name,
    value: strategyId,
  }))

  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          maxLength={120}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          required
          value={value.name}
        />
      </Field>
      <FieldGroup className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Strategy</FieldLabel>
          <Select
            items={strategyItems}
            onValueChange={(strategyId) => onChange({ ...value, strategyId: strategyId ?? "" })}
            value={value.strategyId}
          >
            <SelectTrigger className="w-full" id={`${id}-strategy`}>
              <SelectValue placeholder="Select strategy" />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              <SelectGroup>
                {strategies.map((strategy) => (
                  <SelectItem key={strategy.id} value={strategy.id}>
                    {strategy.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-pair`}>Pair</FieldLabel>
          <Input
            id={`${id}-pair`}
            maxLength={40}
            onChange={(event) => onChange({ ...value, pair: event.target.value })}
            required
            value={value.pair}
          />
        </Field>
      </FieldGroup>
      <Field>
        <FieldLabel htmlFor={`${id}-account-size`}>Account size</FieldLabel>
        <Input
          id={`${id}-account-size`}
          min="0.01"
          onChange={(event) => onChange({ ...value, accountSize: event.target.value })}
          placeholder="Filled automatically from XLSX"
          step="any"
          type="number"
          value={value.accountSize}
        />
      </Field>
      <Field>
        <FieldLabel>Tags</FieldLabel>
        <TagCombobox
          onChange={(tags) => onChange({ ...value, tags })}
          options={tagOptions}
          value={value.tags}
        />
      </Field>
    </FieldGroup>
  )
}
