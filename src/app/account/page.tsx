import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { DisplayNameForm } from "@/components/account/DisplayNameForm";
import { SignOutButton } from "@/components/account/SignOutButton";
import { getSessionUser } from "@/lib/queries/auth";
import { signOut } from "@/app/auth/actions";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your account",
  description: "Your AURIX profile, password and saved cars.",
  robots: { index: false, follow: false },
};

/** Label column | content column, shared by every row so they line up. */
const ROW = "grid gap-2 py-6 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8";

/** A titled group of settings rows, divided by hairlines. */
function Group({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id}>
      <h2 id={id} className="text-h3">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-[60ch] text-body-s text-ink-400">{description}</p>
      ) : null}
      <ul className="mt-6 divide-y divide-line-subtle border-y border-line-subtle">
        {children}
      </ul>
    </section>
  );
}

/** A read-only setting: its name, and what it is set to. */
function ValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className={ROW}>
      <span className="text-body text-ink-100">{label}</span>
      <span className="min-w-0 text-body text-ink-300">{children}</span>
    </li>
  );
}

/** A row that opens another page: the whole row is the link. */
function LinkRow({
  href,
  label,
  detail,
}: {
  href: string;
  label: string;
  detail: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-16 items-center gap-6 rounded-xs focus-visible:outline-offset-2"
      >
        <span className={cn(ROW, "min-w-0 flex-1")}>
          <span className="text-body text-ink-100 transition-colors duration-(--duration-fast) group-hover:text-ink-50">
            {label}
          </span>
          <span className="text-body-s text-ink-400 sm:text-body sm:text-ink-400">
            {detail}
          </span>
        </span>
        <ChevronRight
          className={cn(
            "size-5 shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard",
            "group-hover:translate-x-1 group-hover:text-ink-50 motion-reduce:translate-x-0",
          )}
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
    <div className="mt-16 max-w-4xl space-y-16 lg:mt-20 lg:space-y-20">
      <Group id="account-profile" title="Profile">
        <ValueRow label="Email">
          <span className="break-all">{user.email ?? "No email on this account"}</span>
        </ValueRow>
        <li>
          <DisplayNameForm
            initialName={user.displayName ?? fallbackName}
            rowClassName={ROW}
          />
        </li>
      </Group>

      <Group
        id="account-security"
        title="Security"
        description="Forgotten it? Sign out, then choose “Forgot your password?” on the sign-in page."
      >
        <LinkRow
          href="/account/password"
          label="Password"
          detail="Change it. You’ll need your current password."
        />
      </Group>

      <Group id="account-garage" title="Your garage">
        <LinkRow
          href="/favorites"
          label="Saved cars"
          detail="Synced to this account on every device."
        />
        <LinkRow
          href="/favorites#recently-viewed-heading"
          label="Recently viewed"
          detail="The last cars you opened."
        />
        {isAdmin ? (
          <LinkRow href="/admin" label="Admin" detail="Manage the catalogue." />
        ) : null}
      </Group>

      <Group
        id="account-session"
        title="Session"
        description="Signing out ends this session on this device only."
      >
        <li className={ROW}>
          <span className="text-body text-ink-100 sm:pt-3">This device</span>
          <form action={signOut}>
            <SignOutButton />
          </form>
        </li>
      </Group>
    </div>
  );
}

function AccountSkeleton() {
  return (
    <div aria-hidden="true" className="mt-16 max-w-4xl space-y-16 lg:mt-20">
      {[2, 1].map((rows, group) => (
        <div key={group}>
          <Skeleton className="h-7 w-32" />
          <div className="mt-6 divide-y divide-line-subtle border-y border-line-subtle">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className={ROW}>
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-full max-w-sm" />
              </div>
            ))}
          </div>
        </div>
      ))}
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
    <Container className="pt-12 pb-24 sm:pt-16 lg:pt-20 lg:pb-32">
      <h1 className="text-h1">Your account</h1>
      <p className="mt-4 max-w-[60ch] text-lead">
        Your profile, your password and the cars you keep.
      </p>
      <Suspense fallback={<AccountSkeleton />}>
        <AccountDetails />
      </Suspense>
    </Container>
  );
}
