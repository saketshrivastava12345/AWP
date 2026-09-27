import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CountryListItem } from "@/lib/queries/countries";

/**
 * A country in the atlas grid. Hover and focus report back to the atlas, so
 * the matching marker on the map lights up; `active` is the reverse direction
 * (the marker is hovered, this card is highlighted).
 */
export function CountryCard({
  country,
  active = false,
  onActiveChange,
}: {
  country: CountryListItem;
  active?: boolean;
  onActiveChange?: (slug: string | null) => void;
}) {
  return (
    <Link
      href={`/countries/${country.slug}`}
      onMouseEnter={() => onActiveChange?.(country.slug)}
      onMouseLeave={() => onActiveChange?.(null)}
      onFocus={() => onActiveChange?.(country.slug)}
      onBlur={() => onActiveChange?.(null)}
      className={cn(
        "group edge-light relative flex h-full flex-col border bg-surface-1/70 p-5 sm:p-6",
        "transition-colors duration-(--duration-fast) ease-cinematic",
        active
          ? "border-gold-700/80 bg-surface-2/80"
          : "border-line hover:border-line-strong hover:bg-surface-2/70",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="text-3xl leading-none" aria-hidden="true">
            {country.flag_emoji}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm tracking-[0.08em] break-words text-ink-50">
              {country.name}
            </h3>
            <p className="mt-1 text-hud">{country.iso_code}</p>
          </div>
        </div>
        <ArrowUpRight
          className={cn(
            "size-4 shrink-0 transition-[color,transform] duration-(--duration-fast)",
            active
              ? "translate-x-0.5 -translate-y-0.5 text-gold-300"
              : "text-ink-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-gold-300",
          )}
          aria-hidden="true"
        />
      </div>

      {country.description ? (
        <p className="mt-5 line-clamp-3 text-sm leading-relaxed text-ink-400">
          {country.description}
        </p>
      ) : null}

      {country.makers.length > 0 ? (
        <p className="mt-4 text-xs leading-relaxed text-ink-300">
          <span className="sr-only">Manufacturers: </span>
          {country.makers.map((maker) => maker.name).join(" · ")}
        </p>
      ) : null}

      <div className="mt-auto pt-5">
        <dl className="grid grid-cols-2 gap-4 border-t border-line-subtle pt-4">
          <div>
            <dt className="text-label text-[9px]">Marques</dt>
            <dd className="tabular mt-1.5 font-mono text-sm text-ink-50">
              {country.manufacturer_count}
            </dd>
          </div>
          <div>
            <dt className="text-label text-[9px]">Cars</dt>
            <dd className="tabular mt-1.5 font-mono text-sm text-ink-50">
              {country.variant_count}
            </dd>
          </div>
        </dl>
      </div>
    </Link>
  );
}
