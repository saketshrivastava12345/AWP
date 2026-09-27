/**
 * Server-side input validation for the auth and account forms.
 *
 * The browser's `required` and `minLength` are a convenience; these are the
 * rules. Each returns either the cleaned value or a message fit to show next
 * to the field. Pure and client-safe, so forms can reuse the limits.
 */

export const PASSWORD_MIN = 8;
/** bcrypt ignores everything after 72 bytes, and Supabase rejects longer. */
export const PASSWORD_MAX = 72;
export const EMAIL_MAX = 254;
export const DISPLAY_NAME_MAX = 50;

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string };

/** A FormData string field, or "" when absent or a file. */
export function readField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

// Deliberately loose: one "@", something either side, a dot in the domain,
// no spaces. Supabase does the authoritative check; this only catches typos.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(raw: string): Validated<string> {
  const email = raw.trim();
  if (!email) return { ok: false, error: "Enter your email address." };
  if (email.length > EMAIL_MAX || !EMAIL.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true, value: email };
}

/** Byte length, since the bcrypt limit is in bytes, not characters. */
function utf8Length(value: string): number {
  return new TextEncoder().encode(value).length;
}

/** A new password. Never trimmed: spaces are legitimate characters. */
export function validateNewPassword(raw: string): Validated<string> {
  if (raw.length < PASSWORD_MIN) {
    return {
      ok: false,
      error: `Choose a password of at least ${PASSWORD_MIN} characters.`,
    };
  }
  if (utf8Length(raw) > PASSWORD_MAX) {
    return { ok: false, error: `Use at most ${PASSWORD_MAX} characters.` };
  }
  return { ok: true, value: raw };
}

/** A password being checked (sign-in, current password): present, bounded. */
export function validateExistingPassword(raw: string): Validated<string> {
  if (!raw) return { ok: false, error: "Enter your password." };
  // Longer than any password Supabase could have stored: reject without a
  // round trip rather than sending an arbitrarily large body upstream.
  if (raw.length > 1024) return { ok: false, error: "Enter your password." };
  return { ok: true, value: raw };
}

/**
 * A display name: whitespace collapsed, control and invisible formatting
 * characters removed, 1–50 characters.
 */
export function validateDisplayName(raw: string): Validated<string> {
  const name = raw
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁠-⁯﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!name) return { ok: false, error: "Enter a display name." };
  if ([...name].length > DISPLAY_NAME_MAX) {
    return { ok: false, error: `Use at most ${DISPLAY_NAME_MAX} characters.` };
  }
  return { ok: true, value: name };
}

/** The email-link types Supabase can send, as `verifyOtp` expects them. */
export const EMAIL_LINK_TYPES = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const;
export type EmailLinkType = (typeof EMAIL_LINK_TYPES)[number];

export function parseEmailLinkType(value: unknown): EmailLinkType | null {
  return typeof value === "string" &&
    (EMAIL_LINK_TYPES as readonly string[]).includes(value)
    ? (value as EmailLinkType)
    : null;
}

/** A token hash from an email link: bounded, URL-safe characters only. */
export function isTokenHash(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,256}$/.test(value);
}
