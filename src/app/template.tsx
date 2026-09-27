import type { ReactNode } from "react";

/**
 * Route transition: a short fade-and-lift on the incoming page.
 *
 * A template, not a client component keyed on usePathname(): Next gives a
 * template a fresh key whenever its segment changes, which remounts it and
 * restarts the CSS animation, with no hook involved. That matters under Cache
 * Components — usePathname() in the root layout suspends on any route whose
 * params are only known at request time, and outside a Suspense boundary that
 * fails the build. The root template remounts when the first path segment
 * changes (/cars → /about); moving between pages inside a section keeps the
 * wrapper, which also spares re-creating the whole subtree on every step.
 *
 * Enter-only by design: animating the outgoing page would mean holding the old
 * route mounted while the new one streams in, which fights React streaming.
 * The fill mode is `backwards` (see animate-page-enter in globals.css) so no
 * transform lingers on this wrapper — a leftover transform would become the
 * containing block for every position: fixed descendant. Reduced motion is
 * handled by the CSS backstop.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 animate-page-enter flex-col">{children}</div>;
}
