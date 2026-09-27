import Link from "next/link";
import { LayoutDashboard, LogIn, LogOut, UserRound } from "lucide-react";
import { getSessionUser, type SessionUser } from "@/lib/queries/auth";
import { countFavorites } from "@/lib/queries/favorites";
import { signOut } from "@/app/auth/actions";
import { ButtonLink } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ACCOUNT_BOX, type AccountSummary } from "./account-shared";
import { AccountMenuButton, Avatar } from "./AccountMenuButton";
import { GuestFavoritesCount } from "./GuestFavoritesCount";
import { SignedInFavoritesCount } from "./SignedInFavoritesCount";

/*
 * The session-dependent parts of the navigation. Each is a server component
 * rendered inside its own <Suspense> in the root layout, so under Partial
 * Prerendering it streams in as a small dynamic hole while every page keeps a
 * fully static shell. getSessionUser is cache()-wrapped, so all of them share
 * one auth round trip per request.
 */

function summarise(user: SessionUser): AccountSummary {
  const fromEmail = user.email?.split("@")[0]?.trim() || null;
  const name = user.displayName?.trim() || fromEmail || "Account";
  return {
    name,
    email: user.email,
    initial: name.charAt(0).toUpperCase(),
    isAdmin: user.role === "admin",
  };
}

/**
 * The saved-cars count for the navbar: counted in the database for a signed-in
 * visitor (RLS limits the count to their own rows) and kept current after
 * client-side changes, read from this browser's storage for a guest.
 */
export async function FavoritesCount() {
  const user = await getSessionUser();
  if (!user) return <GuestFavoritesCount />;
  return <SignedInFavoritesCount count={await countFavorites()} />;
}

/** Desktop account control: "Sign in", or the account menu button. */
export async function AccountMenu() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className={cn(
          ACCOUNT_BOX,
          "inline-flex items-center justify-center gap-2 rounded-sm border border-line text-ink-200",
          "font-display text-micro tracking-button uppercase transition-colors duration-(--duration-fast)",
          "hover:border-gold-600 hover:text-gold-200",
        )}
      >
        <LogIn className="size-4 shrink-0 xl:size-3.5" aria-hidden="true" />
        {/* Visible from xl; always the link's accessible name. */}
        <span className="sr-only xl:not-sr-only">Sign in</span>
      </Link>
    );
  }

  return <AccountMenuButton account={summarise(user)} signOutAction={signOut} />;
}

/** Same footprint as either resolved state, so nothing moves when it streams in. */
export function AccountMenuFallback() {
  return (
    <span
      aria-hidden="true"
      className={cn(
        ACCOUNT_BOX,
        "block rounded-sm border border-line-subtle bg-surface-1/60",
      )}
    />
  );
}

const PANEL_BUTTON =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-xs border border-line " +
  "font-display text-[11px] tracking-button text-ink-300 uppercase transition-colors " +
  "duration-(--duration-fast) hover:border-line-strong hover:text-ink-50";

/** The account block at the foot of the mobile menu. */
export async function AccountPanel() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <div className="rounded-md border border-line bg-surface-1 p-5">
        <p className="text-label">Account</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-300">
          Sign in to keep your saved cars with your account, on any device.
        </p>
        <ButtonLink href="/login" className="mt-5 w-full">
          <LogIn className="size-3.5" aria-hidden="true" />
          Sign in
        </ButtonLink>
      </div>
    );
  }

  const account = summarise(user);
  return (
    <div className="rounded-md border border-line bg-surface-1 p-5">
      <div className="flex items-center gap-3">
        <Avatar initial={account.initial} className="size-10 text-xs" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink-50">{account.name}</p>
          {account.email ? (
            <p className="truncate text-xs text-ink-400">{account.email}</p>
          ) : null}
        </div>
        {account.isAdmin ? <span className="text-hud text-gold-400">Admin</span> : null}
      </div>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <Link href="/account" className={PANEL_BUTTON}>
          <UserRound className="size-3.5" aria-hidden="true" />
          Account
        </Link>
        {account.isAdmin ? (
          <Link href="/admin" className={PANEL_BUTTON}>
            <LayoutDashboard className="size-3.5 text-gold-500" aria-hidden="true" />
            Admin dashboard
          </Link>
        ) : null}
        <form action={signOut} className={cn(account.isAdmin && "sm:col-span-2")}>
          <button type="submit" className={PANEL_BUTTON}>
            <LogOut className="size-3.5" aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

/** Roughly the signed-in panel's height, so the menu does not jump as it streams in. */
export function AccountPanelFallback() {
  return (
    <div
      aria-hidden="true"
      className="h-[10.5rem] rounded-md border border-line-subtle bg-surface-1/60"
    />
  );
}
