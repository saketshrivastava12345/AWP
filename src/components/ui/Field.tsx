import {
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Form building blocks: a labelled control with an optional hint and error,
 * wired together with ids so screen readers announce all three.
 *
 * Server-component safe (no hooks): pass an explicit `id`.
 */

const CONTROL =
  "w-full min-w-0 rounded-sm border bg-surface-1 px-3 text-sm text-ink-100 " +
  "placeholder:text-ink-600 transition-colors duration-(--duration-fast) " +
  "hover:border-ink-500 focus-visible:border-gold-500 " +
  "disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-signal-negative";

export function Input({
  className,
  invalid,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(CONTROL, "h-11 border-line-strong", className)}
      {...props}
    />
  );
}

export function Textarea({
  className,
  invalid,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL,
        "min-h-24 border-line-strong py-2.5 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

export function FormField({
  id,
  label,
  hint,
  error,
  required,
  className,
  children,
}: {
  /** The id of the control inside; hint and error ids derive from it. */
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  /** The control. Give it `id`, and `aria-describedby={describedBy(id, …)}`. */
  children: ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-label">
        {label}
        {required ? (
          <span className="ml-1 text-gold-400" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-ink-500">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-signal-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** The aria-describedby value for a control inside FormField. */
export function describedBy(
  id: string,
  hint?: unknown,
  error?: unknown,
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}
