import type { ReactNode } from "react";

/**
 * Route transition: a cyan scan line sweeps down the viewport while the
 * incoming page fades in.
 *
 * A template, not a client component keyed on usePathname(): Next gives a
 * template a fresh key whenever its segment changes, which remounts it and
 * restarts the CSS animations, with no hook involved (usePathname() in the
 * root layout would fail the build under Cache Components).
 *
 * Trap (CLAUDE.md, bug 1): the wrapper animates OPACITY ONLY — no transform,
 * no filter, not even mid-animation — so it never becomes the containing
 * block of a fixed or sticky descendant (Sheets, SubNav, the home story pin,
 * the car page's sticky stage). The scan line is its own fixed, childless
 * overlay; whatever it animates affects nothing else. Reduced motion: no
 * scan, and the CSS backstop reduces the fade to nothing.
 */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 animate-route-in flex-col">
      <div aria-hidden="true" className="fx-route-scan" />
      {children}
    </div>
  );
}
