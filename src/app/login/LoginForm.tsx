"use client";

import { useActionState, useSyncExternalStore } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { FormField, Input, describedBy } from "@/components/ui/Field";
import { FormMessage } from "@/components/account/AuthShell";
import { signIn, signUp } from "@/app/auth/actions";
import { AUTH_MESSAGES, INITIAL_FORM_STATE, type FormState } from "@/app/auth/form-state";
import { safeNextPath } from "@/app/auth/next-path";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/app/auth/validation";

/*
 * Sign-in and create-account, both in the page's static shell.
 *
 * They must not stream in behind a Suspense boundary: streamed content is
 * revealed by a script, so without JavaScript it would never appear. So the
 * page reads nothing on the server, and:
 * - the mode switch is the URL fragment (#create-account), shown with CSS
 *   :target, so it works with JavaScript off;
 * - `?next=` is read from the address bar once hydrated; without JavaScript
 *   the server action falls back to the Referer's `next` (both validated).
 */

const CREATE_ID = "create-account";
const SIGN_IN_ID = "sign-in";

function subscribeLocation(onChange: () => void): () => void {
  window.addEventListener("hashchange", onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.removeEventListener("hashchange", onChange);
    window.removeEventListener("popstate", onChange);
  };
}

/** location.hash / location.search once hydrated; null while server-rendering. */
function useLocationPart(part: "hash" | "search"): string | null {
  return useSyncExternalStore(
    subscribeLocation,
    () => window.location[part],
    () => null,
  );
}

function Message({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <FormMessage tone={state.status === "error" ? "error" : "success"}>
      {state.message}
    </FormMessage>
  );
}

function NextField({ next }: { next: string | null }) {
  return next === null ? null : <input type="hidden" name="next" value={next} />;
}

function SignInForm({ next }: { next: string | null }) {
  const [state, formAction, pending] = useActionState(signIn, INITIAL_FORM_STATE);
  const { email: emailError, password: passwordError } = state.fieldErrors;

  return (
    <form action={formAction} className="space-y-5" aria-label="Sign in">
      <NextField next={next} />
      <FormField id="signin-email" label="Email address" error={emailError}>
        <Input
          id="signin-email"
          name="email"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          maxLength={254}
          defaultValue={state.values.email ?? ""}
          invalid={Boolean(emailError)}
          aria-describedby={describedBy("signin-email", null, emailError)}
          placeholder="you@example.com"
        />
      </FormField>
      <FormField id="signin-password" label="Password" error={passwordError}>
        <Input
          id="signin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          invalid={Boolean(passwordError)}
          aria-describedby={describedBy("signin-password", null, passwordError)}
        />
      </FormField>
      <p className="-mt-1 text-right">
        <Link
          href="/login/forgot"
          className="inline-flex min-h-11 items-center text-xs text-ink-300 underline-offset-4 hover:text-gold-200 hover:underline"
        >
          Forgot your password?
        </Link>
      </p>
      <Message state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Sign in
      </Button>
      <p className="text-xs leading-relaxed text-ink-500">
        Cars you saved in this browser before signing in are added to your account.
      </p>
    </form>
  );
}

export function LoginForm() {
  const hash = useLocationPart("hash");
  const search = useLocationPart("search");
  const params = search === null ? null : new URLSearchParams(search);
  const next = params ? safeNextPath(params.get("next")) : null;
  const notice = params?.get("error") === "link" ? AUTH_MESSAGES.linkInvalid : null;

  // The sign-up state lives here so the panel choice can follow it: after a
  // no-JavaScript post the URL has no fragment, yet the answer belongs to
  // the create-account form and must be visible.
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUp,
    INITIAL_FORM_STATE,
  );
  const creating =
    hash === null ? signUpState.status !== "idle" : hash === `#${CREATE_ID}`;

  // Without JavaScript `creating` is only known after a sign-up post; a
  // #create-account link is handled by CSS :target instead (the class names
  // are spelled out in full so Tailwind can see them).
  return (
    <div className="group/auth">
      <nav
        aria-label="Sign in or create an account"
        className="-mt-1 mb-7 flex border-b border-line"
      >
        <a
          href={`#${SIGN_IN_ID}`}
          aria-current={hash === null ? undefined : creating ? undefined : "page"}
          className={cn(
            "-mb-px inline-flex h-11 items-center border-b px-4 font-display text-micro tracking-button uppercase",
            "transition-colors duration-(--duration-fast) outline-none focus-visible:bg-surface-2",
            creating
              ? "border-transparent text-ink-400 hover:text-ink-100"
              : cn(
                  "border-gold-500 text-gold-300",
                  "group-has-[#create-account:target]/auth:border-transparent group-has-[#create-account:target]/auth:text-ink-400",
                ),
          )}
        >
          Sign in
        </a>
        <a
          href={`#${CREATE_ID}`}
          aria-current={hash === null ? undefined : creating ? "page" : undefined}
          className={cn(
            "-mb-px inline-flex h-11 items-center border-b px-4 font-display text-micro tracking-button uppercase",
            "transition-colors duration-(--duration-fast) outline-none focus-visible:bg-surface-2",
            creating
              ? "border-gold-500 text-gold-300"
              : cn(
                  "border-transparent text-ink-400 hover:text-ink-100",
                  "group-has-[#create-account:target]/auth:border-gold-500 group-has-[#create-account:target]/auth:text-gold-300",
                ),
          )}
        >
          Create account
        </a>
      </nav>

      {notice ? (
        <FormMessage tone="info" className="mb-6">
          {notice}
        </FormMessage>
      ) : null}

      <section
        id={SIGN_IN_ID}
        aria-label="Sign in"
        className={cn(
          "scroll-mt-28",
          creating ? "hidden" : "block group-has-[#create-account:target]/auth:hidden",
        )}
      >
        <SignInForm next={next} />
      </section>

      <section
        id={CREATE_ID}
        aria-label="Create account"
        className={cn("scroll-mt-28", creating ? "block" : "hidden target:block")}
      >
        <SignUpFormBound
          next={next}
          state={signUpState}
          action={signUpAction}
          pending={signUpPending}
        />
      </section>
    </div>
  );
}

/** The sign-up form, driven by state owned by LoginForm. */
function SignUpFormBound({
  next,
  state,
  action,
  pending,
}: {
  next: string | null;
  state: FormState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const { email: emailError, password: passwordError } = state.fieldErrors;
  const hint = `At least ${PASSWORD_MIN} characters.`;

  return (
    <form action={action} className="space-y-5" aria-label="Create account">
      <NextField next={next} />
      <FormField id="signup-email" label="Email address" error={emailError}>
        <Input
          id="signup-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={254}
          defaultValue={state.values.email ?? ""}
          invalid={Boolean(emailError)}
          aria-describedby={describedBy("signup-email", null, emailError)}
          placeholder="you@example.com"
        />
      </FormField>
      <FormField id="signup-password" label="Password" hint={hint} error={passwordError}>
        <Input
          id="signup-password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={PASSWORD_MIN}
          maxLength={PASSWORD_MAX}
          invalid={Boolean(passwordError)}
          aria-describedby={describedBy("signup-password", hint, passwordError)}
        />
      </FormField>
      <Message state={state} />
      <Button type="submit" loading={pending} className="w-full">
        Create account
      </Button>
      <p className="text-xs leading-relaxed text-ink-500">
        An account keeps your saved and recently viewed cars in sync across devices.
        Nothing else is stored, and only you can read it.
      </p>
    </form>
  );
}
