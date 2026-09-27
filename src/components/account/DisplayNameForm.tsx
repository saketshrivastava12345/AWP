"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, describedBy } from "@/components/ui/Field";
import { updateDisplayName } from "@/app/account/actions";
import { INITIAL_FORM_STATE } from "@/app/auth/form-state";
import { DISPLAY_NAME_MAX } from "@/app/auth/validation";

/** Edit the profile's display name. Works without JavaScript. */
export function DisplayNameForm({ initialName }: { initialName: string }) {
  const [state, formAction, pending] = useActionState(updateDisplayName, {
    ...INITIAL_FORM_STATE,
    values: { display_name: initialName },
  });
  const error =
    state.fieldErrors.display_name ?? (state.status === "error" ? state.message : null);
  const hint = `Shown in the navigation. Up to ${DISPLAY_NAME_MAX} characters.`;

  return (
    <form action={formAction} className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <FormField
        id="display_name"
        label="Display name"
        hint={hint}
        error={error}
        className="flex-1"
      >
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
        />
      </FormField>
      <div className="flex flex-col gap-2 sm:pt-[21px]">
        <Button type="submit" variant="secondary" loading={pending}>
          Save name
        </Button>
        {state.status === "success" && state.message ? (
          <p role="status" className="text-xs text-signal-positive">
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
