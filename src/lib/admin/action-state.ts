import type { FieldErrors } from "./validation";

/**
 * The state every admin form action returns (useActionState).
 *
 * `values` echoes what was submitted so a form that failed validation keeps
 * the admin's input: React resets uncontrolled fields to their defaults after
 * an action, and the defaults are read from here. `at` makes two identical
 * results distinguishable, so each one is announced.
 *
 * Client-safe.
 */
export type ActionState = {
  status: "idle" | "success" | "error";
  message: string | null;
  fieldErrors: FieldErrors;
  values: Record<string, string> | null;
  at: number;
};

export const IDLE_STATE: ActionState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: null,
  at: 0,
};

export function succeeded(
  message: string,
  values: Record<string, string> | null = null,
): ActionState {
  return { status: "success", message, fieldErrors: {}, values, at: Date.now() };
}

export function failed(
  message: string,
  fieldErrors: FieldErrors = {},
  values: Record<string, string> | null = null,
): ActionState {
  return { status: "error", message, fieldErrors, values, at: Date.now() };
}

/** Returned to anyone who is not an admin — the same for signed-out users. */
export const NOT_AUTHORISED =
  "You are not authorised to do that. Sign in with an admin account.";

export const CHECK_FIELDS = "Some fields need attention.";
