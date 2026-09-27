"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, describedBy } from "@/components/ui/Field";
import { updateDisplayName } from "@/app/account/actions";
import { INITIAL_FORM_STATE } from "@/app/auth/form-state";
import { DISPLAY_NAME_MAX } from "@/app/auth/validation";
import { cn } from "@/lib/utils";

/**
 * Edit the profile's display name. Works without JavaScript.
 *
 * Laid out as a settings row: the label in the first column, the field and
 * its Save button in the second (`rowClassName` sets the grid, so the row
 * lines up with its neighbours).
 */
export function DisplayNameForm({
  initialName,
  rowClassName,
}: {
  initialName: string;
  rowClassName?: string;
}) {
  const [state, formAction, pending] = useActionState(updateDisplayName, {
    ...INITIAL_FORM_STATE,
    values: { display_name: initialName },
  });
  const error =
    state.fieldErrors.display_name ?? (state.status === "error" ? state.message : null);
  const hint = `Shown in the navigation. Up to ${DISPLAY_NAME_MAX} characters.`;
  const saved = state.status === "success" && state.message;

  return (
    <form action={formAction} className={cn("grid gap-2", rowClassName)}>
      <label htmlFor="display_name" className="text-label sm:pt-3.5">
        Display name
      </label>
      <div className="min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="display_name"
            name="display_name"
            type="text"
            autoComplete="nickname"
            required
            maxLength={DISPLAY_NAME_MAX * 2}
            defaultValue={state.values.display_name ?? initialName}
            invalid={Boolean(error)}
            aria-describedby={describedBy("display_name", hint, error)}
            className="sm:max-w-sm"
          />
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            className="shrink-0 self-start"
          >
            Save
          </Button>
        </div>
        <p id="display_name-hint" className="mt-2 text-caption">
          {hint}
        </p>
        {error ? (
          <p
            id="display_name-error"
            role="alert"
            className="mt-2 text-caption text-signal-negative"
          >
            {error}
          </p>
        ) : null}
        {saved ? (
          <p role="status" className="mt-2 text-caption text-signal-positive">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
