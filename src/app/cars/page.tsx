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
import {
  CatalogueBodySkeleton,
  CatalogueIntro,
} from "@/components/cars/catalogue/CatalogueSkeleton";
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
  clearFiltersHref,
  countFilterChips,
  filtersToParams,
  hasActiveFilters,
  hasAnySearchParam,
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

  return {
    title: "Car Collection",
    description: DESCRIPTION,
    ...(permutation
      ? { robots: { index: false, follow: true } }
      : { alternates: { canonical: url } }),
    openGraph: {
      title: "Car Collection",
      description: DESCRIPTION,
      url,
      type: "website",
    },
  };
}

export default function CarsPage({ searchParams }: PageProps<"/cars">) {
  return (
    <Container className="pt-10 pb-20 sm:pt-14 2xl:max-w-[1600px]">
      <CatalogueIntro />
      {/* The title is part of the static shell; everything that depends on
          the URL streams in behind a skeleton of the same shape. */}
      <Suspense fallback={<CatalogueBodySkeleton />}>
        <Catalogue searchParams={searchParams} />
      </Suspense>
    </Container>
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

function distinct(values: readonly (string | null)[]): number {
  return new Set(values.filter(Boolean)).size;
}

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
      <EmptyState
        className="mt-10"
        icon={<Unplug className="size-7" strokeWidth={1.25} aria-hidden="true" />}
        title="Catalogue unavailable"
        description="The database is not configured. Copy .env.example to .env.local and add your Supabase project URL and publishable key."
        action={
          <ButtonLink href="/about" variant="secondary" size="sm">
            About this project
          </ButtonLink>
        }
      />
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
  const filtered = hasActiveFilters(state.effective) || Boolean(state.effective.text);

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

  const first = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const last = Math.min(result.total, result.page * result.pageSize);
  const groupedPrice = isGroupedPriceSort(state.sort, state.effective);
  const groupedRange = isGroupedRangeSort(state.sort);
  const pricedCurrencies = (options.price?.currencies ?? [])
    .filter((option) => option.count > 0)
    .map((option) => option.value)
    .sort();

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
      <div
        className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-2"
        aria-live="polite"
      >
        <p className="flex items-baseline gap-3">
          <span className="tabular gold-gradient-text font-display text-3xl sm:text-4xl">
            {formatNumber(result.total)}
          </span>
          <span className="text-label">
            {filtered
              ? result.total === 1
                ? "car matches"
                : "cars match"
              : result.total === 1
                ? "car catalogued"
                : "cars catalogued"}
          </span>
        </p>
        <p className="text-sm text-ink-400">
          {filtered ? (
            <>
              of{" "}
              <span className="tabular text-ink-200">
                {formatNumber(options.universe)}
              </span>
              {state.effective.text ? " matching the search" : " in the catalogue"}
            </>
          ) : (
            <>
              from{" "}
              <span className="tabular text-ink-200">
                {formatNumber(
                  distinct(facetData.rows.map((row) => row.manufacturer_slug)),
                )}
              </span>{" "}
              manufacturers in{" "}
              <span className="tabular text-ink-200">
                {formatNumber(distinct(facetData.rows.map((row) => row.country_slug)))}
              </span>{" "}
              countries
            </>
          )}
        </p>
        {state.query ? (
          <p className="w-full text-sm text-ink-300 sm:w-auto">
            Results for <span className="text-gold-300">“{state.query}”</span>
          </p>
        ) : null}
      </div>

      <div className="mt-8 lg:mt-10 lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)] lg:gap-10 xl:gap-12">
        {/* Desktop rail. On smaller screens the sheet is the way in; without
            JavaScript the "Filters" link targets this section, which :target
            reveals in place. */}
        <aside
          id="catalogue-filters"
          aria-labelledby="catalogue-filters-heading"
          className="mb-8 hidden target:block lg:mb-0 lg:block"
        >
          <div className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:[scrollbar-width:thin] lg:overflow-y-auto lg:overscroll-contain lg:pr-2">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h2
                id="catalogue-filters-heading"
                className="font-display text-micro tracking-hud text-ink-100 uppercase"
              >
                Filters
                {activeCount > 0 ? (
                  <span className="ml-2 text-gold-300">({activeCount})</span>
                ) : null}
              </h2>
              {activeCount > 0 ? (
                <Link
                  href={clearHref}
                  scroll={false}
                  className="text-xs text-ink-400 transition-colors hover:text-gold-300"
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

          {/* Toolbar: sticky under the navbar on phones and tablets. */}
          <div
            className={cn(
              "sticky top-16 z-(--z-sticky) -mx-5 flex items-center gap-3 border-b border-line bg-void/85 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8",
              "lg:static lg:mx-0 lg:border-t lg:bg-transparent lg:px-0 lg:backdrop-blur-none",
            )}
          >
            <MobileFilters
              model={panel}
              count={activeCount}
              className="shrink-0 lg:hidden"
            />
            <p className="hidden text-xs text-ink-400 md:block">
              {result.total > 0 ? (
                <>
                  Showing{" "}
                  <span className="tabular text-ink-100">
                    {first === last
                      ? formatNumber(first)
                      : `${formatNumber(first)}–${formatNumber(last)}`}
                  </span>{" "}
                  of{" "}
                  <span className="tabular text-ink-100">
                    {formatNumber(result.total)}
                  </span>
                </>
              ) : (
                "No matches"
              )}
            </p>
            <SortBar
              className="ml-auto min-w-0 flex-1 justify-end xl:flex-none"
              choices={sortChoices}
              active={state.sort}
              hidden={sortHidden(state)}
              action={CATALOGUE_PATH}
            />
          </div>

          <ActiveFilters chips={chips} clearHref={clearHref} className="mt-4" />

          {groupedPrice && result.total > 0 ? (
            <p className="mt-4 flex max-w-3xl items-start gap-2 text-xs leading-relaxed text-ink-400">
              <Info
                className="mt-0.5 size-3.5 shrink-0 text-gold-500"
                aria-hidden="true"
              />
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
            <p className="mt-4 flex max-w-3xl items-start gap-2 text-xs leading-relaxed text-ink-400">
              <Info
                className="mt-0.5 size-3.5 shrink-0 text-gold-500"
                aria-hidden="true"
              />
              <span>
                Sorted by range within each test cycle (WLTP, EPA, ARAI…). Figures from
                different cycles are grouped, not ranked against each other. Cars without
                a published range come last.
              </span>
            </p>
          ) : null}

          {result.failed ? (
            <EmptyState
              className="mt-6"
              icon={<Unplug className="size-7" strokeWidth={1.25} aria-hidden="true" />}
              title="Catalogue unavailable"
              description="The catalogue could not be read just now. Reloading usually resolves it."
              action={
                <ButtonLink
                  href={stateHref(state, { page: state.page })}
                  variant="secondary"
                  size="sm"
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
            <CarGrid cars={result.rows} columns="catalogue" aboveFold className="mt-6" />
          )}

          {result.total > 0 ? (
            <div className="mt-12 flex flex-col-reverse items-center justify-between gap-6 border-t border-line pt-6 sm:flex-row">
              <nav aria-label="Cars per page" className="flex items-center gap-2">
                <span className="text-label">Per page</span>
                <ul className="flex gap-1">
                  {PAGE_SIZES.map((size) => (
                    <li key={size}>
                      <Link
                        href={stateHref(state, { pageSize: size })}
                        scroll={false}
                        aria-current={size === state.pageSize ? "true" : undefined}
                        aria-label={`${size} cars per page`}
                        className={cn(
                          "tabular flex h-11 min-w-11 items-center justify-center rounded-xs border px-2 font-mono text-xs transition-colors sm:h-9 sm:min-w-9",
                          size === state.pageSize
                            ? "border-gold-600 text-gold-300"
                            : "border-line text-ink-400 hover:border-line-strong hover:text-ink-100",
                        )}
                      >
                        {size}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                href={(page) => stateHref(state, { page })}
              />
            </div>
          ) : null}

          <p className="mt-12 text-xs leading-relaxed text-ink-500">
            Prices are listed prices as recorded — each shown with its type and market,
            never converted between currencies. {siteConfig.disclaimer}
          </p>
        </section>
      </div>
    </>
  );
}
