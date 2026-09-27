import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { ChevronRight, Heart, History, KeyRound, LayoutDashboard } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { DisplayNameForm } from "@/components/account/DisplayNameForm";
import { SignOutButton } from "@/components/account/SignOutButton";
import { getSessionUser } from "@/lib/queries/auth";
import { signOut } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your AURIX profile, password and saved cars.",
  robots: { index: false, follow: false },
};

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-md border border-line bg-surface-1 p-6 sm:p-8">
      <h2 className="font-display text-xs tracking-hud text-ink-100 uppercase">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm leading-relaxed text-ink-400">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function RowLink({
  href,
  icon,
  title,
  detail,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-14 items-center gap-4 rounded-sm px-3 py-3 transition-colors duration-(--duration-fast) outline-none hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:ring-2 focus-visible:ring-gold-500"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-gold-400">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm text-ink-100">{title}</span>
          <span className="block truncate text-xs text-ink-400">{detail}</span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-ink-500 transition-colors group-hover:text-gold-300"
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

async function AccountDetails() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Faccount");

  const fallbackName = user.email?.split("@")[0] ?? "";
  const isAdmin = user.role === "admin";

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="space-y-6">
        <Panel title="Profile">
          <dl>
            <dt className="text-label">Email</dt>
            <dd className="mt-2 text-sm break-all text-ink-100">
              {user.email ?? "No email on this account"}
            </dd>
          </dl>
          <div className="mt-8 border-t border-line-subtle pt-6">
            <DisplayNameForm initialName={user.displayName ?? fallbackName} />
          </div>
        </Panel>

        <Panel
          title="Security"
          description="Change your password here. If you forgot it, sign out and use “Forgot your password?” on the sign-in page."
        >
          <ul className="-mx-3">
            <RowLink
              href="/account/password"
              icon={<KeyRound className="size-4" aria-hidden="true" />}
              title="Change password"
              detail="You’ll need your current password."
            />
          </ul>
        </Panel>
      </div>

      <div className="space-y-6">
        <Panel title="Your garage">
          <ul className="-mx-3">
            <RowLink
              href="/favorites"
              icon={<Heart className="size-4" aria-hidden="true" />}
              title="Saved cars"
              detail="Synced to this account on every device."
            />
            <RowLink
              href="/favorites#recently-viewed-heading"
              icon={<History className="size-4" aria-hidden="true" />}
              title="Recently viewed"
              detail="The last cars you opened."
            />
            {isAdmin ? (
              <RowLink
                href="/admin"
                icon={<LayoutDashboard className="size-4" aria-hidden="true" />}
                title="Admin dashboard"
                detail="Manage the catalogue."
              />
            ) : null}
          </ul>
        </Panel>

        <Panel
          title="Session"
          description="Signing out ends this session on this device only."
        >
          <form action={signOut}>
            <SignOutButton className="w-full" />
          </form>
        </Panel>
      </div>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"
    >
      <Skeleton className="h-72 rounded-md" />
      <Skeleton className="h-72 rounded-md" />
    </div>
  );
}

/**
 * /account — signed-in only (signed-out visitors are sent to sign in and
 * brought back). The heading is static; the details read the session and
 * stream in behind a skeleton.
 */
export default function AccountPage() {
  return (
    <Container className="py-14 sm:py-16">
      <p className="text-label">Account</p>
      <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
        YOUR ACCOUNT
      </h1>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountDetails />
      </Suspense>
    </Container>
  );
}
