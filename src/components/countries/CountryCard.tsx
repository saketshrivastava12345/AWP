import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CountryListItem } from "@/lib/queries/countries";

/**
 * A country in the atlas grid, as a HUD card: flag and name, a two-line
 * blurb, its brands, and what the catalogue holds for it as two lit
 * figures. Hover and focus report back to the atlas, so the matching
 * marker on the map lights up; `active` is the reverse direction (the
 * marker is hovered, this card is highlighted). The card lifts with a cyan
 * edge and a pointer-following spotlight (`fx-card` + `data-spotlight`).
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
      data-spotlight=""
      suppressHydrationWarning
      onMouseEnter={() => onActiveChange?.(country.slug)}
      onMouseLeave={() => onActiveChange?.(null)}
      onFocus={() => onActiveChange?.(country.slug)}
      onBlur={() => onActiveChange?.(null)}
      className={cn(
        "group/card relative flex h-full flex-col rounded-card border p-6 fx-card sm:p-7",
        active
          ? "border-cyan-400/45 bg-surface-2 shadow-[0_0_32px_-12px_oklch(0.8_0.14_210/40%)]"
          : "border-line bg-surface-1/85",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "hud-brackets -m-px [--hud-l:12px] transition-opacity duration-(--duration-base) group-hover/card:opacity-100",
          active ? "opacity-100" : "opacity-45",
        )}
      />
      <h3 className="flex items-center gap-3 text-h3 transition-colors duration-(--duration-fast) group-hover/card:text-cyan-100">
        {country.flag_emoji ? (
          <span className="text-2xl leading-none" aria-hidden="true">
            {country.flag_emoji}
          </span>
        ) : null}
        {country.name}
      </h3>

      {country.description ? (
        <p className="mt-4 line-clamp-2 text-body-s text-ink-300">
          {country.description}
        </p>
      ) : null}

      {country.makers.length > 0 ? (
        <p className="mt-4 text-body-s text-ink-200">
          <span className="sr-only">Brands: </span>
          {country.makers.map((maker) => maker.name).join(" · ")}
        </p>
      ) : null}

      <dl className="mt-auto flex gap-6 pt-6">
        <div className="flex flex-col-reverse gap-1">
          <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
            {brands === 1 ? "Brand" : "Brands"}
          </dt>
          <dd className="font-hud text-base text-ink-50 tabular-nums glow-text">{brands}</dd>
        </div>
        <div className="flex flex-col-reverse gap-1">
          <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
            {cars === 1 ? "Car" : "Cars"}
          </dt>
          <dd className="font-hud text-base text-ink-50 tabular-nums glow-text">{cars}</dd>
        </div>
      </dl>
    </Link>
  );
}
