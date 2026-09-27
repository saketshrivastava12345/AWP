import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CountryListItem } from "@/lib/queries/countries";

/**
 * A country in the atlas grid: flag and name, a two-line blurb, its brands,
 * and what the catalogue holds for it. Hover and focus report back to the
 * atlas, so the matching marker on the map lights up; `active` is the reverse
 * direction (the marker is hovered, this card is highlighted).
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
  const brands = country.manufacturer_count;
  const cars = country.variant_count;

  return (
    <Link
      href={`/countries/${country.slug}`}
      onMouseEnter={() => onActiveChange?.(country.slug)}
      onMouseLeave={() => onActiveChange?.(null)}
      onFocus={() => onActiveChange?.(country.slug)}
      onBlur={() => onActiveChange?.(null)}
      className={cn(
        "group flex h-full flex-col rounded-card p-6 sm:p-7",
        "transition-colors duration-(--duration-base) ease-standard",
        active ? "bg-surface-2" : "bg-surface-1 hover:bg-surface-2",
      )}
    >
      <h3 className="flex items-center gap-3 text-h3">
        {country.flag_emoji ? (
          <span className="text-2xl leading-none" aria-hidden="true">
            {country.flag_emoji}
          </span>
        ) : null}
        {country.name}
      </h3>

      {country.description ? (
        <p className="mt-4 line-clamp-2 text-body-s text-ink-300">{country.description}</p>
      ) : null}

      {country.makers.length > 0 ? (
        <p className="mt-4 text-body-s text-ink-200">
          <span className="sr-only">Brands: </span>
          {country.makers.map((maker) => maker.name).join(" · ")}
        </p>
      ) : null}

      <p className="mt-auto pt-6 text-caption">
        {brands} {brands === 1 ? "brand" : "brands"} · {cars} {cars === 1 ? "car" : "cars"}
      </p>
    </Link>
  );
}
