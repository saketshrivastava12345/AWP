import Link from "next/link";
import { ArrowRight, Boxes, GitCompareArrows } from "lucide-react";
import { MAX_COMPARE, compareHref } from "@/lib/compare-slug";
import { carDisplayName, formatNumber } from "@/lib/format";
import type { PartsIndexCategory } from "@/lib/queries/parts";
import type { QuickStart } from "@/components/compare/picker-logic";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InfoHint } from "@/components/ui/Tooltip";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { powertrainKind } from "@/types/domain";
import { mostRecorded } from "./home-data";

/**
 * Two ways into the catalogue that are not a list of cars: the parts
 * encyclopedia and the comparison. Both are driven by the data — the parts
 * most often recorded against published cars, and a pair of natural rivals
 * chosen by a rule stated next to it.
 */

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

function PartsPanel({ categories }: { categories: PartsIndexCategory[] }) {
  const withParts = categories.filter((category) => category.parts.length > 0);
  const total = withParts.reduce((sum, category) => sum + category.parts.length, 0);
  const popular = mostRecorded(
    withParts.flatMap((category) => category.parts),
    3,
  );

  return (
    <article
      aria-labelledby="parts-teaser-heading"
      className="edge-light relative flex min-w-0 flex-col border border-line bg-surface-1/60 p-6 sm:p-8"
    >
      <Boxes className="size-5 text-gold-500" strokeWidth={1.25} aria-hidden="true" />
      <p className="mt-6 text-label">Parts encyclopedia</p>
      <h2
        id="parts-teaser-heading"
        className="mt-3 font-display text-lg tracking-[0.06em] text-ink-50 sm:text-xl"
      >
        The components behind the numbers
      </h2>

      {withParts.length === 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-ink-400">
          The encyclopedia could not be read just now.
        </p>
      ) : (
        <>
          <p className="mt-4 text-sm leading-relaxed text-ink-300">
            {plural(total, "component", "components")} in{" "}
            {plural(withParts.length, "system", "systems")}: what each one does, and which
            catalogued cars record it.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {withParts.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/parts/${category.slug}`}
                  className="inline-flex min-h-9 items-center gap-2 rounded-xs border border-line px-3 font-display text-nano tracking-[0.14em] text-ink-200 uppercase transition-colors hover:border-gold-600 hover:text-gold-300"
                >
                  {category.name}
                  <span className="tabular font-mono text-ink-500">
                    {category.parts.length}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {popular.length > 0 ? (
            <div className="mt-8 border-t border-line-subtle pt-5">
              <div className="flex items-center gap-1.5">
                <p className="text-label text-nano">Most recorded</p>
                <InfoHint label="How “most recorded” is counted" side="top">
                  Parts recorded against the most published cars in the catalogue.
                </InfoHint>
              </div>
              <ol className="mt-3 space-y-1">
                {popular.map((part) => (
                  <li key={part.id}>
                    <Link
                      href={`/parts/${part.slug}`}
                      className="group flex min-h-11 items-center justify-between gap-4 border-b border-line-subtle text-sm text-ink-100 transition-colors hover:text-gold-300"
                    >
                      <span className="truncate">{part.name}</span>
                      <span className="shrink-0 font-mono text-micro text-ink-400">
                        {plural(part.usageCount, "car", "cars")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-auto pt-8">
        <ButtonLink href="/parts" variant="secondary" size="md">
          Open the encyclopedia
        </ButtonLink>
      </div>
    </article>
  );
}

const RIVAL_SIZES = "(min-width: 1024px) 260px, 45vw";

/** A compact body-style drawing; the pair is captioned as drawings once, below. */
function RivalDrawing({ option }: { option: ComparePickerOption }) {
  const shape = carSilhouette(option.bodyType, powertrainKind(option.fuelType));
  return (
    <svg viewBox={shape.viewBox} className="w-[78%]" aria-hidden="true">
      <path d={shape.body} className="fill-surface-3 stroke-ink-600" strokeWidth={3} />
      <path d={shape.glass} className="fill-surface-4" />
      {shape.wheels.map((wheel, index) => (
        <circle
          key={index}
          cx={wheel.cx}
          cy={wheel.cy}
          r={wheel.r}
          className="fill-void stroke-gold-700"
          strokeWidth={3}
        />
      ))}
    </svg>
  );
}

function RivalPicture({ option }: { option: ComparePickerOption }) {
  const drawing = (
    <div className="absolute inset-0 grid place-items-center tech-grid">
      <RivalDrawing option={option} />
    </div>
  );
  return (
    <div className="relative aspect-[16/10] min-w-0 overflow-hidden border border-line-subtle bg-surface-2">
      {option.imageUrl ? (
        <CarPhoto src={option.imageUrl} alt="" sizes={RIVAL_SIZES} fallback={drawing} />
      ) : (
        drawing
      )}
    </div>
  );
}

function RivalName({ option }: { option: ComparePickerOption }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-label text-nano">
        {option.flag ? <span aria-hidden="true">{option.flag} </span> : null}
        {option.manufacturer}
      </p>
      <p className="mt-1 truncate font-display text-[11px] tracking-[0.06em] text-ink-50 uppercase">
        {carDisplayName(null, option.model, option.variant)}
      </p>
    </div>
  );
}

function ComparePanel({ rivals }: { rivals: QuickStart[] }) {
  const lead = rivals[0];
  return (
    <article
      aria-labelledby="compare-teaser-heading"
      className="edge-light relative flex min-w-0 flex-col border border-line bg-surface-1/60 p-6 sm:p-8"
    >
      <GitCompareArrows
        className="size-5 text-gold-500"
        strokeWidth={1.25}
        aria-hidden="true"
      />
      <p className="mt-6 text-label">Compare</p>
      <h2
        id="compare-teaser-heading"
        className="mt-3 font-display text-lg tracking-[0.06em] text-ink-50 sm:text-xl"
      >
        Side by side, without guesses
      </h2>
      <p className="mt-4 text-sm leading-relaxed text-ink-300">
        Up to {MAX_COMPARE} cars in one table. A figure a maker does not publish is a
        dash, and prices in different currencies are never ranked against each other.
      </p>

      {lead ? (
        <div className="mt-8 border-t border-line-subtle pt-5">
          <div className="flex items-center gap-1.5">
            <p className="text-label text-nano">Natural rivals · {lead.category}</p>
            <InfoHint label="How these rivals are chosen" side="top">
              In each of the catalogue&apos;s largest categories, the two cars from
              different makers whose published power is closest.
            </InfoHint>
          </div>
          <div className="mt-4 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-4">
            <RivalPicture option={lead.a} />
            <span
              aria-hidden="true"
              className="font-display text-micro tracking-hud text-gold-500"
            >
              VS
            </span>
            <RivalPicture option={lead.b} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:gap-4">
            <RivalName option={lead.a} />
            <RivalName option={lead.b} />
          </div>
          {!lead.a.imageUrl || !lead.b.imageUrl ? (
            <p className="mt-3 font-mono text-nano tracking-[0.08em] text-ink-500 uppercase">
              {lead.a.imageUrl || lead.b.imageUrl
                ? "Where there is no photograph: a body-style drawing, not a likeness"
                : "Body-style drawings, not photographs"}
            </p>
          ) : null}
          <ButtonLink
            href={compareHref([lead.a.slug, lead.b.slug])}
            size="md"
            className="mt-6 w-full sm:w-auto"
          >
            Compare these two
            <span className="sr-only">
              : {carDisplayName(lead.a.manufacturer, lead.a.model, lead.a.variant)} and{" "}
              {carDisplayName(lead.b.manufacturer, lead.b.model, lead.b.variant)}
            </span>
          </ButtonLink>
          {rivals.length > 1 ? (
            <ul className="mt-5 space-y-1">
              {rivals.slice(1).map((pair) => (
                <li key={`${pair.a.slug}|${pair.b.slug}`}>
                  <Link
                    href={compareHref([pair.a.slug, pair.b.slug])}
                    className="group flex min-h-11 items-center justify-between gap-3 border-b border-line-subtle text-sm text-ink-200 transition-colors hover:text-gold-300"
                  >
                    <span className="min-w-0 truncate">
                      {carDisplayName(pair.a.manufacturer, pair.a.model, pair.a.variant)}{" "}
                      <span className="text-ink-500">vs</span>{" "}
                      {carDisplayName(pair.b.manufacturer, pair.b.model, pair.b.variant)}
                    </span>
                    <ArrowRight
                      className="size-3.5 shrink-0 text-ink-600 group-hover:text-gold-400"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto pt-8">
        <ButtonLink href="/compare" variant="secondary" size="md">
          {lead ? "Choose your own" : "Start a comparison"}
        </ButtonLink>
      </div>
    </article>
  );
}

export function ExploreTeasers({
  parts,
  rivals,
}: {
  parts: PartsIndexCategory[];
  rivals: QuickStart[];
}) {
  return (
    <section
      aria-label="Parts and comparison"
      className="border-t border-line py-20 sm:py-24"
    >
      <Container className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <PartsPanel categories={parts} />
        <ComparePanel rivals={rivals} />
      </Container>
    </section>
  );
}
