"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField, Input, describedBy } from "@/components/ui/Field";
import { FormMessage } from "@/components/account/AuthShell";
import { changePassword } from "@/app/account/actions";
import { INITIAL_FORM_STATE } from "@/app/auth/form-state";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/app/auth/validation";

/**
 * Choose a new password. Asks for the current one unless the session came
 * from a password-reset link (the server makes the same decision again; this
 * prop only decides whether to show the field).
 */
export function PasswordForm({
  email,
  requireCurrent,
}: {
  email: string | null;
  requireCurrent: boolean;
}) {
  const [state, formAction, pending] = useActionState(changePassword, INITIAL_FORM_STATE);
  const errors = state.fieldErrors;
  const hint = `At least ${PASSWORD_MIN} characters.`;

  if (state.status === "success" && state.message) {
    return (
      <div className="space-y-6">
        <FormMessage tone="success">{state.message}</FormMessage>
        <Link
          href="/account"
          className="inline-flex min-h-11 items-center text-sm text-gold-300 underline-offset-4 hover:underline"
        >
          Back to your account
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Lets password managers file the new password under the right account. */}
      {email ? (
        <input
          type="email"
          name="username"
          autoComplete="username"
          value={email}
          readOnly
          hidden
        />
      ) : null}

      {requireCurrent ? (
        <FormField
          id="current_password"
          label="Current password"
          error={errors.current_password}
        >
          <Input
            id="current_password"
            name="current_password"
            type="password"
            autoComplete="current-password"
            required
            invalid={Boolean(errors.current_password)}
            aria-describedby={describedBy(
              "current_password",
              null,
              errors.current_password,
            )}
          />
        </FormField>
      ) : null}

      <FormField
        id="new_password"
        label="New password"
        hint={hint}
        error={errors.new_password}
      >
        <Input
          id="new_password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          invalid={Boolean(errors.new_password)}
          aria-describedby={describedBy("new_password", hint, errors.new_password)}
        />
      </FormField>

      <FormField
        id="confirm_password"
        label="Confirm new password"
        error={errors.confirm_password}
      >
        <Input
          id="confirm_password"
          name="confirm_password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          invalid={Boolean(errors.confirm_password)}
          aria-describedby={describedBy(
            "confirm_password",
            null,
            errors.confirm_password,
          )}
        />
      </FormField>

      {state.status === "error" && state.message ? (
        <FormMessage tone="error">{state.message}</FormMessage>
      ) : null}

      <Button type="submit" loading={pending} className="w-full">
        Change password
      </Button>
    </form>
  );
}
