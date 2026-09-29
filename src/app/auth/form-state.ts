/**
 * The state every auth and account form returns through useActionState.
 * Client-safe: forms import INITIAL_FORM_STATE from here.
 *
 * `values` echoes back what was typed (never a password), so a form that
 * re-renders on the server after a no-JavaScript post keeps the email.
 */
export type FormState = {
  status: "idle" | "error" | "success";
  message: string | null;
  fieldErrors: Partial<Record<string, string>>;
  values: Record<string, string>;
};

export const INITIAL_FORM_STATE: FormState = {
  status: "idle",
  message: null,
  fieldErrors: {},
  values: {},
};

export function formError(
  message: string | null,
  options: { fieldErrors?: FormState["fieldErrors"]; values?: FormState["values"] } = {},
): FormState {
  return {
    status: "error",
    message,
    fieldErrors: options.fieldErrors ?? {},
    values: options.values ?? {},
  };
}

export function formSuccess(
  message: string,
  values: FormState["values"] = {},
): FormState {
  return { status: "success", message, fieldErrors: {}, values };
}

/** Everything the auth screens say. Generic by design: nothing reveals whether an email has an account. */
export const AUTH_MESSAGES = {
  signInFailed: "Email or password is incorrect.",
  checkEmail: "Check your email to confirm your account.",
  resetSent: "If an account exists for that email, we’ve sent a link.",
  unavailable: "We couldn’t reach the account service. Please try again in a moment.",
  notConfigured:
    "Accounts are not set up on this deployment, so signing in is unavailable.",
  rateLimited: "Too many attempts. Please wait a minute and try again.",
  signUpClosed: "New accounts are not being accepted right now.",
  weakPassword:
    "That password was rejected as too easy to guess. Try a longer one, or add numbers and symbols.",
  linkInvalid:
    "That link has expired or has already been used. Request a new one and use the latest email.",
  sessionEnded: "Your session has ended. Sign in again to continue.",
} as const;
