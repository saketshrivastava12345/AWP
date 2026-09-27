"use client";

import Link from "next/link";
import { useTransition, type MouseEvent } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { useFavorites, useIsFavorite } from "@/lib/favorites/hooks";
import { setFavorite, type ToggleResult } from "@/lib/favorites/store";
import { MAX_GUEST_FAVORITES } from "@/lib/favorites/constants";

export type FavoriteToggleProps = {
  variantId: string;
  /** Spoken in the button's name: "Save Porsche 911 GT3". */
  carName: string;
  /**
   * "button": a labelled control for a detail page.
   * "icon": a 44px heart for a card's corner. It stops the click there, so a
   * card that is itself a link does not navigate.
   */
  appearance?: "button" | "icon";
  className?: string;
};

type Notify = ReturnType<typeof useToast>;

function reportResult(result: ToggleResult, carName: string, toast: Notify): void {
  if (result.ok) {
    if (!result.saved) {
      toast({ title: "Removed from favourites", description: carName });
    } else if (result.where === "account") {
      toast({ title: "Saved to your favourites", description: carName, tone: "success" });
    } else if (result.where === "device") {
      toast({
        title: "Saved on this device",
        description: "Sign in to keep your saved cars on every device.",
        tone: "success",
      });
    } else {
      toast({
        title: "Saved for this visit only",
        description:
          "This browser is blocking site storage, so it will be forgotten when you leave. Sign in to keep it.",
      });
    }
    return;
  }

  switch (result.reason) {
    case "full":
      toast({
        title: "This device is full",
        description: `A browser can keep ${MAX_GUEST_FAVORITES} saved cars. Sign in to save more, or remove some first.`,
        tone: "error",
      });
      return;
    case "not_found":
      toast({
        title: "This car is no longer in the catalogue",
        description: "It could not be saved.",
        tone: "error",
      });
      return;
    default:
      toast({
        title: result.saved ? `Couldn’t remove ${carName}` : `Couldn’t save ${carName}`,
        description: "Check your connection and try again.",
        tone: "error",
      });
  }
}

/**
 * Save or remove a car — for everyone, signed in or not.
 *
 * Needs no server-provided state (so the pages it sits on stay static): the
 * shared favourites store reads the session and the saved list once per
 * page load. Guests save to this browser; signed-in visitors to their
 * account, and anything saved as a guest moves into the account at sign-in.
 *
 * The heart changes immediately and reverts, with a toast, if the save fails.
 */
export function FavoriteToggle({
  variantId,
  carName,
  appearance = "button",
  className,
}: FavoriteToggleProps) {
  const saved = useIsFavorite(variantId);
  const toast = useToast();
  const [, startTransition] = useTransition();

  const onClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (appearance === "icon") {
      // Inside a card whose whole surface is a link.
      event.preventDefault();
      event.stopPropagation();
    }
    const want = !saved;
    startTransition(async () => {
      const result = await setFavorite(variantId, want);
      reportResult(result, carName, toast);
    });
  };

  // The name states the action and so changes with the state; aria-pressed is
  // deliberately absent, or the state would be announced twice and contradict
  // itself ("Remove X from favourites, pressed"). APG: a toggle's name must
  // not change, so it is one or the other.
  const label = saved ? `Remove ${carName} from favourites` : `Save ${carName}`;

  if (appearance === "icon") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        data-favorite-toggle=""
        className={cn(
          "relative grid size-11 shrink-0 place-items-center rounded-full border backdrop-blur-sm",
          "transition-colors duration-(--duration-fast)",
          "outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
          saved
            ? "border-gold-600 bg-void/70 text-gold-300 hover:bg-void/85"
            : "border-line-strong bg-void/55 text-ink-100 hover:border-gold-600 hover:text-gold-200",
          className,
        )}
      >
        <Heart
          className={cn(
            "size-4 transition-transform duration-(--duration-fast)",
            saved && "fill-current",
          )}
          aria-hidden="true"
        />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-favorite-toggle=""
      className={cn(
        "inline-flex h-11 min-w-11 items-center justify-center gap-2.5 rounded-xs border px-4",
        "font-display text-micro tracking-button uppercase",
        "transition-colors duration-(--duration-fast)",
        "outline-none focus-visible:ring-2 focus-visible:ring-gold-500 focus-visible:ring-offset-2 focus-visible:ring-offset-void",
        saved
          ? "border-gold-500 bg-gold-800/20 text-gold-300 hover:bg-gold-800/30"
          : "border-line-strong text-ink-200 hover:border-gold-600 hover:text-gold-200",
        className,
      )}
    >
      <Heart className={cn("size-3.5", saved && "fill-current")} aria-hidden="true" />
      {/* The visible word is part of the accessible name (WCAG 2.5.3), and
          the rest names the car and what pressing will do. */}
      {saved ? (
        <>
          Saved<span className="sr-only">, remove {carName} from favourites</span>
        </>
      ) : (
        <>
          Save<span className="sr-only"> {carName}</span>
        </>
      )}
    </button>
  );
}

/**
 * A one-line status for the saved state, for use beside a FavoriteToggle on a
 * detail page: where the save lives and, for guests, how to keep it.
 */
export function FavoriteHint({
  variantId,
  signInHref = "/login",
  className,
}: {
  variantId: string;
  signInHref?: string;
  className?: string;
}) {
  const saved = useIsFavorite(variantId);
  const { ready, signedIn } = useFavorites();
  if (!ready || !saved) return null;
  return (
    <p className={cn("text-xs text-ink-400", className)}>
      {signedIn ? (
        "Saved to your account."
      ) : (
        <>
          Saved on this device.{" "}
          <Link
            href={signInHref}
            className="text-gold-300 underline-offset-4 hover:underline"
          >
            Sign in
          </Link>{" "}
          to keep it everywhere.
        </>
      )}
    </p>
  );
}

/**
 * Backwards-compatible export. The old props (`initialFavorited`,
 * `signedIn`) are accepted and ignored: the store knows both without a
 * server round trip, which is what lets the detail page stay static.
 * Prefer `FavoriteToggle`.
 */
export function FavoriteButton({
  variantId,
  carName,
  className,
}: {
  variantId: string;
  carName?: string;
  /** @deprecated Ignored; the store reads it. */
  initialFavorited?: boolean;
  /** @deprecated Ignored; the store reads it. */
  signedIn?: boolean;
  className?: string;
}) {
  return (
    <FavoriteToggle
      variantId={variantId}
      carName={carName ?? "this car"}
      className={className}
    />
  );
}
