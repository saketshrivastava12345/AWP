import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { AdminNav } from "./AdminNav";

/**
 * The admin area's frame: its own navigation beside the page, inside the
 * site's chrome. Server component.
 */
export function AdminShell({
  admin,
  children,
}: {
  admin: { email: string | null; displayName: string | null };
  children: ReactNode;
}) {
  return (
    <Container size="wide" className="flex-1 pt-4 pb-20 lg:pt-8">
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[14rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="mb-6 hidden px-3 lg:block">
            <p className="text-h4">Admin</p>
            <p className="mt-0.5 text-caption">AURIX catalogue</p>
          </div>
          <AdminNav />
          <div className="mt-8 hidden border-t border-line-subtle px-3 pt-5 lg:block">
            <p className="text-caption">Signed in as</p>
            <p
              className="mt-1 truncate text-body-s text-ink-200"
              title={admin.email ?? undefined}
            >
              {admin.displayName ?? admin.email ?? "Administrator"}
            </p>
            <Link
              href="/"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-body-s text-ink-300 transition-colors duration-(--duration-fast) hover:text-ink-50"
            >
              View public site
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </aside>
        <div className="min-w-0 pt-6 lg:pt-0">{children}</div>
      </div>
    </Container>
  );
}

export function AdminPageHeader({
  title,
  description,
  crumbs = [],
  actions,
  eyebrow,
  children,
}: {
  title: string;
  description?: ReactNode;
  crumbs?: Crumb[];
  actions?: ReactNode;
  eyebrow?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-line-subtle pb-6">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, ...crumbs]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
          <h1 className="text-h2">{title}</h1>
          {description ? (
            <div className="mt-3 max-w-3xl text-body-s text-ink-400">{description}</div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {children}
    </header>
  );
}

/**
 * Shown to anyone who is not an admin. Deliberately identical for signed-out
 * visitors and signed-in non-admins, so the page cannot be used to learn
 * whether an account has the admin role.
 */
export function AdminDenied() {
  return (
    <Container className="flex-1 pt-12 pb-24 sm:pt-16 lg:pt-20">
      <p className="text-eyebrow">Restricted</p>
      <h1 className="mt-4 text-h1">Admin</h1>
      <div className="mt-12 flex flex-col items-center rounded-card bg-surface-1 px-6 py-16 text-center sm:py-20">
        <ShieldAlert
          className="size-7 text-ink-400"
          strokeWidth={1.25}
          aria-hidden="true"
        />
        <h2 className="mt-6 text-h3">Administrator access required</h2>
        <p className="mt-3 max-w-md text-body text-ink-400">
          This area is limited to accounts with the admin role. Row level security
          enforces the same restriction in the database.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/login">Sign in</ButtonLink>
          <ButtonLink href="/" variant="secondary">
            Return home
          </ButtonLink>
        </div>
      </div>
    </Container>
  );
}

/** A panel: hairline box with an optional title row. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={title && headingId ? headingId : undefined}
      className={cn("rounded-card border border-line-subtle bg-surface-1", className)}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h2 id={headingId} className="text-h4">
                {title}
              </h2>
            ) : null}
            {description ? <div className="mt-1 text-caption">{description}</div> : null}
          </div>
          {actions ? (
            <div className="flex flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("px-4 py-4 sm:px-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/** A calm inline notice: information, a warning or a success. */
export function Notice({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "success" | "error";
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-card border-l-2 bg-surface-1 px-4 py-3 text-sm leading-relaxed text-ink-200",
        tone === "info" && "border-ink-500 text-ink-300",
        tone === "warning" && "border-signal-hybrid",
        tone === "success" && "border-signal-positive",
        tone === "error" && "border-signal-negative",
        className,
      )}
    >
      {title ? <p className="font-medium text-ink-50">{title}</p> : null}
      {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
    </div>
  );
}

/** A scroll container for dense tables: scrolls inside itself, never the page. */
export function TableFrame({
  children,
  className,
  label,
  maxHeight = true,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name for the scroll region (it is focusable for keyboard scrolling). */
  label: string;
  maxHeight?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "relative overflow-auto rounded-card border border-line bg-surface-1/40 focus-visible:outline-offset-0",
        maxHeight && "max-h-[70vh]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const TH =
  "sticky top-0 z-[1] border-b border-line bg-surface-2 px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap text-ink-300";
export const TD =
  "border-b border-line-subtle px-3 py-2.5 align-top text-sm text-ink-200";
export const TD_NUM = `${TD} text-right font-mono tabular whitespace-nowrap`;
