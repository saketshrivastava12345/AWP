import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { Monogram } from "./Monogram";
import { SEGMENT_LABELS } from "./brand";
import type { ManufacturerListItem } from "@/lib/queries/manufacturers";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/**
 * A marque in the directory. The whole card is one link; everything on it is
 * read from the manufacturer row, and the counts include published cars only.
 */
export function ManufacturerCard({
  maker,
  className,
}: {
  maker: ManufacturerListItem;
  className?: string;
}) {
  const counts =
    maker.model_count > 0
      ? `${plural(maker.model_count, "model", "models")} · ${plural(
          maker.variant_count,
          "variant",
          "variants",
        )}`
      : "No published cars yet";

  return (
    <Link
      href={`/manufacturers/${maker.slug}`}
      className={cn(
        "group edge-light relative flex h-full flex-col border border-line bg-surface-1/70 p-5 sm:p-6",
        "transition-colors duration-(--duration-fast) ease-cinematic",
        "hover:border-line-strong hover:bg-surface-2/70",
        className,
      )}
    >
      <div className="flex items-start gap-4">
        <Monogram
          name={maker.name}
          className="transition-colors duration-(--duration-fast) group-hover:border-gold-700/70"
        />
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-display text-sm leading-snug tracking-[0.08em] break-words text-ink-50">
            {maker.name}
          </h3>
          <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-400">
            {maker.country ? (
              <>
                <span aria-hidden="true">{maker.country.flag_emoji}</span>
                <span>{maker.country.name}</span>
              </>
            ) : null}
            {maker.country && maker.founded_year ? (
              <span aria-hidden="true" className="text-ink-600">
                ·
              </span>
            ) : null}
            {maker.founded_year ? (
              <span className="tabular">Est. {maker.founded_year}</span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Badge tone={maker.segment === "performance" ? "gold" : "neutral"}>
          {SEGMENT_LABELS[maker.segment]}
        </Badge>
      </div>

      {maker.headquarters ? (
        <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-ink-400">
          <MapPin className="mt-px size-3.5 shrink-0 text-ink-500" aria-hidden="true" />
          <span>
            <span className="sr-only">Headquarters: </span>
            {maker.headquarters}
          </span>
        </p>
      ) : null}

      {maker.description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink-400">
          {maker.description}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <div className="flex items-center justify-between gap-3 border-t border-line-subtle pt-4">
          <p className="tabular font-mono text-xs text-ink-300">{counts}</p>
          <ArrowUpRight
            className="size-4 shrink-0 text-ink-500 transition-[color,transform] duration-(--duration-fast) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-300"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
