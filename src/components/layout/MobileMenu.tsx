"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Heart, Search, X } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { IconButton } from "@/components/ui/IconButton";
import { ShortcutHint } from "@/components/ui/Kbd";
import { PRIMARY_NAV, SECONDARY_NAV, isActivePath, navIndex } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { Wordmark } from "./BrandMark";

/** Delay between successive rows of the entrance cascade. */
const STAGGER_MS = 45;

function stagger(step: number): CSSProperties {
  return { "--stagger": `${90 + step * STAGGER_MS}ms` } as CSSProperties;
}

/* Entrance: rise-in with a per-row delay held in --stagger. Under reduced
   motion the global backstop removes the movement, and the delay is dropped
   too so nothing pops in late. */
const REVEAL =
  "animate-rise-in [animation-delay:var(--stagger)] motion-reduce:[animation-delay:0ms]";

/**
 * The phone and tablet navigation: a full-screen panel rather than a
 * shrunken copy of the desktop bar. Large numbered display-type links with a
 * line of context each, the search entry, saved cars and the account.
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
      className="bottom-auto h-dvh border-0 bg-void shadow-none"
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
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line-subtle px-5 sm:px-8">
        <Wordmark onClick={onClose} />
        <IconButton label="Close menu" onClick={onClose} className="-mr-2.5">
          <X className="size-5" aria-hidden="true" />
        </IconButton>
      </div>

      <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {/* Decorative engineering grid behind the list. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[28rem] tech-grid opacity-60"
        />

        <div className="relative mx-auto flex min-h-full w-full max-w-2xl flex-col px-5 pt-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8 sm:pt-10">
          <button
            type="button"
            onClick={onOpenSearch}
            style={stagger(0)}
            className={cn(
              REVEAL,
              "flex h-12 w-full items-center gap-3 rounded-sm border border-line bg-surface-1/80 px-4",
              "text-left text-sm text-ink-400 transition-colors duration-(--duration-fast)",
              "hover:border-line-strong hover:text-ink-200",
            )}
          >
            <Search className="size-4 shrink-0 text-gold-500" aria-hidden="true" />
            <span className="flex-1 truncate">
              Search cars, marques, countries, parts
            </span>
            <ShortcutHint keyName="K" className="hidden sm:inline-flex" />
          </button>

          <nav aria-label="Menu" className="mt-6 sm:mt-8">
            <ol className="border-t border-line">
              {PRIMARY_NAV.map((link, index) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <li
                    key={link.href}
                    style={stagger(index + 1)}
                    className={cn(REVEAL, "border-b border-line")}
                  >
                    <Link
                      href={link.href}
                      onClick={onClose}
                      aria-current={
                        active ? (pathname === link.href ? "page" : "true") : undefined
                      }
                      className="group flex min-h-[4.75rem] items-center gap-4 py-4 sm:min-h-24"
                    >
                      <span
                        className={cn(
                          "w-6 shrink-0 self-start pt-1.5 font-mono text-micro tabular-nums",
                          active ? "text-gold-400" : "text-ink-500",
                        )}
                      >
                        {navIndex(index)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block font-display text-lg leading-tight tracking-[0.08em] uppercase",
                            "min-[400px]:text-xl sm:text-[1.625rem]",
                            "transition-colors duration-(--duration-fast)",
                            active
                              ? "text-gold-300"
                              : "text-ink-50 group-hover:text-gold-200",
                          )}
                        >
                          {link.label}
                        </span>
                        {link.description ? (
                          <span className="mt-1.5 block text-sm text-ink-400">
                            {link.description}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className={cn(
                          "size-4 shrink-0 transition-[color,translate] duration-(--duration-fast)",
                          "group-hover:translate-x-0.5",
                          active
                            ? "text-gold-400"
                            : "text-ink-500 group-hover:text-gold-300",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ol>
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
                  className="inline-flex min-h-11 items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-gold-300"
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
                  className="inline-flex min-h-11 items-center text-sm text-ink-300 transition-colors hover:text-gold-300 aria-[current]:text-gold-300"
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
                "group flex h-14 items-center gap-3 rounded-md border border-line bg-surface-1 px-4",
                "transition-colors duration-(--duration-fast) hover:border-line-strong",
                // The count badge is shared with the desktop bar, where it is
                // pinned to the icon's corner; here it sits inline.
                "[&_[data-count-badge]]:static [&_[data-count-badge]]:h-5 [&_[data-count-badge]]:min-w-5",
                "[&_[data-count-badge]]:text-micro",
              )}
            >
              <Heart className="size-4 shrink-0 text-gold-500" aria-hidden="true" />
              <span className="flex-1 text-sm text-ink-100">Saved cars</span>
              {favoritesCount}
              <ArrowRight
                className="size-4 shrink-0 text-ink-500 transition-colors group-hover:text-gold-300"
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
