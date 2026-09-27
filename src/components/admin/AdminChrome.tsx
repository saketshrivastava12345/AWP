import Link from "next/link";
import type { ReactNode } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { GridBackground, ScrambleText } from "@/components/fx";
import { cn } from "@/lib/utils";
import { AdminNav } from "./AdminNav";

/**
 * The admin area's frame — mission control: its own navigation rail beside
 * the page, inside the site's chrome, over a faint engineering grid. Server
 * component. The rail is sticky, so nothing here puts a transform or filter
 * on its ancestors.
 */
export function AdminShell({
  admin,
  children,
}: {
  admin: { email: string | null; displayName: string | null };
  children: ReactNode;
}) {
  return (
    <div className="relative isolate flex flex-1 flex-col overflow-x-clip">
      <GridBackground size={56} animated={false} className="max-h-[36rem]" />
      <Container size="wide" className="relative flex-1 pt-4 pb-20 lg:pt-8">
        <div className="lg:grid lg:grid-cols-[13.5rem_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[14.5rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative mb-6 hidden rounded-card px-4 py-4 hud-panel lg:block">
              <span aria-hidden="true" className="hud-brackets -m-px [--hud-l:10px]" />
              <p aria-hidden="true" className="hud-label">
                SYS // ADMIN
              </p>
              <p className="mt-2 font-hud text-[13px] tracking-hud text-ink-50 uppercase">
                Mission control
              </p>
              <p className="mt-2 flex items-center gap-2 text-hud">
                <span
                  aria-hidden="true"
                  className="size-1.5 shrink-0 animate-pulse-glow rounded-full bg-signal-positive shadow-[0_0_8px_var(--color-signal-positive)]"
                />
                Live · AURIX catalogue
              </p>
            </div>
            <AdminNav />
            <div className="mt-8 hidden border-t border-line-subtle px-3 pt-5 lg:block">
              <p className="text-hud">Operator</p>
              <p
                className="mt-1.5 truncate text-body-s text-ink-100"
                title={admin.email ?? undefined}
              >
                {admin.displayName ?? admin.email ?? "Administrator"}
              </p>
              <Link
                href="/"
                className="mt-3 inline-flex min-h-11 items-center gap-2 fx-link text-body-s text-ink-300 transition-colors duration-(--duration-fast) hover:text-cyan-200"
              >
                View public site
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          </aside>
          <div className="min-w-0 pt-6 lg:pt-0">{children}</div>
        </div>
      </Container>
    </div>
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
    <header className="mb-8 pb-6 [background:linear-gradient(90deg,var(--color-cyan-400),oklch(0.83_0.13_210/25%)_30%,transparent)_bottom/100%_1px_no-repeat]">
      <Breadcrumbs items={[{ label: "Admin", href: "/admin" }, ...crumbs]} />
      <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
          <h1 className="text-h2">
            <ScrambleText text={title} />
          </h1>
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
    <div className="relative isolate flex flex-1 flex-col overflow-x-clip">
      <GridBackground variant="floor" size={56} className="max-h-[44rem]" />
      <Container className="relative flex-1 pt-12 pb-24 sm:pt-16 lg:pt-20">
        <p className="flex items-center gap-3 text-eyebrow">
          <span
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
          />
          Restricted
          <span aria-hidden="true" className="hud-label text-ink-600">
            {"// "}ACCESS
          </span>
        </p>
        <h1 className="mt-4 text-h1">
          <ScrambleText text="Admin" />
        </h1>
        <div className="relative mt-12 flex flex-col items-center rounded-card px-6 py-16 text-center hud-panel [--hud-l:18px] sm:py-20">
          <span aria-hidden="true" className="hud-brackets -m-px" />
          <ShieldAlert
            className="size-8 text-signal-negative drop-shadow-[0_0_12px_oklch(0.65_0.2_20/55%)]"
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
    </div>
  );
}

/** A HUD panel: bracketed glass box with an optional title row and code. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  id,
  code,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  id?: string;
  /** Decorative HUD code at the top-right (aria-hidden). */
  code?: string;
}) {
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={title && headingId ? headingId : undefined}
      className={cn("relative rounded-card hud-panel [--hud-l:14px]", className)}
    >
      <span aria-hidden="true" className="hud-brackets -m-px" />
      {code ? (
        <span
          aria-hidden="true"
          className="absolute top-3 right-4 hud-label text-ink-600"
        >
          {code}
        </span>
      ) : null}
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

/** An inline notice: information, a warning, a success or an error, with a lit dot. */
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
        "flex items-start gap-3 rounded-card border bg-surface-1/80 px-4 py-3 text-sm leading-relaxed text-ink-200",
        "before:mt-[7px] before:size-1.5 before:shrink-0 before:rounded-full before:content-['']",
        tone === "info" &&
          "border-cyan-700/60 text-ink-300 before:bg-cyan-300 before:shadow-[0_0_8px_var(--color-cyan-300)]",
        tone === "warning" &&
          "border-signal-hybrid/40 before:bg-signal-hybrid before:shadow-[0_0_8px_var(--color-signal-hybrid)]",
        tone === "success" &&
          "border-signal-positive/40 before:bg-signal-positive before:shadow-[0_0_8px_var(--color-signal-positive)]",
        tone === "error" &&
          "border-signal-negative/40 before:bg-signal-negative before:shadow-[0_0_8px_var(--color-signal-negative)]",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? <p className="font-medium text-ink-50">{title}</p> : null}
        {children ? <div className={cn(title && "mt-1")}>{children}</div> : null}
      </div>
    </div>
  );
}

/*
 * Table rows slide in one after another (a CSS animation with `backwards`
 * fill, so no-JS visitors see the finished table; the reduced-motion
 * backstop in globals.css stops it). Rows past the twelfth appear at once.
 */
const ROW_STAGGER = [
  "[&_tbody>tr]:animate-rise-in",
  "[&_tbody>tr:nth-child(2)]:[animation-delay:40ms]",
  "[&_tbody>tr:nth-child(3)]:[animation-delay:80ms]",
  "[&_tbody>tr:nth-child(4)]:[animation-delay:120ms]",
  "[&_tbody>tr:nth-child(5)]:[animation-delay:160ms]",
  "[&_tbody>tr:nth-child(6)]:[animation-delay:200ms]",
  "[&_tbody>tr:nth-child(7)]:[animation-delay:240ms]",
  "[&_tbody>tr:nth-child(8)]:[animation-delay:280ms]",
  "[&_tbody>tr:nth-child(9)]:[animation-delay:320ms]",
  "[&_tbody>tr:nth-child(10)]:[animation-delay:360ms]",
  "[&_tbody>tr:nth-child(11)]:[animation-delay:400ms]",
  "[&_tbody>tr:nth-child(12)]:[animation-delay:440ms]",
].join(" ");

/**
 * A scroll container for dense tables: scrolls inside itself, never the
 * page. Rows animate in and light up cyan under the pointer.
 */
export function TableFrame({
  children,
  className,
  label,
  maxHeight = true,
  animateRows = true,
}: {
  children: ReactNode;
  className?: string;
  /** Accessible name for the scroll region (it is focusable for keyboard scrolling). */
  label: string;
  maxHeight?: boolean;
  /** Stagger the rows in on first paint (default). */
  animateRows?: boolean;
}) {
  return (
    <div
      role="region"
      aria-label={label}
      tabIndex={0}
      className={cn(
        "relative overflow-auto rounded-card border border-line bg-surface-1/40 focus-visible:outline-offset-0",
        "[&_tbody>tr]:transition-colors [&_tbody>tr]:duration-(--duration-fast) [&_tbody>tr:hover]:bg-cyan-400/5",
        maxHeight && "max-h-[70vh]",
        animateRows && ROW_STAGGER,
        className,
      )}
    >
      {children}
    </div>
  );
}

export const TH =
  "sticky top-0 z-[1] border-b border-line bg-surface-2 px-3 py-2.5 text-left font-mono text-[11px] font-medium tracking-hud whitespace-nowrap text-cyan-200/80 uppercase";
export const TD =
  "border-b border-line-subtle px-3 py-2.5 align-top text-sm text-ink-200";
export const TD_NUM = `${TD} text-right font-mono tabular whitespace-nowrap`;
