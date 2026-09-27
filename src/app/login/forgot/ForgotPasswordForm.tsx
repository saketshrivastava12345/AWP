"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
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

      <p className="mt-7 text-xs leading-relaxed text-ink-500">
        The link works once and expires after a short while. Remembered it after all?{" "}
        <Link
          href="/login"
          className="text-gold-300 underline-offset-4 hover:text-gold-200 hover:underline"
        >
          Back to sign in
        </Link>
        .
      </p>
    </div>
  );
}
