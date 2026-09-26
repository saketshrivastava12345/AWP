"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Route transition: a short fade-and-lift on the incoming page.
 *
 * Keyed on the pathname so React remounts the subtree on navigation, which
 * restarts the CSS animation. This is an enter-only transition — animating the
 * outgoing page would mean holding the old route mounted while the new one
 * streams in, which fights React's streaming and delays first paint.
 *
 * Duration is ~450ms, inside the 800ms budget.
 *
 * Reduced motion is handled entirely by the CSS backstop in globals.css, which
 * collapses the animation to nothing. Branching on the preference in JS would
 * make this component's output differ between server and client for no gain.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="flex flex-1 animate-page-enter flex-col">
      {children}
    </div>
  );
}
