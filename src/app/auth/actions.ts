"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthApiError, isAuthRetryableFetchError } from "@supabase/supabase-js";
import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";
import { siteConfig } from "@/lib/site-config";
import { rotateAuthEpoch } from "./epoch";
import { classifyAuthError } from "./errors";
import { AUTH_MESSAGES, formError, formSuccess, type FormState } from "./form-state";
import { DEFAULT_NEXT_PATH, safeNextPath } from "./next-path";
import {
  EMAIL_MAX,
  readField,
  validateEmail,
  validateExistingPassword,
  validateNewPassword,
} from "./validation";

/*
 * Sign-in, sign-up, sign-out and password-reset requests.
 *
 * Server Actions, so credentials post straight to the server and every form
 * works without JavaScript. Every message is generic where specificity would
 * reveal whether an email address has an account. Every Supabase call is
 * wrapped: a network or configuration failure becomes a calm message rather
 * than an error page.
 *
 * Signing in or out rotates the auth epoch cookie (see ./epoch.ts), which is
 * how the client favourites store notices the change after the redirect.
 */

/** The email as typed, for echoing back into the form. */
function echoEmail(formData: FormData): Record<string, string> {
  return { email: readField(formData, "email").trim().slice(0, EMAIL_MAX) };
}

/**
 * The validated return path. The sign-in page adds a `next` field once
 * hydrated; without JavaScript there is none, so fall back to the `next`
 * query parameter of the page the form was posted from (the Referer).
 */
async function requestedNext(formData: FormData): Promise<string> {
  const field = formData.get("next");
  if (typeof field === "string") return safeNextPath(field);
  try {
    const referer = (await headers()).get("referer");
    if (referer) return safeNextPath(new URL(referer).searchParams.get("next"));
  } catch {
    // An unparseable Referer is no Referer.
  }
  return DEFAULT_NEXT_PATH;
}

/** Where a confirmation or reset email should bring the visitor back to. */
function confirmUrl(next: string): string {
  return `${siteConfig.url}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signIn(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const next = await requestedNext(formData);
  const values = echoEmail(formData);
  const email = validateEmail(readField(formData, "email"));
  const password = validateExistingPassword(readField(formData, "password"));

  if (!email.ok || !password.ok) {
    return formError(null, {
      values,
      fieldErrors: {
        email: email.ok ? undefined : email.error,
        password: password.ok ? undefined : password.error,
      },
    });
  }
  if (!isConfigured()) return formError(AUTH_MESSAGES.notConfigured, { values });

  let failure: FormState | null = null;
  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });
    if (error) {
      const { kind } = classifyAuthError(error);
      failure = formError(
        kind === "rate_limited"
          ? AUTH_MESSAGES.rateLimited
          : kind === "unavailable"
            ? AUTH_MESSAGES.unavailable
            : // Never distinguish "no such account" from "wrong password"
              // (or "not confirmed yet"): each would confirm the email exists.
              AUTH_MESSAGES.signInFailed,
        { values },
      );
    }
  } catch (error) {
    console.error("signIn threw:", error);
    failure = formError(AUTH_MESSAGES.unavailable, { values });
  }
  if (failure) return failure;

  await rotateAuthEpoch();
  redirect(next);
}

export async function signUp(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const next = await requestedNext(formData);
  const values = echoEmail(formData);
  const email = validateEmail(readField(formData, "email"));
  const password = validateNewPassword(readField(formData, "password"));

  if (!email.ok || !password.ok) {
    return formError(null, {
      values,
      fieldErrors: {
        email: email.ok ? undefined : email.error,
        password: password.ok ? undefined : password.error,
      },
    });
  }
  if (!isConfigured()) return formError(AUTH_MESSAGES.notConfigured, { values });

  let result: FormState | "signed-in";
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.value,
      password: password.value,
      options: { emailRedirectTo: confirmUrl(next) },
    });

    if (error) {
      const { kind, code } = classifyAuthError(error);
      // GoTrue sends mail only for new or unconfirmed addresses, so the email
      // send limit and mail-delivery failures happen only when the address has
      // no confirmed account. Reporting them would leak that; they get the
      // same answer as success and are logged for the owner. Per-IP limits and
      // network failures say nothing about the account and are reported.
      const mailFailure =
        code === "over_email_send_rate_limit" ||
        (isAuthApiError(error) && (error.status ?? 0) >= 500);
      if (mailFailure) {
        console.error("signUp mail:", error.status, code ?? error.message);
        result = formSuccess(AUTH_MESSAGES.checkEmail, values);
      } else if (kind === "rate_limited")
        result = formError(AUTH_MESSAGES.rateLimited, { values });
      else if (kind === "unavailable")
        result = formError(AUTH_MESSAGES.unavailable, { values });
      else if (kind === "weak_password") {
        result = formError(null, {
          values,
          fieldErrors: { password: AUTH_MESSAGES.weakPassword },
        });
      } else if (code === "signup_disabled" || code === "email_provider_disabled") {
        result = formError(AUTH_MESSAGES.signUpClosed, { values });
      } else if (code === "email_address_invalid") {
        result = formError(null, {
          values,
          fieldErrors: { email: "Enter a valid email address." },
        });
      } else {
        // Including "user_already_exists": saying so would confirm the
        // address has an account. The owner of the address gets no email in
        // that case, which is the price of not leaking it.
        result = formSuccess(AUTH_MESSAGES.checkEmail, values);
      }
    } else if (data.session) {
      // Email confirmation is off: Supabase signed the new user in already.
      result = "signed-in";
    } else {
      result = formSuccess(AUTH_MESSAGES.checkEmail, values);
    }
  } catch (error) {
    console.error("signUp threw:", error);
    result = formError(AUTH_MESSAGES.unavailable, { values });
  }

  if (result !== "signed-in") return result;
  await rotateAuthEpoch();
  redirect(next);
}

/** Remove Supabase's session cookies directly, for when signOut() could not. */
async function clearSessionCookies(): Promise<void> {
  try {
    const store = await cookies();
    for (const cookie of store.getAll()) {
      if (/^sb-.+-auth-token/.test(cookie.name)) store.delete(cookie.name);
    }
  } catch (error) {
    console.error("clearSessionCookies failed:", error);
  }
}

/**
 * Sign out and go home. Posted by a form (works without JavaScript). If
 * Supabase cannot be reached, the session cookies are cleared here anyway:
 * a sign-out button that leaves you signed in is worse than a stale token.
 */
export async function signOut(): Promise<void> {
  if (isConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      // "local": only this browser's session. The default ("global") would
      // revoke every refresh token and sign the user out on all devices.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        console.error("signOut failed:", error.message);
        await clearSessionCookies();
      }
    } catch (error) {
      console.error("signOut threw:", error);
      await clearSessionCookies();
    }
  }
  await rotateAuthEpoch();
  redirect("/");
}

/**
 * Email a password-reset link. The reply is the same whether or not the
 * address has an account — only a failure to reach Supabase at all is
 * reported, since that says nothing about any account.
 */
export async function requestPasswordReset(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const values = echoEmail(formData);
  const email = validateEmail(readField(formData, "email"));
  if (!email.ok) return formError(null, { values, fieldErrors: { email: email.error } });
  if (!isConfigured()) return formError(AUTH_MESSAGES.notConfigured, { values });

  try {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: confirmUrl("/account/password"),
    });
    if (error) {
      if (isAuthRetryableFetchError(error)) {
        return formError(AUTH_MESSAGES.unavailable, { values });
      }
      // Rate limits and mail failures can depend on whether the account
      // exists, so they get the same answer as success. Logged for the owner.
      console.error("requestPasswordReset:", error.status, error.code ?? error.message);
    }
  } catch (error) {
    console.error("requestPasswordReset threw:", error);
    return formError(AUTH_MESSAGES.unavailable, { values });
  }
  return formSuccess(AUTH_MESSAGES.resetSent, values);
}
