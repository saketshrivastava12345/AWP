import Link from "next/link";
import { GlassCard } from "@/components/ui/GlassCard";
import type { CountryWithCounts } from "@/types/domain";

export function CountryCard({ country }: { country: CountryWithCounts }) {
  return (
    <GlassCard
      as={Link}
      href={`/countries/${country.slug}`}
      interactive
      className="group flex flex-col rounded-none p-7"
    >
      <div className="flex items-baseline gap-3">
        <span className="text-2xl leading-none" aria-hidden="true">
          {country.flag_emoji}
        </span>
        <h3 className="font-display text-sm tracking-[0.1em] text-ink-50">
          {country.name}
        </h3>
      </div>

      {country.description ? (
        <p className="mt-5 line-clamp-3 flex-1 text-sm leading-relaxed text-ink-400">
          {country.description}
        </p>
      ) : null}

      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line-subtle pt-4">
        <div>
          <dt className="text-label text-[8px]">Manufacturers</dt>
          <dd className="tabular mt-1.5 font-mono text-xs text-ink-100">
            {country.manufacturer_count}
          </dd>
        </div>
        <div>
          <dt className="text-label text-[8px]">Cars</dt>
          <dd className="tabular mt-1.5 font-mono text-xs text-ink-100">
            {country.variant_count}
          </dd>
        </div>
      </dl>
    </GlassCard>
  );
}
