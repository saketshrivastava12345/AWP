"use client";

import {
  createContext,
  startTransition,
  useActionState,
  useContext,
  useEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { Button, type ButtonVariant } from "@/components/ui/Button";
import { IDLE_STATE, type ActionState } from "@/lib/admin/action-state";
import { cn } from "@/lib/utils";

export type ServerFormAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type FormContextValue = { state: ActionState; pending: boolean };

const FormContext = createContext<FormContextValue>({
  state: IDLE_STATE,
  pending: false,
});

/** Supplies field errors and a pending flag to fields in a hand-built form. */
export function FormStateProvider({
  state,
  pending,
  children,
}: {
  state: ActionState;
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <FormContext.Provider value={{ state, pending }}>{children}</FormContext.Provider>
  );
}

/** The current form's result and pending flag (for fields and buttons inside it). */
export function useAdminForm(): FormContextValue {
  return useContext(FormContext);
}

/** The error for one field of the enclosing form, if any. */
export function useFieldError(name: string): string | null {
  return useContext(FormContext).state.fieldErrors[name] ?? null;
}

/**
 * A form bound to an admin server action.
 *
 * With JavaScript the submission runs in a transition and the admin's input
 * is kept (React would otherwise reset uncontrolled fields after the action);
 * errors appear next to their fields and the outcome is announced as a toast
 * and in the inline status line. Without JavaScript the same form posts to
 * the same server action and the page re-renders with the result.
 */
export function ActionForm({
  action,
  initialState,
  children,
  className,
  resetOnSuccess = false,
  toast: showToast = true,
  status = true,
  onSuccess,
  id,
  "aria-label": ariaLabel,
}: {
  action: ServerFormAction;
  initialState?: ActionState;
  children: ReactNode;
  className?: string;
  /** Clear the fields after a successful save (for "add" forms). */
  resetOnSuccess?: boolean;
  toast?: boolean;
  /** Show the inline status line under the form. */
  status?: boolean;
  onSuccess?: (state: ActionState) => void;
  id?: string;
  "aria-label"?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState ?? IDLE_STATE);
  const formRef = useRef<HTMLFormElement>(null);
  const announced = useRef(0);
  const push = useToast();

  useEffect(() => {
    if (state.at === 0 || state.at === announced.current) return;
    announced.current = state.at;
    if (showToast && state.message) {
      push({
        title: state.message,
        tone: state.status === "success" ? "success" : "error",
      });
    }
    if (state.status === "success") {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccess?.(state);
    } else if (state.status === "error") {
      // Move keyboard focus to the first invalid field.
      const first = Object.keys(state.fieldErrors)[0];
      if (first) {
        const field = formRef.current?.querySelector<HTMLElement>(
          `[name="${CSS.escape(first)}"]`,
        );
        field?.focus({ preventScroll: false });
      }
    }
  }, [state, showToast, push, resetOnSuccess, onSuccess]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(
      event.currentTarget,
      (event.nativeEvent as SubmitEvent).submitter,
    );
    startTransition(() => formAction(data));
  };

  return (
    <FormContext.Provider value={{ state, pending }}>
      <form
        ref={formRef}
        id={id}
        action={formAction}
        onSubmit={onSubmit}
        noValidate
        aria-label={ariaLabel}
        aria-busy={pending || undefined}
        className={className}
      >
        {children}
        {status ? <FormStatus /> : null}
      </form>
    </FormContext.Provider>
  );
}

/** The outcome of the last submission, announced politely. */
export function FormStatus({ className }: { className?: string }) {
  const { state } = useAdminForm();
  const errorCount = Object.keys(state.fieldErrors).length;
  return (
    <div aria-live="polite" className={cn("min-h-0", className)}>
      {state.status !== "idle" && state.message ? (
        <p
          className={cn(
            "mt-4 flex items-start gap-2 text-sm",
            state.status === "success" ? "text-signal-positive" : "text-signal-negative",
          )}
        >
          {state.status === "success" ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            {state.message}
            {state.status === "error" && errorCount > 1
              ? ` (${errorCount} fields)`
              : null}
          </span>
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  size = "md",
  className,
  name,
  value,
  disabled,
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useAdminForm();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      loading={pending}
      disabled={disabled}
      name={name}
      value={value}
      className={className}
    >
      {children}
    </Button>
  );
}
