import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { usageLabel } from "./parts-helpers";

export type PartCardData = {
  slug: string;
  name: string;
  /** One line on what the part does. */
  summary: string | null;
  categoryName?: string | null;
  /** The 3D system it belongs to (a viewer group label). */
  systemLabel?: string | null;
  /** Published cars that record the part; nothing is shown when zero. */
  usageCount?: number;
};

/**
 * A component in the encyclopedia: its name, category, what it does in one
 * line, the 3D system it belongs to and, when any catalogued car records it,
 * how many do. Server-safe; also rendered by the client-side explorer.
 */
export function PartCard({
  part,
  className,
}: {
  part: PartCardData;
  className?: string;
}) {
  const usage = usageLabel(part.usageCount ?? 0);

  return (
    <Link
      href={`/parts/${part.slug}`}
      className={cn(
        "group edge-light relative flex h-full flex-col border border-line bg-surface-1/70 p-5",
        "transition-colors duration-(--duration-fast) ease-cinematic",
        "hover:border-gold-800 hover:bg-surface-2/70",
        className,
      )}
    >
      <div className="flex min-h-5 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
        {part.categoryName ? (
          <span className="text-hud">{part.categoryName}</span>
        ) : (
          <span />
        )}
        {part.systemLabel ? (
          <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-gold-400/90 uppercase">
            <span className="size-1.5 rounded-full bg-gold-500/80" aria-hidden="true" />
            <span className="sr-only">3D system: </span>
            {part.systemLabel}
          </span>
        ) : null}
      </div>

      <h3 className="mt-4 font-display text-xs leading-snug tracking-button break-words text-ink-50 uppercase transition-colors duration-(--duration-fast) group-hover:text-gold-200">
        {part.name}
      </h3>

      {part.summary ? (
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink-400">
          {part.summary}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-3.5">
          <span className="tabular font-mono text-[11px] text-ink-400">
            {usage ?? ""}
          </span>
          <ArrowUpRight
            className="size-4 shrink-0 text-ink-500 transition-[color,transform] duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-300"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
