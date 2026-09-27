import { cn } from "@/lib/utils";
import { monogramOf } from "./brand";

const SIZES = {
  sm: { box: "size-12", text: "text-base", long: "text-xs" },
  md: { box: "size-20", text: "text-2xl", long: "text-base" },
  lg: {
    box: "size-24 sm:size-32",
    text: "text-3xl sm:text-5xl",
    long: "text-xl sm:text-3xl",
  },
} as const;

/**
 * A brand's typographic monogram: its initials on a quiet rounded tile.
 *
 * `logo_url` is empty for every maker today, and drawing a logo would mean
 * inventing one, so the tile carries the initials instead. Decorative: the
 * name is always printed next to it. No gold and no corner brackets; the
 * brand pages no longer use it, and it remains for teasers that do.
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
        "inline-grid shrink-0 place-items-center rounded-card bg-surface-2",
        scale.box,
        className,
      )}
    >
      <span
        className={cn(
          "font-display leading-none font-medium text-ink-200",
          letters.length >= 3 ? scale.long : scale.text,
        )}
      >
        {letters}
      </span>
    </span>
  );
}
