import { cn } from "@/lib/utils";
import { monogramOf } from "./brand";

const SIZES = {
  sm: { box: "size-14", text: "text-[15px]", long: "text-[11px]" },
  md: { box: "size-20", text: "text-2xl", long: "text-base" },
  lg: {
    box: "size-24 sm:size-32",
    text: "text-3xl sm:text-5xl",
    long: "text-xl sm:text-3xl",
  },
} as const;

/**
 * A marque's typographic monogram in a machined tile.
 *
 * `logo_url` is empty for every maker today, and drawing a logo would mean
 * inventing one, so the tile carries the maker's initials set in the display
 * face instead. Decorative: the name is always printed next to it.
 */
export function Monogram({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const letters = monogramOf(name);
  const scale = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-grid shrink-0 place-items-center border border-line",
        "bg-linear-to-b from-surface-3 via-surface-2 to-surface-1",
        "shadow-[inset_0_1px_0_0_oklch(1_0_0/8%)]",
        scale.box,
        className,
      )}
    >
      {/* The corner brackets live on their own layer: hud-corners paints with
          `background`, which would otherwise replace the tile's gradient. */}
      <span className="pointer-events-none absolute inset-0 opacity-70 hud-corners" />
      <span
        className={cn(
          "gold-gradient-text font-display leading-none tracking-[0.02em]",
          letters.length >= 3 ? scale.long : scale.text,
        )}
      >
        {letters}
      </span>
    </span>
  );
}
