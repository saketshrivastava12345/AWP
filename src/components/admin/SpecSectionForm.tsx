import type { ReactNode } from "react";
import {
  SECTION_SCHEMAS,
  type SectionField,
  type SectionKey,
} from "@/lib/admin/sections";
import { ActionForm, SubmitButton } from "./ActionForm";
import { FieldSet, NumberField, SelectField, TextareaField, TextField } from "./fields";
import type { ServerFormAction } from "./ActionForm";

type RecordLike = Record<string, unknown> | null;

function stringValue(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return String(value);
}

/** Renders one schema field as the matching admin control. */
export function SchemaField({ field, value }: { field: SectionField; value: unknown }) {
  const defaultValue = stringValue(value);
  switch (field.kind) {
    case "number":
      return (
        <NumberField
          name={field.name}
          label={field.label}
          unit={field.unit}
          hint={field.hint}
          defaultValue={defaultValue}
        />
      );
    case "choice":
      return (
        <SelectField
          name={field.name}
          label={field.label}
          hint={field.hint}
          required={field.required}
          placeholder={field.required ? "Choose" : "Not recorded"}
          defaultValue={defaultValue}
          options={field.options}
        />
      );
    case "textarea":
      return (
        <TextareaField
          name={field.name}
          label={field.label}
          hint={field.hint}
          defaultValue={defaultValue}
          rows={3}
          className="sm:col-span-2 lg:col-span-3"
        />
      );
    default:
      return (
        <TextField
          name={field.name}
          label={field.label}
          hint={field.hint}
          required={field.required}
          defaultValue={defaultValue}
        />
      );
  }
}

/**
 * A specification section as a form, generated from the same schema that
 * validates it on the server. Empty fields are saved as NULL.
 */
export function SpecSectionForm({
  section,
  action,
  record,
  hidden,
  submitLabel,
  today,
  footer,
}: {
  section: SectionKey;
  action: ServerFormAction;
  record: RecordLike;
  hidden: Record<string, string>;
  submitLabel: string;
  today: string;
  footer?: ReactNode;
}) {
  const schema = SECTION_SCHEMAS[section];
  const value = (name: string) => (record ? record[name] : null);
  return (
    <ActionForm action={action} className="flex flex-col gap-8" aria-label={schema.title}>
      {Object.entries(hidden).map(([name, hiddenValue]) => (
        <input key={name} type="hidden" name={name} value={hiddenValue} />
      ))}
      <FieldSet legend="Figures" description={schema.description} columns={3}>
        {schema.fields.map((field) => (
          <SchemaField key={field.name} field={field} value={value(field.name)} />
        ))}
      </FieldSet>
      <FieldSet
        legend="Source"
        description="Required once any figure is recorded. The verification date is when an editor last checked these figures against the source."
        columns={3}
      >
        <TextField
          name="source"
          label="Source"
          defaultValue={stringValue(value("source"))}
        />
        <TextField
          name="source_url"
          label="Source URL"
          type="url"
          defaultValue={stringValue(value("source_url"))}
        />
        <TextField
          name="last_verified_at"
          label="Last verified"
          type="date"
          defaultValue={stringValue(value("last_verified_at"))}
          hint={`Today is ${today}.`}
        />
      </FieldSet>
      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <SubmitButton>{submitLabel}</SubmitButton>
        {footer}
      </div>
    </ActionForm>
  );
}
