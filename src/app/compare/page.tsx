import type { Metadata } from "next";
import { Suspense } from "react";
import { CloudOff } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { GridBackground, Scanlines, ScrambleText } from "@/components/fx";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CompareNotice } from "@/components/compare/CompareNotice";
import { CompareNotes } from "@/components/compare/CompareNotes";
import { ComparePinned } from "@/components/compare/ComparePinned";
import { CompareSkeleton } from "@/components/compare/CompareSkeleton";
import { CompareStart } from "@/components/compare/CompareStart";
import { CompareStateProvider } from "@/components/compare/CompareState";
import { CompareView } from "@/components/compare/CompareView";
import { buildCompareRows, summariseCar } from "@/lib/compare-rows";
import {
  compareHref,
  MAX_COMPARE,
  MIN_COMPARE,
  readCompareParam,
  readDiffParam,
} from "@/lib/compare-slug";
import { getComparePickerOptions, resolveComparison } from "@/lib/queries/compare";
import type { RawSearchParams } from "@/lib/search-params";

type SearchParams = Promise<RawSearchParams>;

/** The raw ?car= values as one string, the cache key shared with the page. */
async function comparisonKey(searchParams: SearchParams): Promise<string> {
  const params = await searchParams;
  return readCompareParam(params.car).join("\n");
}

/**
 * "Porsche 911 GT3 vs BMW M3 Competition — Compare". Never indexed: every
 * permutation of cars is a URL, and none of them is a page worth ranking.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/compare">): Promise<Metadata> {
  const { cars } = await resolveComparison(await comparisonKey(searchParams));
  const names = cars.map(({ detail }) => summariseCar(detail, "").fullName);

  const title =
    names.length >= MIN_COMPARE
      ? `${names.join(" vs ")} — Compare`
      : names.length === 1
        ? `Compare the ${names[0]}`
        : "Compare cars";
  const description =
    names.length >= MIN_COMPARE
      ? `${names.join(" vs ")}: performance, engine, electric range, dimensions, price and features, side by side.`
      : `Put two to ${MAX_COMPARE} cars side by side across performance, engine, dimensions, efficiency and price.`;

  return {
    title,
    description,
    robots: { index: false, follow: true },
    openGraph: { title, description },
    twitter: { title, description },
  };
}

/**
 * /compare?car=manufacturer/model/variant (repeatable, up to four).
 *
 * The header is static and prerendered; everything that depends on the URL
 * streams in behind a Suspense boundary with a skeleton of the same shape.
 */
export default function ComparePage({ searchParams }: PageProps<"/compare">) {
  return (
    <Container className="pt-12 pb-24 sm:pt-16 lg:pt-24 lg:pb-32">
      <header className="relative isolate max-w-3xl overflow-hidden py-2">
        <GridBackground variant="flat" size={40} />
        <Scanlines />
        <p aria-hidden="true" className="flex items-center gap-3 hud-label">
          <span className="inline-block size-1.5 animate-pulse-glow rounded-full bg-cyan-400" />
          Telemetry wall // up to {String(MAX_COMPARE).padStart(2, "0")} cars
        </p>
        <h1 className="mt-4 gradient-text text-h1">
          <ScrambleText text="Compare cars" />
        </h1>
        <p className="mt-4 max-w-[60ch] text-lead">
          Up to {MAX_COMPARE} cars side by side, figure by figure — every gap marked,
          nothing estimated.
        </p>
      </header>

      <div className="mt-12 lg:mt-16">
        <Suspense fallback={<CompareSkeleton />}>
          <CompareContent searchParams={searchParams as SearchParams} />
        </Suspense>
      </div>
    </Container>
  );
}

async function CompareContent({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const key = readCompareParam(params.car).join("\n");
  const diff = readDiffParam(params.diff);

  const [result, picker] = await Promise.all([
    resolveComparison(key),
    getComparePickerOptions(),
  ]);

  // Could not check: say so, and keep the visitor's link intact.
  if (!result.reachable || !picker.reachable) {
    return (
      <EmptyState
        icon={<CloudOff className="size-7" strokeWidth={1.25} aria-hidden="true" />}
        title="The catalogue could not be reached"
        description="Nothing about your comparison has changed — the cars in your link are still in it. Try again in a moment."
        action={
          <ButtonLink href={compareHref(result.selected)} variant="secondary" size="sm">
            Try again
          </ButtonLink>
        }
      />
    );
  }

  const inputs = result.cars.map(({ detail, listed }) => ({ detail, listed }));
  const summaries = result.cars.map(({ detail, slug }) => summariseCar(detail, slug));
  const groups = buildCompareRows(inputs);
  const [first] = summaries;

  return (
    <CompareStateProvider selected={result.selected} initialDiff={diff}>
      <CompareNotice dropped={result.dropped} className="mb-8" />

      {summaries.length === 0 || !first ? (
        <CompareStart options={picker.options} truncated={picker.truncated} />
      ) : summaries.length === 1 ? (
        <ComparePinned
          car={first}
          groups={groups}
          options={picker.options}
          truncated={picker.truncated}
        />
      ) : (
        <>
          <CompareView
            cars={summaries}
            groups={groups}
            options={picker.options}
            truncated={picker.truncated}
          />
          <CompareNotes cars={summaries} />
        </>
      )}
    </CompareStateProvider>
  );
}
