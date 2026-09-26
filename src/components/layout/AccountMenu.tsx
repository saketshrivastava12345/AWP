import Link from "next/link";
import { Heart, LogIn, Shield } from "lucide-react";
import { getSessionUser } from "@/lib/queries/auth";
import { signOut } from "@/app/login/actions";

/**
 * Account controls in the navbar.
 *
 * A server component, so the signed-in state is correct in the very first
 * HTML — no flash of "Sign in" for a user who is already authenticated.
 * Sign-out is a server action, which means it works without JavaScript and
 * cannot be triggered cross-site by a plain GET.
 */
export async function AccountMenu() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 rounded-xs border border-line px-3 py-2 font-display text-[10px] tracking-[0.14em] text-ink-400 uppercase transition-colors hover:border-line-strong hover:text-ink-100"
      >
        <LogIn className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      {user.role === "admin" ? (
        <Link
          href="/admin"
          aria-label="Admin dashboard"
          className="rounded-xs border border-gold-700 p-2 text-gold-300 transition-colors hover:border-gold-500"
        >
          <Shield className="size-3.5" aria-hidden="true" />
        </Link>
      ) : null}

      <Link
        href="/favorites"
        aria-label="Saved cars"
        className="rounded-xs border border-line p-2 text-ink-300 transition-colors hover:border-line-strong hover:text-gold-300"
      >
        <Heart className="size-3.5" aria-hidden="true" />
      </Link>

      <form action={signOut}>
        <button
          type="submit"
          className="px-2 py-2 font-display text-[10px] tracking-[0.14em] text-ink-500 uppercase transition-colors hover:text-ink-200"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
