import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Part } from "@/types/domain";

export function PartCard({ part, className }: { part: Part; className?: string }) {
  return (
    <Link
      href={`/parts/${part.slug}`}
      className={cn(
        "group border-line bg-surface-1/50 hover:border-gold-700 hover:bg-surface-2/50",
        "flex flex-col border p-5 transition-colors duration-300",
        className,
      )}
    >
      <h3 className="font-display text-[11px] tracking-[0.14em] text-ink-100 uppercase transition-colors group-hover:text-gold-300">
        {part.name}
      </h3>
      {part.description ? (
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-ink-500">
          {part.description}
        </p>
      ) : null}
    </Link>
  );
}
