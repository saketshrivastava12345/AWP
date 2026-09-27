"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Car3DViewer, type Car3DViewerProps } from "@/components/3d/Car3DViewer";
import { VIEWER_GROUPS } from "@/components/3d/viewer-config";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/utils";
import type { ViewerGroup } from "@/types/domain";

/**
 * The car page's interactive 3D viewer, and the two ways into it from
 * elsewhere:
 *
 *   ?inspect=<group>#explore-3d   a deep link (the parts encyclopedia's
 *                                 "View in 3D") opens that subsystem on load.
 *   [data-inspect="<group>"]      any such link on the page ("View in 3D" in
 *                                 the components list) scrolls here and opens
 *                                 the subsystem.
 *
 * The query string is read from window.location, never useSearchParams, so
 * the page stays a static prerender. Car3DViewer takes its subsystem only as
 * an initial value, so a request remounts it (keyed) with the new one; its
 * canvas is created only once it is near the viewport anyway.
 */

/**
 * Re-read the URL after the first frame and on history moves. On a client-side
 * navigation the new page renders before the router has written the new URL,
 * so the first read can still see the previous page's address.
 */
function subscribeToUrl(onChange: () => void): () => void {
  const frame = window.requestAnimationFrame(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    window.cancelAnimationFrame(frame);
    window.removeEventListener("popstate", onChange);
  };
}

function isViewerGroup(value: string | null | undefined): value is ViewerGroup {
  return (VIEWER_GROUPS as readonly string[]).includes(value ?? "");
}

/** The ?inspect group of the URL the page was opened with. */
function inspectFromUrl(): ViewerGroup | null {
  const value = new URLSearchParams(window.location.search).get("inspect");
  return isViewerGroup(value) ? value : null;
}

type Request = { group: ViewerGroup; nonce: number };

/** How long to wait for a smooth scroll to end before opening anyway. */
const SCROLL_TIMEOUT_MS = 1200;

export function DetailViewer({
  className,
  ...viewer
}: Omit<Car3DViewerProps, "initialInspect">) {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useReducedMotion();
  // Server render and hydration: none. Then the URL's, once.
  const fromUrl = useSyncExternalStore(subscribeToUrl, inspectFromUrl, () => null);
  const [request, setRequest] = useState<Request | null>(null);
  const nonce = useRef(0);

  const inspect = request?.group ?? fromUrl;
  const key = request ? `request-${request.nonce}` : `url-${fromUrl ?? "none"}`;

  const open = useCallback(
    (group: ViewerGroup) => {
      const section = sectionRef.current;
      if (!section) return;
      // Focus lands on the viewer's section, so closing the panel returns
      // here rather than to a link far down the page.
      section.focus({ preventScroll: true });

      const show = () => {
        nonce.current += 1;
        setRequest({ group, nonce: nonce.current });
      };
      const top = section.getBoundingClientRect().top;
      const near = Math.abs(top) < window.innerHeight * 0.25;
      if (near || reducedMotion) {
        section.scrollIntoView({ behavior: "auto", block: "start" });
        show();
        return;
      }
      // Open once the page has arrived: the panel locks scrolling, which
      // would otherwise stop a smooth scroll halfway.
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        window.removeEventListener("scrollend", finish);
        window.clearTimeout(timer);
        show();
      };
      const timer = window.setTimeout(finish, SCROLL_TIMEOUT_MS);
      window.addEventListener("scrollend", finish, { once: true });
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [reducedMotion],
  );

  // One delegated listener for every "View in 3D" link on the page.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest<HTMLElement>("[data-inspect]");
      const group = link?.dataset.inspect;
      if (!link || !isViewerGroup(group)) return;
      event.preventDefault();
      open(group);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  return (
    <section
      ref={sectionRef}
      id="explore-3d"
      tabIndex={-1}
      aria-label={`${viewer.title} in 3D`}
      data-inspect-group={inspect ?? undefined}
      className={cn("scroll-mt-20 outline-none", className)}
    >
      <Car3DViewer key={key} {...viewer} initialInspect={inspect} />
    </section>
  );
}
