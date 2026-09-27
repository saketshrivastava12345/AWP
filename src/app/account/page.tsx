import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { GridBackground, HudFrame, Reveal, ScrambleText } from "@/components/fx";
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
const ROW = "grid gap-2 px-5 py-5 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8 sm:px-6";

/** A titled console panel of settings rows, divided by hairlines. */
function Group({
  id,
  code,
  title,
  description,
  children,
}: {
  id: string;
  /** Decorative HUD code on the panel's edge (aria-hidden). */
  code: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <HudFrame
      as="section"
      aria-labelledby={id}
      label={`${title.toUpperCase()} // ${code}`}
      code={code}
      padded={false}
      className="[--hud-l:16px]"
    >
      <div className="px-5 pt-6 pb-4 sm:px-6">
        <h2 id={id} className="text-h3">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-[60ch] text-body-s text-ink-400">{description}</p>
        ) : null}
      </div>
      <ul className="divide-y divide-line-subtle border-t border-line-subtle">
        {children}
      </ul>
    </HudFrame>
  );
}

/** A read-only setting: its name, and what it is set to. */
function ValueRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <li className={ROW}>
      <span className="pt-0.5 text-label">{label}</span>
      <span className="min-w-0 text-body text-ink-100">{children}</span>
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
        className={cn(
          "group flex min-h-16 items-center gap-6 pr-5 focus-visible:outline-offset-[-2px] sm:pr-6",
          "transition-colors duration-(--duration-fast) hover:bg-cyan-400/5",
        )}
      >
        <span className={cn(ROW, "min-w-0 flex-1 pr-0 sm:pr-0")}>
          <span className="pt-0.5 text-label transition-colors duration-(--duration-fast) group-hover:text-cyan-200">
            {label}
          </span>
          <span className="text-body-s text-ink-300 sm:text-body">{detail}</span>
        </span>
        <ChevronRight
          className={cn(
            "size-5 shrink-0 text-ink-400 transition-[translate,color,filter] duration-(--duration-base) ease-standard",
            "group-hover:translate-x-1 group-hover:text-cyan-200 group-hover:drop-shadow-[0_0_6px_var(--color-cyan-300)] motion-reduce:translate-x-0",
          )}
          aria-hidden="true"
        />
      </Link>
    </li>
  );
}

/** One readout of the session strip: a mono label and its live value. */
function Readout({
  label,
  children,
  glow = false,
}: {
  label: string;
  children: ReactNode;
  glow?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 px-5 py-4 sm:px-6">
      <dt className="text-hud">{label}</dt>
      <dd
        className={cn(
          "truncate font-mono text-sm text-ink-50",
          glow && "text-cyan-200 [text-shadow:0_0_12px_oklch(0.83_0.13_210/45%)]",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

async function AccountDetails() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=%2Faccount");

  const fallbackName = user.email?.split("@")[0] ?? "";
  const isAdmin = user.role === "admin";

  return (
    <Reveal stagger={110} className="mt-12 max-w-4xl space-y-8 lg:mt-16">
      {/* Session strip: the real values of this session, telemetry style. */}
      <dl
        aria-label="Session"
        className="relative grid grid-cols-2 divide-x divide-line-subtle overflow-hidden rounded-card hud-panel sm:grid-cols-4"
      >
        <span aria-hidden="true" className="hud-brackets -m-px" />
        <Readout label="Status" glow>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 animate-pulse-glow rounded-full bg-signal-positive shadow-[0_0_8px_var(--color-signal-positive)]"
            />
            Signed in
          </span>
        </Readout>
        <Readout label="Operator">{user.displayName ?? fallbackName}</Readout>
        <Readout label="Role">{isAdmin ? "Administrator" : "Member"}</Readout>
        <Readout label="Scope">This device</Readout>
      </dl>

      <Group id="account-profile" code="01" title="Profile">
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
        code="02"
        title="Security"
        description="Forgotten it? Sign out, then choose “Forgot your password?” on the sign-in page."
      >
        <LinkRow
          href="/account/password"
          label="Password"
          detail="Change it. You’ll need your current password."
        />
      </Group>

      <Group id="account-garage" code="03" title="Your garage">
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
        code="04"
        title="Session"
        description="Signing out ends this session on this device only."
      >
        <li className={ROW}>
          <span className="text-label sm:pt-3.5">This device</span>
          <form action={signOut}>
            <SignOutButton />
          </form>
        </li>
      </Group>
    </Reveal>
  );
}

function AccountSkeleton() {
  return (
    <div aria-hidden="true" className="mt-12 max-w-4xl space-y-8 lg:mt-16">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line-subtle bg-line-subtle sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-surface-1 px-5 py-4">
            <Skeleton className="h-2.5 w-14" />
            <Skeleton className="mt-3 h-4 w-24" />
          </div>
        ))}
      </div>
      {[2, 1].map((rows, group) => (
        <div key={group} className="rounded-card border border-line-subtle">
          <div className="px-5 pt-6 pb-4 sm:px-6">
            <Skeleton className="h-7 w-32" />
          </div>
          <div className="divide-y divide-line-subtle border-t border-line-subtle">
            {Array.from({ length: rows }, (_, index) => (
              <div key={index} className={ROW}>
                <Skeleton className="h-3 w-24" />
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
    <div className="relative isolate overflow-x-clip">
      <GridBackground size={56} className="max-h-[42rem]" />
      <Container className="relative pt-12 pb-24 sm:pt-16 lg:pt-20 lg:pb-32">
        <p className="flex items-center gap-3 text-eyebrow">
          <span
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
          />
          Settings console
          <span aria-hidden="true" className="hud-label text-ink-600">
            {"// "}ACCT
          </span>
        </p>
        <h1 className="mt-4 text-h1">
          <ScrambleText text="Your account" />
        </h1>
        <p className="mt-4 max-w-[60ch] text-lead">
          Your profile, your password and the cars you keep.
        </p>
        <Suspense fallback={<AccountSkeleton />}>
          <AccountDetails />
        </Suspense>
      </Container>
    </div>
  );
}
