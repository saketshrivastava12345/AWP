"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import {
  ActionForm,
  SubmitButton,
  useAdminForm,
  type ServerFormAction,
} from "./ActionForm";

type Hidden = Record<string, string>;

function HiddenFields({ fields }: { fields: Hidden }) {
  return (
    <>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
    </>
  );
}

/**
 * A one-button form for a small, reversible action (publish, mark verified,
 * set primary). Works without JavaScript; with it, the result is a toast.
 */
export function InlineAction({
  action,
  fields,
  children,
  variant = "secondary",
  size = "sm",
  className,
  label,
}: {
  action: ServerFormAction;
  fields: Hidden;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  className?: string;
  /** Accessible name when the visible text is ambiguous out of context. */
  label?: string;
}) {
  return (
    <ActionForm action={action} status={false} className={className}>
      <HiddenFields fields={fields} />
      <InlineSubmit variant={variant} size={size} label={label}>
        {children}
      </InlineSubmit>
    </ActionForm>
  );
}

function InlineSubmit({
  children,
  variant,
  size,
  label,
}: {
  children: ReactNode;
  variant: ButtonVariant;
  size: "sm" | "md";
  label?: string;
}) {
  const { pending } = useAdminForm();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={pending}
      aria-label={label}
    >
      {children}
    </Button>
  );
}

/**
 * A destructive action behind a confirmation dialog. With `confirmText`, the
 * admin must type that text before the button enables — the server checks it
 * again. The dialog closes when the action succeeds.
 */
export function ConfirmAction({
  action,
  fields,
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  confirmText,
  triggerVariant = "danger",
  triggerSize = "sm",
  triggerLabel,
  children,
}: {
  action: ServerFormAction;
  fields: Hidden;
  trigger: ReactNode;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  confirmText?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: "sm" | "md";
  triggerLabel?: string;
  /** Extra fields inside the dialog (e.g. a date). */
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const close = useCallback(() => {
    setOpen(false);
    setTyped("");
  }, []);

  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
      >
        {trigger}
      </Button>
      <Dialog open={open} onClose={close} title={title} size="sm">
        <ActionForm action={action} onSuccess={close}>
          <HiddenFields fields={fields} />
          <div className="text-sm leading-relaxed text-ink-300">{description}</div>
          {children ? <div className="mt-4 flex flex-col gap-4">{children}</div> : null}
          {confirmText ? (
            <label className="mt-5 block">
              <span className="text-label">
                Type{" "}
                <span className="font-mono tracking-normal text-ink-100 normal-case">
                  {confirmText}
                </span>{" "}
                to confirm
              </span>
              <Input
                name="confirmation"
                value={typed}
                onChange={(event) => setTyped(event.currentTarget.value)}
                autoComplete="off"
                spellCheck={false}
                className="mt-2 font-mono"
              />
            </label>
          ) : null}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <SubmitButton
              variant="danger"
              size="sm"
              disabled={confirmText !== undefined && typed !== confirmText}
            >
              {confirmLabel}
            </SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}

/**
 * A button that opens a dialog holding a form bound to a server action; the
 * dialog closes when the action succeeds. `children` are the form's fields
 * and may be rendered on the server.
 */
export function FormDialog({
  action,
  trigger,
  title,
  description,
  children,
  submitLabel = "Save",
  triggerLabel,
  triggerVariant = "ghost",
  triggerSize = "sm",
  size = "md",
}: {
  action: ServerFormAction;
  trigger: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  submitLabel?: string;
  triggerLabel?: string;
  triggerVariant?: ButtonVariant;
  triggerSize?: "sm" | "md";
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <Button
        type="button"
        variant={triggerVariant}
        size={triggerSize}
        onClick={() => setOpen(true)}
        aria-label={triggerLabel}
        aria-haspopup="dialog"
      >
        {trigger}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={title}
        description={description}
        size={size}
      >
        <ActionForm action={action} onSuccess={close}>
          <div className="flex flex-col gap-4">{children}</div>
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={close}>
              Cancel
            </Button>
            <SubmitButton size="sm">{submitLabel}</SubmitButton>
          </div>
        </ActionForm>
      </Dialog>
    </>
  );
}
