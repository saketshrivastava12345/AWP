"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY_NAV, isActivePath } from "@/lib/navigation";
import { useScrollPosition } from "@/hooks/useScrollPosition";
import { useLockBodyScroll } from "@/hooks/useLockBodyScroll";
import { useSearchOverlay } from "./SearchProvider";
import type { ReactNode } from "react";

/**
 * `accountSlot` is rendered by the server (see AccountMenu) and passed through
 * as a child. A client component cannot read the session itself, and making
 * the whole navbar a server component would cost the mobile menu and scroll
 * progress their interactivity.
 */
export function Navbar({ accountSlot }: { accountSlot?: ReactNode }) {
  const pathname = usePathname();
  const { isScrolled, progress } = useScrollPosition();
  const { open: openSearch } = useSearchOverlay();
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  useLockBodyScroll(menuOpen);

  // Navigating from inside the mobile menu must close it, and the route can
  // change without this component unmounting. Adjusting state during render
  // (React's documented pattern for "reset when a prop changes") rather than
  // in an effect avoids rendering the stale open menu for a frame first.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMenuOpen(false);
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-500",
        "ease-[var(--ease-cinematic)]",
        isScrolled || menuOpen
          ? "border-b border-line bg-void/85 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent",
      )}
    >
      {/* Scroll progress: a one-pixel gold rule along the very top. */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-px origin-left bg-gold-500"
        style={{ transform: `scaleX(${progress})` }}
      />

      <nav
        aria-label="Primary"
        className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8"
      >
        <Link
          href="/"
          className="font-display text-base tracking-[0.3em] text-ink-50 transition-colors duration-300 hover:text-gold-300"
        >
          AURIX
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {PRIMARY_NAV.map((link) => {
            const active = isActivePath(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative px-4 py-2 font-display text-[10px] tracking-[0.18em] uppercase",
                    "transition-colors duration-200",
                    active ? "text-gold-300" : "text-ink-300 hover:text-ink-50",
                  )}
                >
                  {link.label}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-4 -bottom-px h-px bg-gold-500"
                    />
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={openSearch}
            className={cn(
              "border-line text-ink-400 hover:border-line-strong hover:text-ink-100",
              "flex items-center gap-3 rounded-xs border py-2 pr-2 pl-3 transition-colors duration-200",
            )}
            aria-label="Search cars, manufacturers and parts"
          >
            <Search className="size-3.5" aria-hidden="true" />
            <span className="hidden text-xs sm:inline">Search</span>
            <kbd
              aria-hidden="true"
              className="hidden rounded-xs border border-line bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-ink-500 sm:inline"
            >
              ⌘K
            </kbd>
          </button>

          {accountSlot}

          <button
            type="button"
            onClick={() => setMenuOpen((previous) => !previous)}
            className="p-2 text-ink-200 transition-colors hover:text-ink-50 lg:hidden"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            {menuOpen ? (
              <X className="size-5" aria-hidden="true" />
            ) : (
              <Menu className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {menuOpen ? (
        <div
          id="mobile-menu"
          className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-void/95 backdrop-blur-xl lg:hidden"
        >
          <ul className="mx-auto w-full max-w-7xl px-5 py-4 sm:px-8">
            {PRIMARY_NAV.map((link) => {
              const active = isActivePath(pathname, link.href);
              return (
                <li
                  key={link.href}
                  className="border-b border-line-subtle last:border-b-0"
                >
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className="flex flex-col gap-1 py-4"
                  >
                    <span
                      className={cn(
                        "font-display text-xs tracking-[0.18em] uppercase",
                        active ? "text-gold-300" : "text-ink-100",
                      )}
                    >
                      {link.label}
                    </span>
                    {link.description ? (
                      <span className="text-xs text-ink-500">{link.description}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </header>
  );
}
