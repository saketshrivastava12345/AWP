"use server";

import { refresh } from "next/cache";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getAuthUser,
  getPasswordChangeContext,
  verifyPassword,
} from "@/lib/queries/auth";
import { classifyAuthError } from "@/app/auth/errors";
import {
  AUTH_MESSAGES,
  formError,
  formSuccess,
  type FormState,
} from "@/app/auth/form-state";
import {
  readField,
  validateDisplayName,
  validateExistingPassword,
  validateNewPassword,
} from "@/app/auth/validation";

/*
 * Account settings. Each action re-verifies the user with getUser() and acts
 * only on that user's own rows; RLS enforces the same thing underneath.
 */

/**
 * Change the display name. Only `display_name` is ever sent: `role` is not
 * writable from here (and a database trigger reverts any attempt anyway).
 */
export async function updateDisplayName(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const raw = readField(formData, "display_name");
  const values = { display_name: raw.slice(0, 200) };
  const name = validateDisplayName(raw);
  if (!name.ok)
    return formError(null, { values, fieldErrors: { display_name: name.error } });

  const user = await getAuthUser();
  if (!user) return formError(AUTH_MESSAGES.sessionEnded, { values });

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: name.value })
      .eq("id", user.id)
      .select("display_name")
      .maybeSingle();
    if (error || !data) {
      if (error) console.error("updateDisplayName failed:", error.message);
      return formError("Your display name could not be saved. Please try again.", {
        values,
      });
    }
  } catch (error) {
    console.error("updateDisplayName threw:", error);
    return formError(AUTH_MESSAGES.unavailable, { values });
  }

  // The navbar shows the name; re-render it with this response.
  refresh();
  return formSuccess("Display name saved.", { display_name: name.value });
}

/**
 * Change the password.
 *
 * The current password is required, unless this session came from a
 * password-reset link in the last half hour (the visitor is here because they
 * do not know it). It is checked on a throwaway client so the visitor's own
 * session is untouched. After the change, other sessions are signed out.
 */
export async function changePassword(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const context = await getPasswordChangeContext();
  if (!context) return formError(AUTH_MESSAGES.sessionEnded);

  const fieldErrors: FormState["fieldErrors"] = {};
  const nextPassword = validateNewPassword(readField(formData, "new_password"));
  if (!nextPassword.ok) fieldErrors.new_password = nextPassword.error;
  else if (readField(formData, "confirm_password") !== nextPassword.value) {
    fieldErrors.confirm_password = "The two new passwords do not match.";
  }

  let current: string | null = null;
  if (!context.viaEmailLink) {
    const checked = validateExistingPassword(readField(formData, "current_password"));
    if (checked.ok) current = checked.value;
    else fieldErrors.current_password = "Enter your current password.";
  }
  if (!nextPassword.ok || Object.keys(fieldErrors).length > 0)
    return formError(null, { fieldErrors });

  if (current !== null) {
    if (!context.user.email) return formError(AUTH_MESSAGES.unavailable);
    const check = await verifyPassword(context.user.email, current);
    if (check === "invalid") {
      return formError(null, {
        fieldErrors: { current_password: "That is not your current password." },
      });
    }
    if (check === "rate_limited") return formError(AUTH_MESSAGES.rateLimited);
    if (check === "unavailable") return formError(AUTH_MESSAGES.unavailable);
  }

  let othersSignedOut = false;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password: nextPassword.value });
    if (error) {
      const { kind, code } = classifyAuthError(error);
      if (code === "same_password") {
        return formError(null, {
          fieldErrors: {
            new_password: "Choose a password different from your current one.",
          },
        });
      }
      if (kind === "weak_password") {
        return formError(null, {
          fieldErrors: { new_password: AUTH_MESSAGES.weakPassword },
        });
      }
      if (code === "reauthentication_needed") {
        return formError(
          "For your security, sign out and sign in again, then change your password.",
        );
      }
      if (kind === "rate_limited") return formError(AUTH_MESSAGES.rateLimited);
      if (error.status === 401 || error.status === 403) {
        return formError(AUTH_MESSAGES.sessionEnded);
      }
      console.error("changePassword failed:", error.status, error.code);
      return formError(AUTH_MESSAGES.unavailable);
    }

    const { error: othersError } = await supabase.auth.signOut({ scope: "others" });
    othersSignedOut = !othersError;
  } catch (error) {
    console.error("changePassword threw:", error);
    return formError(AUTH_MESSAGES.unavailable);
  }

  return formSuccess(
    othersSignedOut
      ? "Password changed. Any other devices signed in to this account have been signed out."
      : "Password changed.",
  );
}
