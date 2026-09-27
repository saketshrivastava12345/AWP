"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Heart, Search, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { ShortcutHint } from "@/components/ui/Kbd";
import { CONTAINER_GUTTERS } from "@/components/ui/Container";
import { PRIMARY_NAV, SECONDARY_NAV, isActivePath } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { GridBackground, Scanlines } from "@/components/fx/Backgrounds";
import { Wordmark } from "./BrandMark";

/** Delay between successive rows of the entrance cascade. */
const STAGGER_MS = 45;

function stagger(step: number): CSSProperties {
  return { "--stagger": `${90 + step * STAGGER_MS}ms` } as CSSProperties;
}

/* Entrance: each row slides in from the left out of a blur, one after the
   other (delay held in --stagger; `backwards` fill, so nothing lingers).
   Under reduced motion the backstop removes the movement and the delay is
   dropped too, so nothing pops in late. */
const REVEAL =
  "animate-[menu-row-in_var(--duration-slow)_var(--ease-cinematic)_backwards] " +
  "[animation-delay:var(--stagger)] motion-reduce:[animation-delay:0ms]";

/**
 * The phone and tablet navigation: a full-screen panel rather than a
 * shrunken copy of the desktop bar. Large sentence-case links with a line of
 * context each, the search entry on top, saved cars and the account below.
 *
 * Built on the shared Dialog, so Escape, the focus trap, focus return and the
 * scroll lock behave exactly like every other modal. Its header mirrors the
 * navbar's geometry so the close button lands where the menu button was.
 */
export function MobileMenu({
  open,
  onClose,
  onOpenSearch,
  favoritesCount,
  account,
}: {
  open: boolean;
  onClose: () => void;
  onOpenSearch: () => void;
  favoritesCount: ReactNode;
  account: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Menu"
      hideTitle
      placement="full"
      className="bottom-auto h-dvh border-0 bg-void/95 shadow-none"
      bodyClassName="flex flex-col overflow-hidden p-0 sm:p-0"
    >
      <MenuContent
        onClose={onClose}
        onOpenSearch={onOpenSearch}
        favoritesCount={favoritesCount}
        account={account}
      />
    </Dialog>
  );
}

/**
 * The panel itself. A separate component so the current path is read only
 * while the menu is open — never while the page is being prerendered, where
 * usePathname() would suspend on routes whose params resolve at request time.
 */
function MenuContent({
  onClose,
  onOpenSearch,
  favoritesCount,
  account,
}: {
  onClose: () => void;
  onOpenSearch: () => void;
  favoritesCount: ReactNode;
  account: ReactNode;
}) {
  const pathname = usePathname();
  const [openedOn] = useState(pathname);

  // Any navigation closes the menu — a link in it (which also closes it on
  // click), the palette opened from it, or the browser's back button.
  useEffect(() => {
    if (pathname !== openedOn) onClose();
  }, [pathname, openedOn, onClose]);

  return (
    <>
      <div
        className={cn(
          "flex h-(--nav-h) shrink-0 items-center justify-between border-b border-line-subtle",
          CONTAINER_GUTTERS,
        )}
      >
        <Wordmark onClick={onClose} />
        <IconButton label="Close menu" onClick={onClose} className="-mr-2.5">
          <X className="size-5" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="relative isolate min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <GridBackground />
        <Scanlines beam />
        <div
          className={cn(
            "relative mx-auto flex min-h-full w-full max-w-2xl flex-col pt-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:pt-8",
            CONTAINER_GUTTERS,
          )}
        >
          <button
            type="button"
            onClick={onOpenSearch}
            style={stagger(0)}
            className={cn(
              REVEAL,
              "flex h-12 w-full items-center gap-3 rounded-control border border-cyan-400/30 bg-surface-1/80 px-4",
              "text-left text-[15px] text-ink-300 transition-[color,border-color,box-shadow] duration-(--duration-fast)",
              "hover:border-cyan-300 hover:text-ink-100 hover:shadow-[0_0_18px_-6px_var(--color-cyan-400)]",
            )}
          >
            <Search className="size-[18px] shrink-0 text-cyan-300" aria-hidden="true" />
            <span className="flex-1 truncate">Search cars, brands, countries, parts</span>
            <ShortcutHint keyName="K" className="hidden sm:inline-flex" />
          </button>

          <nav aria-label="Menu" className="mt-4 sm:mt-6">
            <ul>
              {PRIMARY_NAV.map((link, index) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li
                    key={link.href}
                    style={stagger(index + 1)}
                    className={cn(REVEAL, "border-b border-line-subtle")}
                  >
                    <Link
                      href={link.href}
                      onClick={onClose}
                      aria-current={
                        active ? (pathname === link.href ? "page" : "true") : undefined
                      }
                      className="group relative flex min-h-20 items-center gap-4 py-4"
                    >
                      {/* Active state: a lit cyan bar. */}
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute top-1/2 -left-3 h-8 w-0.5 -translate-y-1/2 bg-cyan-300 shadow-[0_0_10px_var(--color-cyan-400)] sm:-left-4"
                        />
                      ) : null}
                      <span
                        aria-hidden="true"
                        className="self-start pt-2 font-mono text-[11px] tracking-[0.2em] text-cyan-300/70"
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-h2 transition-[color,text-shadow] duration-(--duration-fast)",
                            active
                              ? "text-cyan-100 [text-shadow:0_0_18px_oklch(0.83_0.13_210/45%)]"
                              : "text-ink-100 group-hover:text-ink-50",
                          )}
                        >
                          {link.label}
                        </span>
                        {link.description ? (
                          <span className="mt-1 block text-body-s text-ink-400">
                            {link.description}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className={cn(
                          "size-5 shrink-0 text-ink-400 transition-[color,translate] duration-(--duration-fast)",
                          "group-hover:translate-x-1 group-hover:text-cyan-300",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div
            style={stagger(PRIMARY_NAV.length + 1)}
            className={cn(REVEAL, "mt-6 flex flex-wrap gap-x-6 gap-y-1")}
          >
            {SECONDARY_NAV.map((link) =>
              link.external ? (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 text-body-s text-ink-300 transition-colors hover:text-ink-50"
                >
                  {link.label}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  aria-current={pathname === link.href ? "page" : undefined}
                  className="inline-flex min-h-11 items-center text-body-s text-ink-300 transition-colors hover:text-ink-50 aria-[current]:text-ink-50"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>

          <div
            style={stagger(PRIMARY_NAV.length + 2)}
            className={cn(REVEAL, "mt-auto space-y-3 pt-10")}
          >
            <Link
              href="/favorites"
              onClick={onClose}
              aria-current={pathname === "/favorites" ? "page" : undefined}
              className={cn(
                "group flex h-14 items-center gap-3 rounded-card border border-line bg-surface-1/80 px-4",
                "transition-colors duration-(--duration-fast) hover:border-cyan-400/40 hover:bg-surface-2",
                // The count badge is shared with the desktop bar, where it is
                // pinned to the icon's corner; here it sits inline.
                "[&_[data-count-badge]]:static [&_[data-count-badge]]:h-5 [&_[data-count-badge]]:min-w-5",
                "[&_[data-count-badge]]:text-micro",
              )}
            >
              <Heart className="size-[18px] shrink-0 text-ink-300" aria-hidden="true" />
              <span className="flex-1 text-body-s text-ink-50">Saved cars</span>
              {favoritesCount}
              <ArrowRight
                className="size-4 shrink-0 text-ink-400 transition-colors group-hover:text-ink-50"
                aria-hidden="true"
              />
            </Link>

            {/* Server-rendered account block; links inside it close the menu. */}
            <div
              onClickCapture={(event) => {
                if ((event.target as Element).closest("a[href]")) onClose();
              }}
            >
              {account}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
