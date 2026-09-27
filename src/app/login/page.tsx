import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Heart, History, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/account/AuthShell";
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
  { icon: Heart, text: "Saved cars on every device, not just this browser." },
  { icon: History, text: "Recently viewed cars follow you from phone to laptop." },
  { icon: ShieldCheck, text: "Private to you, enforced by the database itself." },
];

function Benefits() {
  return (
    <ul className="space-y-4">
      {BENEFITS.map(({ icon: Icon, text }) => (
        <li key={text} className="flex items-start gap-3 text-sm text-ink-300">
          <Icon
            className="mt-0.5 size-4 shrink-0 text-gold-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {text}
        </li>
      ))}
    </ul>
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
      overline="AURIX account"
      title="YOUR GARAGE, EVERYWHERE"
      description="Sign in to keep your saved cars with you, or create an account in a few seconds — just an email and a password."
      aside={<Benefits />}
    >
      <Suspense fallback={null}>
        <RedirectIfSignedIn searchParams={searchParams} />
      </Suspense>
      <LoginForm />
    </AuthShell>
  );
}
