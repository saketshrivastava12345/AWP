"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Suspense,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Menu, Search } from "lucide-react";
import { ShortcutHint } from "@/components/ui/Kbd";
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
 * threshold; the progress rule is driven by CSS (or a ref) — see
 * ScrollProgress.
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
  const scrolled = useScrolledPast();
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

  return (
    <>
      <header
        data-scrolled={scrolled ? "" : undefined}
        style={{ paddingRight: `var(${SCROLLBAR_GAP_VAR}, 0px)` }}
        className={cn(
          "group/header fixed inset-x-0 top-0 z-(--z-nav) border-b",
          "transition-[background-color,border-color,backdrop-filter,-webkit-backdrop-filter]",
          "duration-(--duration-normal) ease-cinematic",
          scrolled
            ? "border-line bg-void/80 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-void/0 backdrop-blur-[0px] backdrop-saturate-100",
        )}
      >
        <ScrollProgress />

        <nav
          aria-label="Primary"
          className="mx-auto grid h-16 w-full max-w-7xl grid-cols-[1fr_auto] items-center gap-4 px-5 sm:px-8 lg:grid-cols-[1fr_auto_1fr]"
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

          <div className="flex items-center justify-end gap-1.5 lg:gap-2">
            <button
              type="button"
              onClick={openSearch}
              aria-keyshortcuts="Control+K Meta+K /"
              className={cn(
                "group flex h-11 items-center gap-2.5 rounded-sm text-ink-300 transition-colors duration-(--duration-fast)",
                "hover:text-ink-50 max-sm:w-11 max-sm:justify-center",
                "sm:border sm:border-line sm:pr-2 sm:pl-3 sm:hover:border-line-strong lg:h-10",
              )}
            >
              <Search className="size-4 shrink-0" aria-hidden="true" />
              <span className="text-sm max-sm:sr-only lg:max-xl:sr-only">Search</span>
              <ShortcutHint keyName="K" className="max-sm:hidden" />
            </button>

            <div className="hidden items-center gap-1.5 lg:flex">
              <FavoritesLink count={favoritesCount} />
              {account}
            </div>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={menuOpen}
              aria-label="Open menu"
              className="-mr-2.5 grid size-11 place-items-center rounded-sm text-ink-100 transition-colors duration-(--duration-fast) hover:bg-surface-2 hover:text-ink-50 lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu
        open={menuOpen && !isDesktop}
        onClose={closeMenu}
        onOpenSearch={openSearch}
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
 * The desktop links, with a gold hairline that slides to the active section.
 *
 * Positions are measured from the rendered links (Michroma is wide, and its
 * metrics only settle once the webfont loads, so nothing is hard-coded). The
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
      rule.style.transform = `translateX(${x}px) scaleX(${label.offsetWidth})`;
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
      className="relative hidden h-16 items-stretch lg:flex"
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
                "group/nav relative flex items-center px-3 font-display text-micro tracking-hud uppercase xl:px-4",
                "transition-colors duration-(--duration-fast) focus-visible:outline-none",
                active ? "text-ink-50" : "text-ink-300 hover:text-ink-50",
              )}
            >
              {/* The keyboard ring hugs the label: around the full-height
                  link it would be a tall box clipped by the window edge. */}
              <span
                data-nav-label=""
                className={cn(
                  "relative rounded-xs",
                  "group-focus-visible/nav:outline-2 group-focus-visible/nav:outline-offset-[6px]",
                  "group-focus-visible/nav:outline-gold-500 group-focus-visible/nav:outline-solid",
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
          "pointer-events-none absolute bottom-0 left-0 h-px w-px origin-left bg-gold-400 opacity-0",
          "data-ready:transition-[transform,opacity] data-ready:duration-(--duration-normal)",
          "data-ready:ease-cinematic motion-reduce:transition-none",
        )}
      />
    </ul>
  );
}
