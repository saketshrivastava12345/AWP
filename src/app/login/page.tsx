import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Heart, History, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/account/AuthShell";
import { Reveal } from "@/components/fx";
import { getAuthUser } from "@/lib/queries/auth";
import { safeNextPath } from "@/app/auth/next-path";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in or create an account to keep your saved cars on every device.",
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

const BENEFITS = [
  {
    icon: Heart,
    code: "SYNC",
    text: "Saved cars on every device, not just this browser.",
  },
  {
    icon: History,
    code: "TRAIL",
    text: "Recently viewed cars follow you from phone to laptop.",
  },
  {
    icon: ShieldCheck,
    code: "RLS",
    text: "Private to you, enforced by the database itself.",
  },
];

function Benefits() {
  return (
    <Reveal
      as="ul"
      stagger
      variant="rise"
      className="divide-y divide-line-subtle border-y border-line-subtle"
    >
      {BENEFITS.map(({ icon: Icon, code, text }) => (
        <li key={text} className="flex items-center gap-4 py-4 text-body text-ink-300">
          <span className="relative flex size-9 shrink-0 items-center justify-center rounded-control border border-cyan-700/60 bg-cyan-400/5 text-cyan-300 shadow-[0_0_14px_-4px_oklch(0.8_0.14_210/55%)]">
            <Icon className="size-4" strokeWidth={1.5} aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span aria-hidden="true" className="mb-1 block hud-label">
              {code}
            </span>
            {text}
          </span>
        </li>
      ))}
    </Reveal>
  );
}

/**
 * Someone already signed in has nothing to do here: send them on. Streams
 * in as a small dynamic hole (it reads the session); the redirect is then a
 * meta refresh plus a client navigation, which works with or without
 * JavaScript. Renders nothing otherwise.
 */
async function RedirectIfSignedIn({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  if (await getAuthUser()) {
    const next = Array.isArray(params.next) ? params.next[0] : params.next;
    redirect(safeNextPath(next));
  }
  return null;
}

/**
 * /login — sign in, or /login#create-account to create an account.
 *
 * `?next=/path` returns there afterwards (validated: a same-origin path, never
 * back into /login or /auth; anything else goes home). `?error=link` explains
 * an expired email link.
 *
 * The forms are part of the static shell so they work without JavaScript;
 * only the signed-in check is dynamic.
 */
export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <AuthShell
      title="Your garage, everywhere."
      description="Sign in to keep your saved cars with you, or create an account in a few seconds. All it takes is an email and a password."
      aside={<Benefits />}
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}
