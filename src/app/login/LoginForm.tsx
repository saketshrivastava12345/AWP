"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { signIn, signUp, type AuthState } from "./actions";

const INITIAL: AuthState = { error: null, message: null };

/**
 * Email + password auth.
 *
 * Both actions are Server Actions, so credentials are posted straight to the
 * server and never handled by client JavaScript — and the form still submits
 * if JavaScript has not loaded. `useActionState` supplies the pending state
 * and the returned error.
 */
export function LoginForm() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const action = mode === "signin" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, INITIAL);

  const inputClasses =
    "w-full rounded-xs border border-line bg-surface-2 px-4 py-3 text-sm " +
    "text-ink-100 placeholder:text-ink-600 focus-visible:border-gold-500 outline-none";

  return (
    <div className="w-full max-w-sm">
      {/* Mode switch */}
      <div
        role="tablist"
        aria-label="Authentication mode"
        className="mb-8 flex border-b border-line"
      >
        {(["signin", "signup"] as const).map((value) => (
          <button
            key={value}
            role="tab"
            type="button"
            aria-selected={mode === value}
            onClick={() => setMode(value)}
            className={cn(
              "-mb-px border-b px-4 py-3 font-display text-[10px] tracking-[0.18em] uppercase transition-colors",
              mode === value
                ? "border-gold-500 text-gold-300"
                : "border-transparent text-ink-400 hover:text-ink-100",
            )}
          >
            {value === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-2 block text-label">
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className={inputClasses}
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-label">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            required
            minLength={mode === "signup" ? 8 : undefined}
            className={inputClasses}
            placeholder={mode === "signup" ? "At least 8 characters" : "••••••••"}
          />
        </div>

        {state.error ? (
          <p
            role="alert"
            className="flex items-start gap-2 text-xs leading-relaxed text-signal-negative"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {state.error}
          </p>
        ) : null}

        {state.message ? (
          <p
            role="status"
            className="flex items-start gap-2 text-xs leading-relaxed text-signal-positive"
          >
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {state.message}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className={cn(
            "flex h-12 w-full items-center bg-gold-500 font-display text-void hover:bg-gold-400",
            "justify-center gap-2 rounded-xs text-[11px] tracking-[0.14em] uppercase",
            "transition-colors disabled:opacity-50",
          )}
        >
          {pending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : null}
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>

      <p className="mt-8 text-xs leading-relaxed text-ink-600">
        An account is only used to save cars to your favourites. Your saved cars are
        private to you — row level security in the database enforces that, not just the
        interface.
      </p>
    </div>
  );
}
