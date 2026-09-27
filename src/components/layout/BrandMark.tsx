import Link from "next/link";
import { cn } from "@/lib/utils";
import { MARK_PATHS, MARK_STROKES, MARK_VIEWBOX } from "./brand-mark";

/**
 * The AURIX mark: a wide "A" drawn as a chevron with a floating crossbar —
 * the same geometry as the favicon and the generated social images (see
 * brand-mark.ts), so the brand reads identically everywhere.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("size-5 text-gold-500", className)}
    >
      <path
        d={MARK_PATHS.chevron}
        stroke="currentColor"
        strokeWidth={MARK_STROKES.chevron}
        strokeLinejoin="miter"
        strokeMiterlimit="10"
      />
      <path d={MARK_PATHS.bar} stroke="currentColor" strokeWidth={MARK_STROKES.bar} />
    </svg>
  );
}

/** Mark plus wordmark, linking home. */
export function Wordmark({
  className,
  onClick,
}: {
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href="/"
      onClick={onClick}
      aria-label="AURIX home"
      className={cn(
        "group -mx-1 inline-flex h-11 items-center gap-3 rounded-xs px-1",
        className,
      )}
    >
      <BrandMark className="size-[18px] transition-colors duration-(--duration-fast) group-hover:text-gold-400" />
      {/* The only Michroma on the page besides an optional nameplate. The
          trailing tracking is trimmed so the word centres optically. */}
      <span className="-mr-[0.24em] font-brand text-base leading-none tracking-[0.24em] text-ink-50 md:text-[18px]">
        AURIX
      </span>
    </Link>
  );
}
