"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Menu, Search } from "lucide-react";
import { ShortcutHint } from "@/components/ui/Kbd";
import { CONTAINER_GUTTERS } from "@/components/ui/Container";
import { PRIMARY_NAV, activeNavHref } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { SCROLLBAR_GAP_VAR } from "@/hooks/useLockBodyScroll";
import { useScrolledPast } from "@/hooks/useScrollPosition";
import { Wordmark } from "./BrandMark";
import { FavoritesLink } from "./FavoritesLink";
import { MobileMenu } from "./MobileMenu";
import { ScrollProgress } from "./ScrollProgress";
import { useSearchOverlay } from "./SearchProvider";

/** Tailwind's `lg`: the desktop bar takes over from the mobile menu here. */
const DESKTOP_QUERY = "(min-width: 1024px)";

/** The bar turns solid once the page has moved at all. */
const SOLID_AFTER_PX = 8;
/** It may hide on scroll-down only past this depth… */
const HIDE_AFTER_PX = 400;
/** …and only for a deliberate movement, not scroll jitter. */
const DIRECTION_DELTA_PX = 6;

/**
 * Hide-on-scroll-down, reveal-on-scroll-up — only on pages with a sticky
 * SubNav, which then takes the top slot. Written to an attribute on <html>
 * (globals.css moves the bar and re-points --nav-offset), never to React
 * state, so scrolling re-renders nothing. Under reduced motion it never hides.
 */
function useHideOnScroll() {
  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lastY = window.scrollY;
    let frame = 0;

    const update = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY;
      const allowed = !reduce.matches && document.querySelector("[data-subnav]") !== null;
      if (!allowed || y < HIDE_AFTER_PX) {
        delete root.dataset.navHidden;
        lastY = y;
        return;
      }
      if (Math.abs(delta) < DIRECTION_DELTA_PX) return;
      if (delta > 0) root.dataset.navHidden = "";
      else delete root.dataset.navHidden;
      lastY = y;
    };
    const schedule = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      if (frame !== 0) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      delete root.dataset.navHidden;
    };
  }, []);
}

/**
 * The fixed site header.
 *
 * The session-dependent pieces (saved-cars count, account control, the mobile
 * account block) arrive as server-rendered slots from the root layout, each in
 * its own Suspense boundary: a client component cannot read the session, and
 * keeping them out of this component keeps every page's shell static.
 *
 * The current path is read only where it is needed — the desktop links, in
 * their own Suspense boundary, and the mobile menu's content, which exists
 * only while the menu is open. Under Cache Components usePathname() suspends
 * during prerendering on any route whose params are only known at request
 * time; read here, in the root layout, outside a boundary, it would fail the
 * build for every such route.
 *
 * Nothing here re-renders while scrolling. The solid state flips once, on a
 * threshold; hide-on-scroll is an attribute written by a listener. There is
 * no global progress rule any more — a page's SubNav can carry one.
 */
export function Navbar({
  favoritesCount,
  account,
  mobileAccount,
}: {
  favoritesCount?: ReactNode;
  account?: ReactNode;
  mobileAccount?: ReactNode;
}) {
  const scrolled = useScrolledPast(SOLID_AFTER_PX);
  useHideOnScroll();
  const isDesktop = useMediaQuery(DESKTOP_QUERY);
  const { open: openSearch } = useSearchOverlay();
  const [menuOpen, setMenuOpen] = useState(false);

  // The window growing past `lg` closes the menu (the panel would otherwise
  // stay open, invisibly holding the scroll lock). Adjusting state during
  // render is React's pattern for "reset when an input changes"; an effect
  // would paint the stale state for a frame first. Navigating closes it too —
  // see MobileMenu.
  if (menuOpen && isDesktop) setMenuOpen(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  // Searching from the menu closes it first: "search all" can land on the
  // same pathname (/cars?q=…), which the menu's navigation check cannot see.
  const openSearchFromMenu = useCallback(() => {
    setMenuOpen(false);
    openSearch();
  }, [openSearch]);

  return (
    <>
      <header
        data-navbar=""
        data-scrolled={scrolled ? "" : undefined}
        style={{ paddingRight: `var(${SCROLLBAR_GAP_VAR}, 0px)` }}
        className={cn(
          "group/header fixed inset-x-0 top-0 z-(--z-nav) border-b",
          "transition-[background-color,border-color,backdrop-filter,-webkit-backdrop-filter,translate]",
          "duration-(--duration-base) ease-standard",
          scrolled
            ? "border-line-subtle bg-void/75 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-void/0 backdrop-blur-[0px] backdrop-saturate-100",
        )}
      >
        {/* Solid state: a cyan glint runs along the bottom edge. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 -bottom-px h-px",
            "bg-[linear-gradient(90deg,transparent,var(--color-line-glow)_25%,oklch(0.9_0.12_205/70%)_50%,var(--color-line-glow)_75%,transparent)]",
            "transition-opacity duration-(--duration-normal)",
            scrolled ? "opacity-100" : "opacity-0",
          )}
        />
        {/* Reading progress for the whole page, along the bottom edge. */}
        <ScrollProgress className="top-auto -bottom-px" />
        {/* Over a full-bleed hero the transparent bar keeps its legibility
            from a soft top scrim, which fades out once the bar is solid. */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-x-0 top-0 -z-10 h-[150%] scrim-top",
            "transition-opacity duration-(--duration-base)",
            scrolled ? "opacity-0" : "opacity-100",
          )}
        />

        <nav
          aria-label="Primary"
          className={cn(
            "mx-auto grid h-(--nav-h) w-full max-w-[1360px] grid-cols-[1fr_auto] items-center gap-4",
            "lg:grid-cols-[1fr_auto_1fr]",
            CONTAINER_GUTTERS,
          )}
        >
          <div className="flex items-center">
            <Wordmark />
          </div>

          {/* Without a known path (a route whose params resolve at request
              time) the links prerender with no active item and the
              indicator arrives as the boundary resolves. */}
          <Suspense fallback={<DesktopLinks pathname={null} />}>
            <CurrentDesktopLinks />
          </Suspense>

          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={openSearch}
              aria-keyshortcuts="Control+K Meta+K /"
              className={cn(
                "group flex h-11 min-w-11 items-center justify-center gap-2 rounded-control text-ink-200",
                "transition-[color,background-color,border-color,box-shadow] duration-(--duration-fast)",
                "hover:bg-cyan-400/8 hover:text-cyan-100",
                "xl:h-10 xl:border xl:border-line xl:bg-surface-1/50 xl:pr-2 xl:pl-3",
                "xl:hover:border-cyan-400/50 xl:hover:shadow-[0_0_16px_-6px_var(--color-cyan-400)]",
              )}
            >
              <Search className="size-[18px] shrink-0 group-hover:text-cyan-300" aria-hidden="true" />
              {/* Always the accessible name; visible from xl. */}
              <span className="font-mono text-xs tracking-[0.14em] uppercase max-xl:sr-only xl:mr-3">
                Search
              </span>
              <ShortcutHint
                keyName="K"
                className="ml-1 hidden min-[1440px]:inline-flex"
              />
            </button>

            <div className="hidden items-center gap-1 lg:flex">
              <FavoritesLink count={favoritesCount} />
              {account}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="-mr-2.5 grid size-11 place-items-center rounded-control text-ink-100 transition-colors duration-(--duration-fast) hover:bg-cyan-400/8 hover:text-cyan-100 lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        open={menuOpen && !isDesktop}
        onClose={closeMenu}
        onOpenSearch={openSearchFromMenu}
        favoritesCount={favoritesCount}
        account={mobileAccount}
      />
    </>
  );
}

function CurrentDesktopLinks() {
  return <DesktopLinks pathname={usePathname()} />;
}

/**
 * The desktop links, with a glowing cyan rule (and a soft beam of light
 * above it) that slides to the active section.
 *
 * Positions are measured from the rendered links (the webfont's metrics only
 * settle once it loads, so nothing is hard-coded). The
 * rule is moved by writing a transform to the DOM — no React state per move —
 * and it previews the hovered or focused link before settling back. The first
 * placement is instant; after that it animates, except under reduced motion.
 */
function DesktopLinks({ pathname }: { pathname: string | null }) {
  const listRef = useRef<HTMLUListElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const activeHref = pathname === null ? null : activeNavHref(pathname);
  const [preview, setPreview] = useState<string | null>(null);
  const target = preview ?? activeHref;

  useLayoutEffect(() => {
    const list = listRef.current;
    const rule = ruleRef.current;
    if (!list || !rule) return;

    const place = () => {
      const link = target
        ? list.querySelector<HTMLElement>(`[data-nav-href="${CSS.escape(target)}"]`)
        : null;
      const label = link?.querySelector<HTMLElement>("[data-nav-label]");
      if (!link || !label || label.offsetWidth === 0) {
        rule.style.opacity = "0";
        return;
      }
      const x = link.offsetLeft + label.offsetLeft;
      // Width, not scaleX: a scaled rule would smear its glow sideways.
      rule.style.transform = `translateX(${x}px)`;
      rule.style.width = `${label.offsetWidth}px`;
      rule.style.opacity = target === activeHref ? "1" : "0.45";
    };

    place();
    // Enable the transition only after the first placement, so the rule
    // does not fly in from the left edge on page load.
    const frame = window.requestAnimationFrame(() => {
      rule.dataset.ready = "";
    });
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [target, activeHref]);

  return (
    <ul
      ref={listRef}
      className="relative hidden h-(--nav-h) items-stretch lg:flex"
      onPointerLeave={() => setPreview(null)}
      onBlur={(event) => {
        if (!listRef.current?.contains(event.relatedTarget as Node | null))
          setPreview(null);
      }}
    >
      {PRIMARY_NAV.map((link) => {
        const active = link.href === activeHref;
        return (
          <li key={link.href} className="flex">
            <Link
              href={link.href}
              data-nav-href={link.href}
              aria-current={
                active ? (pathname === link.href ? "page" : "true") : undefined
              }
              onPointerEnter={() => setPreview(link.href)}
              onFocus={() => setPreview(link.href)}
              className={cn(
                "group/nav relative flex items-center px-3 font-mono text-[12.5px] font-medium tracking-[0.16em] uppercase xl:px-4",
                "transition-[color,text-shadow] duration-(--duration-fast) focus-visible:outline-none",
                active
                  ? "text-cyan-100 [text-shadow:0_0_14px_oklch(0.83_0.13_210/55%)]"
                  : "text-ink-200 hover:text-ink-50",
              )}
            >
              {/* The keyboard ring hugs the label: around the full-height
                  link it would be a tall box clipped by the window edge. */}
              <span
                data-nav-label=""
                className={cn(
                  "relative rounded-xs",
                  "group-focus-visible/nav:outline-2 group-focus-visible/nav:outline-offset-[6px]",
                  "group-focus-visible/nav:outline-cyan-300 group-focus-visible/nav:outline-solid",
                )}
              >
                {link.label}
              </span>
            </Link>
          </li>
        );
      })}
      <span
        ref={ruleRef}
        aria-hidden="true"
        className={cn(
          // 2px, sitting about 16px under the label's baseline, with a
          // faint beam of light rising from it.
          "pointer-events-none absolute bottom-2.5 left-0 h-0.5 w-0 bg-cyan-300 opacity-0",
          "shadow-[0_0_10px_1px_var(--color-cyan-400)]",
          "before:absolute before:inset-x-0 before:bottom-0 before:h-7 before:content-['']",
          "before:bg-[radial-gradient(60%_100%_at_50%_100%,oklch(0.83_0.13_210/22%),transparent)]",
          "data-ready:transition-[transform,width,opacity] data-ready:duration-(--duration-normal)",
          "data-ready:ease-cinematic motion-reduce:transition-none",
        )}
      />
    </ul>
  );
}
