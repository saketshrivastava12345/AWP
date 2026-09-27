"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { ChevronDown } from "lucide-react";
import { FormField, Input, Textarea, describedBy } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import { useFieldError } from "./ActionForm";

/**
 * Labelled admin form controls. Each one reads its own error from the
 * enclosing ActionForm, so a server-rendered form can place them freely.
 * Values are uncontrolled (defaultValue) so forms also post without JS.
 */

type Base = {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  /** Overrides the generated id (for labels elsewhere). */
  id?: string;
};

/** Runs `onReset` when the enclosing form is reset (e.g. after "add" succeeds). */
function useFormReset(ref: RefObject<HTMLInputElement | null>, onReset: () => void) {
  const callback = useRef(onReset);
  useEffect(() => {
    callback.current = onReset;
  });
  useEffect(() => {
    const form = ref.current?.form;
    if (!form) return;
    const handler = () => callback.current();
    form.addEventListener("reset", handler);
    return () => form.removeEventListener("reset", handler);
  }, [ref]);
}

function useFieldId(name: string, id?: string) {
  const generated = useId();
  return id ?? `${generated}-${name}`;
}

export function TextField({
  name,
  label,
  hint,
  required,
  className,
  disabled,
  id,
  defaultValue,
  value,
  placeholder,
  type = "text",
  inputMode,
  autoComplete = "off",
  maxLength,
  unit,
  mono = false,
  onChange,
}: Base & {
  defaultValue?: string | number | null;
  /** Controlled value; pair with onChange. */
  value?: string;
  placeholder?: string;
  type?: "text" | "url" | "date" | "number" | "search" | "email";
  inputMode?: "text" | "decimal" | "numeric" | "url";
  autoComplete?: string;
  maxLength?: number;
  unit?: string;
  mono?: boolean;
  onChange?: (value: string) => void;
}) {
  const fieldId = useFieldId(name, id);
  const error = useFieldError(name);
  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        <Input
          id={fieldId}
          name={name}
          type={type}
          inputMode={inputMode}
          {...(value !== undefined ? { value } : { defaultValue: defaultValue ?? "" })}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          disabled={disabled}
          invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
          className={cn(
            mono && "tabular font-mono",
            unit && "pr-14",
            type === "date" && "[color-scheme:dark]",
          )}
        />
        {unit ? (
          <span
            className="pointer-events-none absolute inset-y-0 right-3 flex items-center font-mono text-xs text-ink-500"
            aria-hidden="true"
          >
            {unit}
          </span>
        ) : null}
      </div>
    </FormField>
  );
}

/**
 * A number typed as text: grouping separators ("2,80,00,000") are accepted
 * and validated on the server, which a type="number" input would mangle.
 */
export function NumberField(
  props: Omit<Parameters<typeof TextField>[0], "type" | "inputMode">,
) {
  return <TextField {...props} inputMode="decimal" mono />;
}

export function TextareaField({
  name,
  label,
  hint,
  required,
  className,
  disabled,
  id,
  defaultValue,
  rows = 4,
  maxLength,
  placeholder,
}: Base & {
  defaultValue?: string | null;
  rows?: number;
  maxLength?: number;
  placeholder?: string;
}) {
  const fieldId = useFieldId(name, id);
  const error = useFieldError(name);
  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <Textarea
        id={fieldId}
        name={name}
        rows={rows}
        defaultValue={defaultValue ?? ""}
        maxLength={maxLength}
        placeholder={placeholder}
        disabled={disabled}
        invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
      />
    </FormField>
  );
}

export type FieldOption = { value: string; label: string; disabled?: boolean };
export type FieldOptionGroup = { label: string; options: FieldOption[] };

const SELECT_CLASSES =
  "h-11 w-full min-w-0 appearance-none rounded-sm border border-line-strong bg-surface-1 pr-9 pl-3 " +
  "text-sm text-ink-100 transition-colors duration-(--duration-fast) hover:border-ink-500 " +
  "focus-visible:border-gold-500 disabled:cursor-not-allowed disabled:opacity-50 " +
  "aria-[invalid=true]:border-signal-negative";

export function SelectField({
  name,
  label,
  hint,
  required,
  className,
  disabled,
  id,
  defaultValue,
  value,
  options = [],
  groups,
  placeholder,
  onChange,
}: Base & {
  defaultValue?: string | null;
  /** Controlled value (for cascading selects). */
  value?: string;
  options?: FieldOption[];
  groups?: FieldOptionGroup[];
  /** First, empty option — e.g. "Not recorded". */
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  const fieldId = useFieldId(name, id);
  const error = useFieldError(name);
  const controlled = value !== undefined;
  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <div className="relative">
        <select
          id={fieldId}
          name={name}
          disabled={disabled}
          {...(controlled ? { value } : { defaultValue: defaultValue ?? "" })}
          onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={SELECT_CLASSES}
        >
          {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
          {groups?.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                >
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
      </div>
    </FormField>
  );
}

export function CheckboxField({
  name,
  label,
  hint,
  defaultChecked,
  className,
  disabled,
  value = "true",
}: {
  name: string;
  label: ReactNode;
  hint?: ReactNode;
  defaultChecked?: boolean;
  className?: string;
  disabled?: boolean;
  value?: string;
}) {
  const id = useFieldId(name);
  const error = useFieldError(name);
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-100"
      >
        <input
          id={id}
          type="checkbox"
          name={name}
          value={value}
          defaultChecked={defaultChecked}
          disabled={disabled}
          aria-describedby={describedBy(id, hint, error)}
          aria-invalid={error ? true : undefined}
          className="size-4 shrink-0 cursor-pointer accent-gold-500"
        />
        <span>{label}</span>
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="-mt-1 pl-7 text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="pl-7 text-xs text-signal-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** A required either/or question with no default answer. */
export function RadioQuestion({
  name,
  legend,
  hint,
  options,
  defaultValue,
  className,
}: {
  name: string;
  legend: ReactNode;
  hint?: ReactNode;
  options: { value: string; label: string; description?: string }[];
  defaultValue?: string | null;
  className?: string;
}) {
  const id = useFieldId(name);
  const error = useFieldError(name);
  return (
    <fieldset
      className={cn("flex min-w-0 flex-col gap-2", className)}
      aria-describedby={describedBy(id, hint, error)}
      aria-invalid={error ? true : undefined}
    >
      <legend className="text-label">
        {legend}
        <span className="ml-1 text-gold-400" aria-hidden="true">
          *
        </span>
      </legend>
      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-sm border px-3 py-3 text-sm transition-colors",
              "border-line-strong hover:border-ink-500 has-[:checked]:border-gold-600 has-[:checked]:bg-gold-500/5",
              error && "border-signal-negative/60",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              defaultChecked={defaultValue === option.value}
              required
              className="mt-0.5 size-4 shrink-0 accent-gold-500"
            />
            <span className="min-w-0">
              <span className="block text-ink-100">{option.label}</span>
              {option.description ? (
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                  {option.description}
                </span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-signal-negative">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

/**
 * A slug field that follows another field ("Model S Plaid" -> "model-s-plaid")
 * until the admin edits it by hand. Suggestion only; the server validates.
 */
export function SlugField({
  name,
  label = "Slug",
  sourceValue,
  defaultValue,
  hint = "Lowercase letters, digits and single hyphens. Used in the page address.",
  required = true,
  className,
}: {
  name: string;
  label?: string;
  /** The current value of the field the slug follows. */
  sourceValue: string;
  defaultValue?: string | null;
  hint?: ReactNode;
  required?: boolean;
  className?: string;
}) {
  const fieldId = useFieldId(name);
  const error = useFieldError(name);
  const [edited, setEdited] = useState(Boolean(defaultValue));
  const [value, setValue] = useState(defaultValue ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  useFormReset(inputRef, () => {
    setEdited(Boolean(defaultValue));
    setValue(defaultValue ?? "");
  });
  const shown = edited ? value : slugSuggestion(sourceValue);
  return (
    <FormField
      id={fieldId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      className={className}
    >
      <input ref={inputRef} type="hidden" aria-hidden="true" />
      <Input
        id={fieldId}
        name={name}
        value={shown}
        onChange={(event) => {
          setEdited(true);
          setValue(event.currentTarget.value);
        }}
        autoComplete="off"
        spellCheck={false}
        invalid={Boolean(error)}
        aria-required={required || undefined}
        aria-describedby={describedBy(fieldId, hint, error)}
        className="font-mono"
      />
    </FormField>
  );
}

function slugSuggestion(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** A titled group of fields with a hairline rule. */
export function FieldSet({
  legend,
  description,
  children,
  className,
  columns = 2,
}: {
  legend: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3 | 4;
}) {
  return (
    <fieldset className={cn("min-w-0 border-t border-line pt-5", className)}>
      <legend className="float-left mb-4 w-full font-display text-micro tracking-hud text-ink-200 uppercase">
        {legend}
      </legend>
      {description ? (
        <p className="clear-left mb-5 max-w-3xl text-xs leading-relaxed text-ink-500">
          {description}
        </p>
      ) : null}
      <div
        className={cn(
          "clear-left grid gap-x-5 gap-y-4 [&>*]:min-w-0",
          columns === 2 && "sm:grid-cols-2",
          columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
          columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {children}
      </div>
    </fieldset>
  );
}

/** A name field and the slug that follows it, side by side. */
export function NameSlugFields({
  nameField = "name",
  slugField = "slug",
  nameLabel = "Name",
  slugLabel = "Slug",
  defaultName,
  defaultSlug,
  namePlaceholder,
}: {
  nameField?: string;
  slugField?: string;
  nameLabel?: string;
  slugLabel?: string;
  defaultName?: string | null;
  defaultSlug?: string | null;
  namePlaceholder?: string;
}) {
  const [name, setName] = useState(defaultName ?? "");
  const anchor = useRef<HTMLInputElement>(null);
  useFormReset(anchor, () => setName(defaultName ?? ""));
  return (
    <>
      <input ref={anchor} type="hidden" aria-hidden="true" />
      <TextField
        name={nameField}
        label={nameLabel}
        required
        defaultValue={defaultName}
        onChange={setName}
        placeholder={namePlaceholder}
      />
      <SlugField
        name={slugField}
        label={slugLabel}
        sourceValue={name}
        defaultValue={defaultSlug}
      />
    </>
  );
}
