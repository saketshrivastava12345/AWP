import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { formatEnumLabel } from "@/lib/format";
import type { ManufacturerWithCountry } from "@/types/domain";

export function ManufacturerCard({
  manufacturer,
}: {
  manufacturer: ManufacturerWithCountry;
}) {
  return (
    <GlassCard
      as={Link}
      href={`/manufacturers/${manufacturer.slug}`}
      interactive
      className="group flex flex-col rounded-none p-7"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate font-display text-sm tracking-[0.1em] text-ink-50">
            {manufacturer.name}
          </h3>
          <p className="mt-2 text-xs text-ink-500">
            {manufacturer.country?.flag_emoji} {manufacturer.country?.name}
            {manufacturer.founded_year ? ` · est. ${manufacturer.founded_year}` : ""}
          </p>
        </div>
        <Badge tone={manufacturer.segment === "performance" ? "gold" : "neutral"}>
          {formatEnumLabel(manufacturer.segment)}
        </Badge>
      </div>

      {manufacturer.headquarters ? (
        <p className="mt-4 text-xs text-ink-600">{manufacturer.headquarters}</p>
      ) : null}

      {manufacturer.description ? (
        <p className="mt-5 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-400">
          {manufacturer.description}
        </p>
      ) : null}

      <p className="mt-6 border-t border-line-subtle pt-4 font-mono text-xs text-ink-500">
        {manufacturer.model_count} {manufacturer.model_count === 1 ? "model" : "models"}
      </p>
    </GlassCard>
  );
}
