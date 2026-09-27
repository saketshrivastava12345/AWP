import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MAX_COMPARE, compareHref } from "@/lib/compare-slug";
import { carDisplayName, formatNumber } from "@/lib/format";
import { BODY_LABELS, FUEL_LABELS } from "@/lib/facets";
import type { PartsIndexCategory } from "@/lib/queries/parts";
import type { ComparePickerOption } from "@/lib/queries/compare";
import type { QuickStart } from "@/components/compare/picker-logic";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InfoHint } from "@/components/ui/Tooltip";
import { CarPhoto } from "@/components/cars/CarPhoto";
import { Silhouette } from "@/components/cars/catalogue/Silhouette";
import { PartLocationFigure } from "@/components/parts/PartLocationFigure";
import type { ViewerGroup } from "@/types/domain";
import { mostRecorded } from "./home-data";

/**
 * Two ways into the catalogue that are not a list of cars, as an editorial
 * pair that alternates sides: the parts encyclopedia (text, then where those
 * parts sit in a car) and the comparison (a real pair of rivals, then text).
 * Both are driven by the data — the parts most often recorded against
 * published cars, and two cars chosen by a rule stated beside them.
 */

const plural = (count: number, one: string, many: string) =>
  `${formatNumber(count)} ${count === 1 ? one : many}`;

// ---------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------

function PartsFeature({ categories }: { categories: PartsIndexCategory[] }) {
  const withParts = categories.filter((category) => category.parts.length > 0);
  const total = withParts.reduce((sum, category) => sum + category.parts.length, 0);
  const popular = mostRecorded(
    withParts.flatMap((category) => category.parts),
    3,
  );
  const groups = [
    ...new Set(popular.flatMap((part) => (part.viewer_group ? [part.viewer_group] : []))),
  ] as ViewerGroup[];

  return (
    <section aria-labelledby="parts-teaser-heading" className="py-16 lg:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="min-w-0">
          <p className="text-eyebrow">Parts encyclopedia</p>
          <h2 id="parts-teaser-heading" className="mt-3 text-h2">
            The components behind the numbers
          </h2>
          {withParts.length === 0 ? (
            <p className="mt-4 max-w-[60ch] text-lead">
              The encyclopedia could not be read just now.
            </p>
          ) : (
            <p className="mt-4 max-w-[60ch] text-lead">
              {plural(total, "component", "components")} in{" "}
              {plural(withParts.length, "system", "systems")}: what each one does, and
              which catalogued cars record it.
            </p>
          )}

          {popular.length > 0 ? (
            <div className="mt-10">
              <div className="flex items-center gap-1.5">
                <h3 className="text-caption">Most recorded</h3>
                <InfoHint label="How “most recorded” is counted" side="top">
                  Parts recorded against the most published cars in the catalogue.
                </InfoHint>
              </div>
              <ul className="mt-3 border-t border-line-subtle">
                {popular.map((part) => (
                  <li key={part.id} className="border-b border-line-subtle">
                    <Link
                      href={`/parts/${part.slug}`}
                      className="group flex min-h-16 items-center gap-4 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-h4">{part.name}</span>
                        {part.function ? (
                          <span className="mt-0.5 line-clamp-1 text-body-s text-ink-400">
                            {part.function}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 text-caption">
                        {plural(part.usageCount, "car", "cars")}
                      </span>
                      <ArrowRight
                        className="size-5 shrink-0 text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard group-hover:translate-x-1 group-hover:text-ink-50 motion-reduce:group-hover:translate-x-0"
                        aria-hidden="true"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <ButtonLink href="/parts" variant="link" className="mt-6">
            Open the encyclopedia
          </ButtonLink>
        </div>

        {groups.length > 0 ? (
          <PartLocationFigure
            groups={groups}
            id="home-parts"
            className="border-0 bg-transparent p-0 sm:p-0"
          />
        ) : null}
      </Container>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Compare
// ---------------------------------------------------------------------------

const RIVAL_SIZES = "(min-width: 1360px) 300px, (min-width: 1024px) 22vw, 44vw";

function RivalPicture({ option }: { option: ComparePickerOption }) {
  const drawing = <Silhouette bodyType={option.bodyType} fuelType={option.fuelType} />;
  return (
    <div className="relative aspect-[16/10] min-w-0 overflow-hidden rounded-control bg-surface-2">
      {option.imageUrl ? (
        <CarPhoto src={option.imageUrl} alt="" sizes={RIVAL_SIZES} fallback={drawing} />
      ) : (
        drawing
      )}
    </div>
  );
}

function Missing() {
  return (
    <>
      <span aria-hidden="true" className="text-ink-400">
        —
      </span>
      <span className="sr-only">Not available</span>
    </>
  );
}

/** The rows of the preview: published values only, a dash for the rest. */
const PREVIEW_ROWS: {
  label: string;
  value: (option: ComparePickerOption) => string | null;
}[] = [
  {
    label: "Power",
    value: (option) =>
      option.powerHp !== null ? `${formatNumber(option.powerHp)} hp` : null,
  },
  {
    label: "Body",
    value: (option) => (option.bodyType ? BODY_LABELS[option.bodyType] : null),
  },
  {
    label: "Powertrain",
    value: (option) => (option.fuelType ? FUEL_LABELS[option.fuelType] : null),
  },
  {
    label: "Introduced",
    value: (option) => (option.yearStart !== null ? String(option.yearStart) : null),
  },
];

function ComparePreview({ pair }: { pair: QuickStart }) {
  const cars = [pair.a, pair.b] as const;
  const names = cars.map((option) =>
    carDisplayName(option.manufacturer, option.model, option.variant),
  );
  return (
    <figure className="min-w-0 rounded-card bg-surface-1 p-5 sm:p-8">
      <figcaption className="flex items-center gap-1.5">
        <span className="text-caption">
          Natural rivals{pair.category ? ` · ${pair.category}` : ""}
        </span>
        <InfoHint label="How these rivals are chosen" side="top">
          In each of the catalogue&apos;s largest categories, the two cars from different
          makers whose published power is closest.
        </InfoHint>
      </figcaption>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:gap-6">
        {cars.map((option) => (
          <div key={option.slug} className="min-w-0">
            <RivalPicture option={option} />
            <p className="mt-4 truncate text-caption">{option.manufacturer}</p>
            <p className="mt-0.5 text-h4">
              {carDisplayName(null, option.model, option.variant)}
            </p>
          </div>
        ))}
      </div>

      <dl className="mt-6">
        {PREVIEW_ROWS.map((row) => (
          <div key={row.label} className="border-t border-line-subtle py-3">
            <dt className="text-caption">{row.label}</dt>
            <dd className="mt-1 grid grid-cols-2 gap-4 text-data text-ink-50 sm:gap-6">
              {cars.map((option) => {
                const value = row.value(option);
                return <span key={option.slug}>{value ?? <Missing />}</span>;
              })}
            </dd>
          </div>
        ))}
      </dl>

      <ButtonLink
        href={compareHref([pair.a.slug, pair.b.slug])}
        variant="link"
        className="mt-2"
      >
        Compare these two
        <span className="sr-only">
          : {names[0]} and {names[1]}
        </span>
      </ButtonLink>
    </figure>
  );
}

function CompareFeature({ rivals }: { rivals: QuickStart[] }) {
  const lead = rivals[0];
  return (
    <section aria-labelledby="compare-teaser-heading" className="py-16 lg:py-24">
      <Container className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div className="min-w-0 lg:order-last">
          <p className="text-eyebrow">Compare</p>
          <h2 id="compare-teaser-heading" className="mt-3 text-h2">
            Side by side, without guesses
          </h2>
          <p className="mt-4 max-w-[60ch] text-lead">
            Up to {MAX_COMPARE} cars in one table. A figure a maker does not publish is a
            dash, and prices in different currencies are never ranked against each other.
          </p>
          <ButtonLink href="/compare" variant="secondary" className="mt-8">
            Compare two cars
          </ButtonLink>
        </div>
        {lead ? <ComparePreview pair={lead} /> : null}
      </Container>
    </section>
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
    <>
      <PartsFeature categories={parts} />
      <CompareFeature rivals={rivals} />
    </>
  );
}
