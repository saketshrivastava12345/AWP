import Link from "next/link";
import { Heart } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The saved-cars count. Hidden at zero — an empty badge is noise — and
 * spoken as part of the link's name ("Saved cars, 3 saved").
 */
export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!Number.isFinite(count) || count <= 0) return null;
  const shown = count > 99 ? "99+" : String(count);
  return (
    <>
      <span
        aria-hidden="true"
        data-count-badge=""
        className={cn(
          "pointer-events-none absolute top-0.5 right-0.5 grid h-4 min-w-4 place-items-center rounded-full",
          "bg-ink-50 px-1 font-sans text-nano leading-none font-semibold text-void tabular-nums",
          className,
        )}
      >
        {shown}
      </span>
      <span className="sr-only">, {count} saved</span>
    </>
  );
}

/**
 * Navbar link to /favorites. The count arrives as a slot: a server-rendered
 * <CountBadge> for signed-in visitors, the localStorage-backed guest count
 * otherwise, and nothing in the static fallback — the link itself is always
 * usable and always the same size, so nothing shifts when the count streams in.
 */
export function FavoritesLink({
  count,
  className,
}: {
  count?: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href="/favorites"
      className={cn(
        "relative grid size-11 shrink-0 place-items-center rounded-pill text-ink-200",
        "transition-colors duration-(--duration-fast) hover:bg-white/6 hover:text-ink-50",
        className,
      )}
    >
      <Heart className="size-[18px]" aria-hidden="true" />
      <span className="sr-only">Saved cars</span>
      {count}
    </Link>
  );
}
