import type { Metadata } from "next";
import Link from "next/link";
import { GitCompareArrows, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CompareTable } from "@/components/cars/CompareTable";
import { ComparePicker } from "@/components/cars/ComparePicker";
import {
  getComparisonSet,
  getComparePickerOptions,
  toCompareSlug,
  MAX_COMPARE,
  MIN_COMPARE,
} from "@/lib/queries/compare";
import { buildQueryString, type RawSearchParams } from "@/lib/search-params";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Compare",
  description:
    "Put two to four cars side by side across performance, engine, dimensions, efficiency and price.",
};

/** Read the repeatable ?car= param. */
function readCars(params: RawSearchParams): string[] {
  const raw = params.car;
  if (raw === undefined) return [];
  return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
}

export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const params = (await searchParams) as RawSearchParams;
  const selected = readCars(params);

  const [cars, options] = await Promise.all([
    getComparisonSet(selected),
    getComparePickerOptions(),
  ]);

  const canCompare = cars.length >= MIN_COMPARE;

  return (
    <Container className="py-16">
      <header>
        <p className="text-label">Side by Side</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          COMPARE UP TO {MAX_COMPARE} CARS
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-300">
          The best figure in each row is highlighted — but only when at least two cars
          publish one. Anything a manufacturer does not publish is shown as a dash, never
          estimated.
        </p>
      </header>

      {/* ------------------------------------------------- Selected cars */}
      {cars.length > 0 ? (
        <div className="mt-10 flex flex-wrap items-center gap-2 border-y border-line py-4">
          <span className="mr-1 text-label">Comparing</span>
          {cars.map((car) => {
            const slug = toCompareSlug({
              manufacturer_slug: car.manufacturer.slug,
              model_slug: car.model.slug,
              variant_slug: car.variant.slug,
            });
            const remaining = selected.filter((entry) => entry !== slug);
            return (
              <Link
                key={car.variant.id}
                href={`/compare${buildQueryString(params, { car: remaining })}`}
                className="group flex items-center gap-2 rounded-xs border border-line px-3 py-1.5 text-xs text-ink-200 transition-colors hover:border-signal-negative/50 hover:text-signal-negative"
              >
                {car.manufacturer.name} {car.model.name}
                <span className="text-ink-500 group-hover:text-signal-negative">
                  {car.variant.name}
                </span>
                <X className="size-3" aria-hidden="true" />
                <span className="sr-only">Remove from comparison</span>
              </Link>
            );
          })}
          <Link
            href="/compare"
            className="ml-2 text-[11px] text-ink-500 transition-colors hover:text-gold-300"
          >
            Clear
          </Link>
        </div>
      ) : null}

      {/* ------------------------------------------------------- Picker */}
      <ComparePicker
        options={options}
        selected={selected}
        max={MAX_COMPARE}
        className="mt-8"
      />

      {/* -------------------------------------------------------- Table */}
      {canCompare ? (
        <div className="mt-12">
          <CompareTable cars={cars} />
          <p className="mt-6 text-xs leading-relaxed text-ink-600">
            {siteConfig.disclaimer} Prices are shown in the currency each manufacturer
            published and are never converted between currencies, so they are not directly
            comparable.
          </p>
        </div>
      ) : (
        <EmptyState
          className="mt-12"
          icon={
            <GitCompareArrows className="size-7" strokeWidth={1.25} aria-hidden="true" />
          }
          title={cars.length === 0 ? "Nothing selected yet" : "Add one more car"}
          description={
            cars.length === 0
              ? `Pick at least ${MIN_COMPARE} cars above to build a comparison. The selection lives in the URL, so you can share it.`
              : `A comparison needs at least ${MIN_COMPARE} cars.`
          }
          action={
            <ButtonLink href="/cars" variant="secondary" size="sm">
              Browse the collection
            </ButtonLink>
          }
        />
      )}
    </Container>
  );
}
