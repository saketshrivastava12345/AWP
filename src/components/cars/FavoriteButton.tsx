"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/app/favorites/actions";

/**
 * Save / unsave a car.
 *
 * Optimistic: the heart fills immediately and reverts if the server disagrees,
 * because waiting for a round trip to acknowledge a bookmark feels broken.
 * Signed-out visitors are sent to /login rather than shown a disabled control
 * with no explanation.
 */
export function FavoriteButton({
  variantId,
  initialFavorited,
  signedIn,
  className,
}: {
  variantId: string;
  initialFavorited: boolean;
  signedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onClick = () => {
    if (!signedIn) {
      router.push("/login");
      return;
    }

    const previous = favorited;
    setFavorited(!previous);
    setError(null);

    startTransition(async () => {
      const result = await toggleFavorite(variantId, previous);
      if (!result.ok) {
        setFavorited(previous);
        setError(result.error ?? "Could not save that just now.");
      }
    });
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        aria-pressed={signedIn ? favorited : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-xs border px-4 py-2.5 font-display",
          "text-[10px] tracking-[0.14em] uppercase transition-colors duration-200",
          favorited
            ? "border-gold-500 bg-gold-800/20 text-gold-300"
            : "border-line text-ink-300 hover:border-line-strong hover:text-ink-100",
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Heart
            className={cn("size-3.5", favorited && "fill-current")}
            aria-hidden="true"
          />
        )}
        {favorited ? "Saved" : "Save car"}
      </button>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-signal-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}
