import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
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
          <div className="mb-3 hidden px-3 lg:block">
            <p className="font-display text-xs tracking-[0.3em] text-ink-50">AURIX</p>
            <p className="mt-1 font-display text-nano tracking-hud text-gold-400 uppercase">
              Admin
            </p>
          </div>
          <AdminNav />
          <div className="mt-8 hidden border-t border-line px-3 pt-5 lg:block">
            <p className="font-display text-nano tracking-hud text-ink-500 uppercase">
              Signed in
            </p>
            <p
              className="mt-1 truncate text-xs text-ink-300"
              title={admin.email ?? undefined}
            >
              {admin.displayName ?? admin.email ?? "Administrator"}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-10 items-center gap-2 text-xs text-ink-400 transition-colors hover:text-gold-300"
            >
              View public site
              <ExternalLink className="size-3" aria-hidden="true" />
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
    <header className="mb-8 border-b border-line pb-6">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, ...crumbs]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
          <h1 className="font-display text-lg leading-snug tracking-[0.06em] text-ink-50 uppercase sm:text-xl">
            {title}
          </h1>
          {description ? (
            <div className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-400">
              {description}
            </div>
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
    <Container className="flex-1 py-16">
      <p className="text-label">Restricted</p>
      <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
        ADMIN
      </h1>
      <EmptyState
        className="mt-14"
        icon={<ShieldAlert className="size-7" strokeWidth={1.25} aria-hidden="true" />}
        title="Administrator access required"
        description="This area is limited to accounts with the admin role. Row level security enforces the same restriction in the database."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href="/login" size="sm">
              Sign in
            </ButtonLink>
            <ButtonLink href="/" variant="secondary" size="sm">
              Return home
            </ButtonLink>
          </div>
        }
      />
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
      className={cn("rounded-md border border-line bg-surface-1/60", className)}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line-subtle px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {title ? (
              <h2
                id={headingId}
                className="font-display text-micro tracking-hud text-ink-100 uppercase"
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <div className="mt-1 text-xs leading-relaxed text-ink-500">
                {description}
              </div>
            ) : null}
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
        "rounded-sm border px-4 py-3 text-sm leading-relaxed",
        tone === "info" && "border-line bg-surface-2/40 text-ink-300",
        tone === "warning" && "border-gold-700/60 bg-gold-500/5 text-ink-200",
        tone === "success" &&
          "border-signal-positive/35 bg-signal-positive/5 text-ink-200",
        tone === "error" && "border-signal-negative/40 bg-signal-negative/5 text-ink-200",
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
        "relative overflow-auto rounded-md border border-line bg-surface-1/40 focus-visible:outline-offset-0",
        maxHeight && "max-h-[70vh]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const TH =
  "sticky top-0 z-[1] border-b border-line bg-surface-2 px-3 py-2.5 text-left font-display text-nano font-normal tracking-hud whitespace-nowrap text-ink-400 uppercase";
export const TD =
  "border-b border-line-subtle px-3 py-2.5 align-top text-sm text-ink-200";
export const TD_NUM = `${TD} text-right font-mono tabular whitespace-nowrap`;
