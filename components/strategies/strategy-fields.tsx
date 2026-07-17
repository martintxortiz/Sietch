import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { TagCombobox } from "@/components/sessions/tag-combobox"

export function StrategyFields({
  id,
  name,
  description,
  tags,
  tagOptions,
  onNameChange,
  onDescriptionChange,
  onTagsChange,
}: {
  id: string
  name: string
  description: string
  tags: string[]
  tagOptions: string[]
  onNameChange: (name: string) => void
  onDescriptionChange: (description: string) => void
  onTagsChange: (tags: string[]) => void
}) {
  return (
    <FieldGroup className="gap-4">
      <Field>
        <FieldLabel htmlFor={`${id}-name`}>Name</FieldLabel>
        <Input
          className="h-10 px-3"
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
      <Field>
        <FieldLabel htmlFor={`${id}-tags`}>Tags</FieldLabel>
        <TagCombobox
          id={`${id}-tags`}
          onChange={onTagsChange}
          options={tagOptions}
          value={tags}
        />
      </Field>
    </FieldGroup>
  )
}
