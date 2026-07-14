import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function StrategyFields({
  id,
  name,
  description,
  onNameChange,
  onDescriptionChange,
}: {
  id: string
  name: string
  description: string
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
}) {
  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          id={`${id}-name`}
          maxLength={80}
          onChange={(event) => onNameChange(event.target.value)}
          required
          value={name}
        />
      </Field>
      <Field>
        <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
        <Textarea
          id={`${id}-description`}
          maxLength={500}
          onChange={(event) => onDescriptionChange(event.target.value)}
          rows={4}
          value={description}
        />
      </Field>
    </FieldGroup>
  )
}
