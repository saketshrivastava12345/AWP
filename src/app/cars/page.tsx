import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Info, Unplug } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CarGrid } from "@/components/cars/CarGrid";
import { Pagination } from "@/components/cars/Pagination";
import { FilterPanel, type FilterPanelModel } from "@/components/cars/FilterRail";
import { SortBar, type SortChoice } from "@/components/cars/SortBar";
import { ActiveFilters } from "@/components/cars/catalogue/ActiveFilters";
import { MobileFilters } from "@/components/cars/catalogue/MobileFilters";
import { NoResults, type Suggestion } from "@/components/cars/catalogue/NoResults";
import { CatalogueBodySkeleton } from "@/components/cars/catalogue/CatalogueSkeleton";
import { ScrambleText } from "@/components/fx/ScrambleText";
import { GridBackground, Scanlines } from "@/components/fx/Backgrounds";
import { listCars } from "@/lib/queries/cars";
import { getFacetRows } from "@/lib/queries/filters";
import { isConfigured } from "@/lib/supabase/server";
import {
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT,
  PAGE_SIZES,
  SORT_KEYS,
  SORT_OPTIONS,
  isGroupedPriceSort,
  isGroupedRangeSort,
} from "@/lib/car-query";
import {
  EMPTY_FILTER_OPTIONS,
  computeFacets,
  countMatching,
  type FilterOptions,
} from "@/lib/facets";
import {
  CATALOGUE_PATH,
  buildChips,
  catalogueTitle,
  clearFiltersHref,
  countFilterChips,
  filtersToParams,
  hasActiveFilters,
  hasAnySearchParam,
  matchingSpread,
  resolveCatalogueState,
  stateHref,
  textQuery,
  type CatalogueState,
  type RawSearchParams,
} from "@/lib/search-params";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "Browse every car in the AURIX catalogue by country, manufacturer, category, powertrain, " +
  "performance and listed price — with filters that only offer what the data holds.";

/**
 * The unfiltered collection is canonical; every filtered, sorted or paged
 * permutation is kept out of the index (it would be thin, near-duplicate
 * content) while its links are still followed.
 */
export async function generateMetadata({
  searchParams,
}: PageProps<"/cars">): Promise<Metadata> {
  const params = (await searchParams) as RawSearchParams;
  const permutation = hasAnySearchParam(params);
  const url = `${siteConfig.url}${CATALOGUE_PATH}`;
  // Labels come from the URL alone here (slugs, title-cased); the page
  // itself names them from the data.
  const heading = catalogueTitle(resolveCatalogueState(params), EMPTY_FILTER_OPTIONS);

  return {
    title: heading,
    description: DESCRIPTION,
    ...(permutation
      ? { robots: { index: false, follow: true } }
      : { alternates: { canonical: url } }),
    openGraph: {
      title: heading,
      description: DESCRIPTION,
      url,
      type: "website",
    },
  };
}

/**
 * The page's decorative ground: a drifting engineering grid fading out down
 * the page, faint scan lines, and a radar — concentric rings with a slowly
 * sweeping beam — riding the top-right corner. Pure CSS, aria-hidden, and
 * clipped inside its own layer so nothing widens the page.
 */
function CatalogueBackdrop() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
    >
      <GridBackground
        size={56}
        className="[mask-image:linear-gradient(to_bottom,black,black_35%,transparent_85%)]"
      />
      <Scanlines />
      <div className="absolute -top-44 -right-44 size-[30rem] rounded-full border border-cyan-400/10 sm:-top-52 sm:-right-36 sm:size-[40rem]">
        <div className="absolute inset-[18%] rounded-full border border-cyan-400/12" />
        <div className="absolute inset-[36%] rounded-full border border-cyan-400/15" />
        <div className="absolute inset-[54%] rounded-full border border-cyan-400/20" />
        <div className="absolute inset-x-0 top-1/2 h-px bg-cyan-400/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-cyan-400/10" />
        <div className="absolute inset-0 animate-spin-slow rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,oklch(0.83_0.13_210/24%)_40deg,transparent_62deg)]" />
        <div className="absolute top-1/2 left-1/2 size-2 -translate-1/2 animate-pulse-glow rounded-full bg-cyan-300 shadow-[0_0_12px_var(--color-cyan-400)]" />
      </div>
    </div>
  );
}

export default function CarsPage({ searchParams }: PageProps<"/cars">) {
  return (
    <div className="relative isolate">
      <CatalogueBackdrop />
      <Container className="relative pt-10 pb-24 sm:pt-14 lg:pt-16">
        {/* The heading names the filtered view ("Electric SUVs"), so it
            streams in with the results behind a skeleton of the same shape. */}
        <Suspense fallback={<CatalogueBodySkeleton />}>
          <Catalogue searchParams={searchParams} />
        </Suspense>
      </Container>
    </div>
  );
}

/** Params the filter form carries through unchanged. */
function formHidden(state: CatalogueState): [string, string][] {
  const hidden: [string, string][] = [];
  const q = textQuery(state);
  if (q) hidden.push(["q", q]);
  if (state.sort !== DEFAULT_SORT) hidden.push(["sort", state.sort]);
  if (state.pageSize !== DEFAULT_PAGE_SIZE)
    hidden.push(["pageSize", String(state.pageSize)]);
  return hidden;
}

/** Params the sort form carries through (everything but sort and page). */
function sortHidden(state: CatalogueState): [string, string][] {
  const hidden: [string, string][] = [];
  if (state.query) hidden.push(["q", state.query]);
  hidden.push(...filtersToParams(state.explicit));
  if (state.pageSize !== DEFAULT_PAGE_SIZE)
    hidden.push(["pageSize", String(state.pageSize)]);
  return hidden;
}

/** Params the per-page form carries through (everything but page size and page). */
function pageSizeHidden(state: CatalogueState): [string, string][] {
  const hidden: [string, string][] = [];
  if (state.query) hidden.push(["q", state.query]);
  hidden.push(...filtersToParams(state.explicit));
  if (state.sort !== DEFAULT_SORT) hidden.push(["sort", state.sort]);
  return hidden;
}

function plural(count: number, one: string, many: string): string {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}

function Header({ title, lead }: { title: string; lead?: string }) {
  return (
    <header className="max-w-3xl">
      <p className="flex items-center gap-3 text-eyebrow">
        <span
          aria-hidden="true"
          className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
        />
        <span>Catalogue</span>
        <span aria-hidden="true" className="hud-label text-ink-600">
          {"// SYS.CAT"}
        </span>
      </p>
      <h1 className="mt-4 text-h1">
        <ScrambleText text={title} />
      </h1>
      {lead ? <p className="mt-4 text-lead">{lead}</p> : null}
    </header>
  );
}

const NOTE = "mt-5 flex max-w-3xl items-start gap-2.5 text-caption text-ink-400";

async function Catalogue({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = (await searchParams) as RawSearchParams;
  const state = resolveCatalogueState(params);

  // A form submitted without JavaScript sends every field, empty ones
  // included (`powerMax=&yearMin=`). Tidy that into the canonical URL.
  const hasEmpty = Object.values(params).some((value) =>
    Array.isArray(value) ? value.some((entry) => !entry.trim()) : value?.trim() === "",
  );
  if (hasEmpty) redirect(stateHref(state, { page: state.page }));

  if (!isConfigured()) {
    return (
      <>
        <Header title="All cars" />
        <EmptyState
          className="mt-12"
          icon={<Unplug className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="Catalogue unavailable"
          description="The database is not configured. Copy .env.example to .env.local and add your Supabase project URL and publishable key."
          action={
            <ButtonLink href="/about" variant="secondary" size="md">
              About this project
            </ButtonLink>
          }
        />
      </>
    );
  }

  const [result, facetData] = await Promise.all([
    listCars({
      page: state.page,
      pageSize: state.pageSize,
      sort: state.sort,
      filters: state.effective,
    }),
    getFacetRows(state.effective.text),
  ]);

  // A page past the end (a stale link, a hand-edited URL) goes to the last
  // page that exists — never to an "unreachable database" message.
  if (!result.failed) {
    if (result.pageCount > 0 && state.page > result.pageCount) {
      redirect(stateHref(state, { page: result.pageCount }));
    }
    if (result.total === 0 && state.page > 1) redirect(stateHref(state));
  }

  const options: FilterOptions = facetData.ok
    ? computeFacets(facetData.rows, state.effective)
    : EMPTY_FILTER_OPTIONS;
  const chips = buildChips(state, options);
  const activeCount = countFilterChips(chips);
  const clearHref = clearFiltersHref(state);
  const filtered = hasActiveFilters(state.effective);
  const title = catalogueTitle(state, options);

  // "54 cars from 22 brands in 10 countries." — or, filtered, how many of
  // the catalogue this view holds and where they come from.
  let lead: string | undefined;
  if (facetData.ok && !result.failed) {
    const spread = matchingSpread(facetData.rows, state.effective);
    const where = `from ${plural(spread.brands, "brand", "brands")} in ${plural(spread.countries, "country", "countries")}`;
    const words = state.effective.text ? ` matching “${state.effective.text}”` : "";
    if (result.total === 0) {
      lead = undefined;
    } else if (filtered) {
      lead = `${formatNumber(result.total)} of ${plural(options.universe, "car", "cars")}${words}, ${where}.`;
    } else if (words) {
      lead = `${plural(result.total, "car", "cars")}${words}, ${where}.`;
    } else {
      lead = `${plural(result.total, "car", "cars")} ${where}.`;
    }
  }

  const panel: FilterPanelModel = {
    options,
    searchKeys: state.searchKeys,
    hidden: formHidden(state),
    stateKey: stateHref(state),
    action: CATALOGUE_PATH,
  };

  const sortChoices: SortChoice[] = SORT_KEYS.map((key) => ({
    key,
    label: SORT_OPTIONS[key].label,
    description: SORT_OPTIONS[key].description,
    href: stateHref(state, { sort: key }),
  }));
  const sizeChoices: SortChoice[] = PAGE_SIZES.map((size) => ({
    key: String(size),
    label: String(size),
    description: `${size} cars`,
    href: stateHref(state, { pageSize: size }),
  }));

  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);
  const groupedPrice = isGroupedPriceSort(state.sort, state.effective);
  const groupedRange = isGroupedRangeSort(state.sort);
  const pricedCurrencies = (options.price?.currencies ?? [])
    .filter((option) => option.count > 0)
    .map((option) => option.value)
    .sort();

  // "Show more" grows the first page through the offered page sizes, so the
  // next cards land below the ones already on screen. Past the largest size
  // the pager takes over.
  const nextSize = PAGE_SIZES.find((size) => size > state.pageSize);
  const showMore =
    result.page === 1 && result.pageCount > 1 && nextSize !== undefined
      ? {
          href: stateHref(state, { pageSize: nextSize }),
          count: Math.min(nextSize, result.total) - state.pageSize,
        }
      : null;

  // Zero results: offer the removals that bring the most cars back. Counts
  // are exact for everything except the free text, which needs a new search.
  const suggestions: Suggestion[] =
    result.total === 0 && facetData.ok
      ? chips
          .map((chip) => ({
            label: chip.source === "text" ? `the words ${chip.label}` : chip.label,
            href: chip.href,
            count: chip.sameText ? countMatching(facetData.rows, chip.after) : null,
          }))
          .filter((suggestion) => suggestion.count === null || suggestion.count > 0)
          .sort((a, b) => (b.count ?? -1) - (a.count ?? -1))
          .slice(0, 4)
      : [];

  return (
    <>
      <Header title={title} lead={lead} />

      <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[17.5rem_minmax(0,1fr)] lg:gap-12">
        {/* Desktop rail. On smaller screens the sheet is the way in; without
            JavaScript the "Filters" link targets this section, which :target
            reveals in place. */}
        <aside
          id="catalogue-filters"
          aria-labelledby="catalogue-filters-heading"
          className="mb-10 hidden target:block lg:mb-0 lg:block"
        >
          <div className="lg:sticky lg:top-[calc(var(--nav-offset)+1.5rem)] lg:max-h-[calc(100dvh-var(--nav-offset)-3rem)] lg:[scrollbar-width:thin] lg:overflow-y-auto lg:overscroll-contain lg:pr-3">
            <div className="relative flex min-h-11 items-center justify-between gap-3 pb-3 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[linear-gradient(90deg,var(--color-cyan-400),oklch(0.83_0.13_210/20%)_45%,transparent)] after:content-['']">
              <h2
                id="catalogue-filters-heading"
                className="flex items-center gap-2.5 font-hud text-xs tracking-hud text-ink-50 uppercase"
              >
                <span
                  aria-hidden="true"
                  className="size-1.5 animate-pulse-glow rounded-full bg-cyan-300 shadow-[0_0_8px_var(--color-cyan-400)]"
                />
                Filters
                {activeCount > 0 ? (
                  <span className="font-mono text-[11px] tracking-normal text-cyan-200">
                    ({activeCount})<span className="sr-only"> active</span>
                  </span>
                ) : null}
              </h2>
              {activeCount > 0 ? (
                <Link
                  href={clearHref}
                  scroll={false}
                  className="inline-flex min-h-11 items-center fx-link font-mono text-[11px] tracking-hud text-ink-200 uppercase transition-colors hover:text-cyan-100"
                >
                  Clear all
                </Link>
              ) : null}
            </div>
            <FilterPanel model={panel} mode="instant" className="mt-1" />
          </div>
        </aside>

        <section aria-labelledby="catalogue-results-heading" className="min-w-0">
          <h2 id="catalogue-results-heading" className="sr-only">
            Results
          </h2>

          {/* Toolbar: the count on the left, sort on the right; sticky under
              the navbar at every width. */}
          <div
            className={cn(
              "sticky top-(--nav-offset) z-(--z-sticky) -mx-5 flex min-h-16 items-center gap-3 bg-void/85 px-5 py-2.5 backdrop-blur-md sm:-mx-8 sm:px-8",
              "after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-[linear-gradient(90deg,oklch(0.83_0.13_210/55%),oklch(0.9_0.03_230/12%)_40%,oklch(0.9_0.03_230/12%))] after:content-['']",
              "transition-[top] duration-(--duration-base) ease-standard lg:mx-0 lg:px-0",
            )}
          >
            <MobileFilters
              model={panel}
              count={activeCount}
              className="shrink-0 lg:hidden"
            />
            <p
              className="hidden font-mono text-xs tracking-hud text-ink-300 uppercase sm:block"
              aria-live="polite"
              aria-atomic="true"
            >
              {result.failed ? null : result.total > 0 ? (
                <>
                  <span className="tabular text-cyan-100 glow-text-cyan">
                    {plural(result.total, "car", "cars")}
                  </span>
                  {result.pageCount > 1 ? (
                    <span className="text-ink-400">
                      {" "}
                      <span aria-hidden="true">{"//"}</span> showing{" "}
                      <span className="tabular text-ink-200">
                        {first === last
                          ? formatNumber(first)
                          : `${formatNumber(first)}–${formatNumber(last)}`}
                      </span>
                    </span>
                  ) : null}
                </>
              ) : (
                "No matches"
              )}
            </p>
            <SortBar
              className="ml-auto"
              choices={sortChoices}
              active={state.sort}
              hidden={sortHidden(state)}
              action={CATALOGUE_PATH}
              segmentedFrom="xl"
            />
          </div>

          <ActiveFilters chips={chips} clearHref={clearHref} className="mt-5" />

          {groupedPrice && result.total > 0 ? (
            <p className={NOTE}>
              <Info className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span>
                Sorted by listed price within each currency
                {pricedCurrencies.length > 1
                  ? ` (${pricedCurrencies.join(", then ")})`
                  : ""}
                . Prices are grouped by currency and never converted — choose a currency
                under Price to rank like with like. Cars without a recorded price come
                last.
              </span>
            </p>
          ) : null}

          {groupedRange && result.total > 0 ? (
            <p className={NOTE}>
              <Info className="mt-0.5 size-4 shrink-0 text-ink-400" aria-hidden="true" />
              <span>
                Sorted by range within each test cycle (WLTP, EPA, ARAI…). Figures from
                different cycles are grouped, not ranked against each other. Cars without
                a published range come last.
              </span>
            </p>
          ) : null}

          {result.failed ? (
            <EmptyState
              className="mt-8"
              icon={<Unplug className="size-7" strokeWidth={1.25} aria-hidden="true" />}
              title="Catalogue unavailable"
              description="The catalogue could not be read just now. Reloading usually resolves it."
              action={
                <ButtonLink
                  href={stateHref(state, { page: state.page })}
                  variant="secondary"
                  size="md"
                >
                  Try again
                </ButtonLink>
              }
            />
          ) : result.total === 0 ? (
            <NoResults
              suggestions={suggestions}
              clearHref={activeCount > 0 ? clearHref : CATALOGUE_PATH}
              hasFilters={activeCount > 0}
              query={state.query}
            />
          ) : (
            <CarGrid
              cars={result.rows}
              columns="catalogue"
              aboveFold
              label={title}
              className="mt-6"
              // This grid streams in a Suspense boundary on first load; see
              // CarCard's `countUp` for why the figures must not count here.
              countUp={false}
            />
          )}

          {result.total > 0 ? (
            <div className="mt-14 flex flex-col items-center gap-10">
              {showMore ? (
                <ButtonLink
                  href={showMore.href}
                  variant="secondary"
                  size="md"
                  scroll={false}
                >
                  Show {plural(showMore.count, "more car", "more cars")}
                </ButtonLink>
              ) : null}
              <div className="flex w-full flex-col-reverse items-center justify-between gap-6 border-t border-line-subtle pt-6 sm:flex-row">
                <SortBar
                  name="pageSize"
                  label="Per page"
                  choices={sizeChoices}
                  active={String(state.pageSize)}
                  hidden={pageSizeHidden(state)}
                  action={CATALOGUE_PATH}
                  segmentedFrom="sm"
                />
                <Pagination
                  page={result.page}
                  pageCount={result.pageCount}
                  href={(page) => stateHref(state, { page })}
                />
              </div>
            </div>
          ) : null}

          <p className="mt-14 max-w-3xl text-caption text-ink-400">
            Prices are listed prices as recorded — each shown with its type and market,
            never converted between currencies. {siteConfig.disclaimer}
          </p>
        </section>
      </div>
    </>
  );
}
