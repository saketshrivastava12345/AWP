"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  Heart,
  LayoutDashboard,
  LoaderCircle,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_BOX, type AccountSummary } from "./account-shared";

export function Avatar({ initial, className }: { initial: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full bg-surface-3",
        "font-display text-sm leading-none font-medium text-ink-50",
        className,
      )}
    >
      {initial}
    </span>
  );
}

// Focus inside the menu is shown as a filled row with a gold rule on its
// leading edge — the browser outline would be clipped by the panel.
const ITEM =
  "flex min-h-11 w-full items-center gap-3 rounded-control px-3 text-left text-body-s text-ink-200 " +
  "outline-none transition-colors duration-(--duration-fast) hover:bg-surface-3 hover:text-ink-50 " +
  "focus-visible:bg-surface-3 focus-visible:text-ink-50 focus-visible:outline-none " +
  "focus-visible:shadow-[inset_2px_0_0_var(--color-gold-500)]";

/**
 * The signed-out account control: a plain "Sign in" text link (an icon below
 * xl). Not offered on the sign-in page itself, where it would only point at
 * the form already on screen; the footprint is kept so nothing shifts.
 */
export function SignInLink() {
  const pathname = usePathname();
  if (pathname === "/login") return <span aria-hidden="true" className={ACCOUNT_BOX} />;
  return (
    <span className={cn(ACCOUNT_BOX, "flex items-center justify-end")}>
      <Link
        href="/login"
        className={cn(
          "inline-flex h-11 min-w-11 items-center justify-center gap-2 rounded-pill text-ink-200",
          "font-display text-[15px] transition-colors duration-(--duration-fast)",
          "hover:bg-white/6 hover:text-ink-50 xl:px-3",
        )}
      >
        <LogIn className="size-[18px] shrink-0 xl:hidden" aria-hidden="true" />
        {/* Visible from xl; always the link's accessible name. */}
        <span className="max-xl:sr-only">Sign in</span>
      </Link>
    </span>
  );
}

/**
 * The signed-in account menu (WAI-ARIA menu button).
 *
 * Opens with click, Enter, Space or the arrow keys, putting focus on the first
 * (or, with ArrowUp, the last) item; arrows, Home and End move between items;
 * Escape closes and returns focus to the button; clicking outside or tabbing
 * away closes it. Sign-out is the existing server action, so it still posts
 * without JavaScript.
 */
export function AccountMenuButton({
  account,
  signOutAction,
}: {
  account: AccountSummary;
  signOutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last">("first");
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  // Following a link in the menu closes it.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }

  const items = () =>
    [
      ...(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []),
    ].filter((item) => !item.hasAttribute("disabled"));

  const openMenu = (focus: "first" | "last") => {
    focusOnOpen.current = focus;
    setOpen(true);
  };

  const closeMenu = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) buttonRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOnOpen.current === "last" ? list[list.length - 1] : list[0])?.focus();

    const onPointerDown = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const onButtonKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openMenu(event.key === "ArrowUp" ? "last" : "first");
    }
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const current = list.indexOf(document.activeElement as HTMLElement);
    const focusAt = (index: number) => list[(index + list.length) % list.length]?.focus();

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        focusAt(current + 1);
        break;
      case "ArrowUp":
        event.preventDefault();
        focusAt(current - 1);
        break;
      case "Home":
        event.preventDefault();
        focusAt(0);
        break;
      case "End":
        event.preventDefault();
        focusAt(list.length - 1);
        break;
      case "Escape":
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        break;
      case "Tab":
        // Let focus move on naturally, and fold the menu away behind it.
        setOpen(false);
        break;
    }
  };

  return (
    <div
      ref={wrapperRef}
      className={cn(ACCOUNT_BOX, "relative flex items-center justify-end")}
      onBlur={(event) => {
        if (open && !wrapperRef.current?.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Account: ${account.name}`}
        onClick={() => (open ? closeMenu(false) : openMenu("first"))}
        onKeyDown={onButtonKeyDown}
        className={cn(
          "grid size-11 place-items-center rounded-pill transition-colors duration-(--duration-fast)",
          "hover:bg-white/6",
          open && "bg-white/6",
        )}
      >
        <Avatar initial={account.initial} />
      </button>

      {open ? (
        <div
          className={cn(
            "absolute top-[calc(100%+0.5rem)] right-0 z-(--z-raised) w-72 animate-panel-in overflow-hidden rounded-card",
            "border border-line bg-surface-1 shadow-overlay",
          )}
        >
          <div className="flex items-center gap-3 border-b border-line-subtle px-4 py-4">
            <Avatar initial={account.initial} className="size-9" />
            <div className="min-w-0">
              <p className="truncate text-body-s text-ink-50">{account.name}</p>
              {account.email ? (
                <p className="truncate text-caption">{account.email}</p>
              ) : null}
              {account.isAdmin ? (
                <p className="mt-1 text-caption text-ink-300">Administrator</p>
              ) : null}
            </div>
          </div>

          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Account"
            onKeyDown={onMenuKeyDown}
            onClick={(event) => {
              // Choosing a link closes the menu even when it points at the
              // page already open (no pathname change to close it).
              if ((event.target as Element).closest("a[href]")) setOpen(false);
            }}
            className="flex flex-col gap-0.5 p-1.5"
          >
            <Link href="/account" role="menuitem" tabIndex={-1} className={ITEM}>
              <UserRound className="size-4 text-ink-400" aria-hidden="true" />
              Account
            </Link>
            <Link href="/favorites" role="menuitem" tabIndex={-1} className={ITEM}>
              <Heart className="size-4 text-ink-400" aria-hidden="true" />
              Saved cars
            </Link>
            {account.isAdmin ? (
              <Link href="/admin" role="menuitem" tabIndex={-1} className={ITEM}>
                <LayoutDashboard className="size-4 text-ink-400" aria-hidden="true" />
                Admin dashboard
              </Link>
            ) : null}
            <div role="separator" className="mx-2 my-1 h-px bg-line-subtle" />
            <form action={signOutAction} role="none">
              <SignOutItem />
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SignOutItem() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      tabIndex={-1}
      disabled={pending}
      aria-busy={pending || undefined}
      className={cn(ITEM, "disabled:opacity-60")}
    >
      {pending ? (
        <LoaderCircle className="size-4 animate-spin text-ink-400" aria-hidden="true" />
      ) : (
        <LogOut className="size-4 text-ink-400" aria-hidden="true" />
      )}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
