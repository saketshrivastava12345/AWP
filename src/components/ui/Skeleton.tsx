import { cn } from "@/lib/utils";

/**
 * Loading placeholder. The shimmer is a background animation rather than an
 * opacity pulse, so the reduced-motion rule in globals.css stops it cleanly
 * without leaving the element invisible.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-xs bg-surface-2",
        "after:absolute after:inset-0 after:animate-[shimmer_1.8s_infinite]",
        "after:bg-gradient-to-r after:from-transparent after:via-white/[0.04] after:to-transparent",
        className,
      )}
    />
  );
}

/** A spec row placeholder, sized to match SpecSection's real rows. */
export function SkeletonSpecRow() {
  return (
    <div className="flex items-center justify-between border-b border-line-subtle py-3">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
