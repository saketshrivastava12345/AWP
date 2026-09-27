"use client";

import { useActionState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormField, Input, describedBy } from "@/components/ui/Field";
import { FormMessage } from "@/components/account/AuthShell";
import { requestPasswordReset } from "@/app/auth/actions";
import { INITIAL_FORM_STATE } from "@/app/auth/form-state";

/** Asks for a reset link. The reply never says whether the email has an account. */
export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    INITIAL_FORM_STATE,
  );
  const emailError = state.fieldErrors.email;

  return (
    <div>
      <form action={formAction} className="space-y-5">
        <FormField id="email" label="Email address" error={emailError}>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
            defaultValue={state.values.email ?? ""}
            invalid={Boolean(emailError)}
            aria-describedby={describedBy("email", null, emailError)}
            placeholder="you@example.com"
          />
        </FormField>

        {state.message ? (
          <FormMessage tone={state.status === "error" ? "error" : "success"}>
            {state.message}
          </FormMessage>
        ) : null}

        <Button type="submit" loading={pending} className="w-full">
          {state.status === "success" ? "Send another link" : "Email me a link"}
        </Button>
      </form>

      <p className="mt-8 text-caption">
        The link works once and expires after a short while.
      </p>
      <ButtonLink href="/login" variant="link" size="sm" className="mt-4">
        Back to sign in
      </ButtonLink>
    </div>
  );
}
