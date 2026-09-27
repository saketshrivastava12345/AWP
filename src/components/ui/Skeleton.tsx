import { cn } from "@/lib/utils";

/**
 * Loading placeholder. The shimmer is a highlight sweeping across rather than
 * an opacity pulse, so the reduced-motion rule in globals.css stops it cleanly
 * (the highlight comes to rest off-screen) without leaving the element
 * invisible.
 *
 * The highlight starts one full width to the left — the shared `shimmer`
 * keyframe only defines its end — so each sweep enters from outside instead
 * of appearing already on top of the block.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden rounded-xs bg-surface-2",
        "after:absolute after:inset-0 after:[transform:translateX(-100%)]",
        "after:animate-[shimmer_1.8s_var(--ease-metal)_infinite]",
        "after:bg-linear-to-r after:from-transparent after:via-white/[0.045] after:to-transparent",
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
