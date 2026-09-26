import type { Metadata } from "next";
import Link from "next/link";
import { SearchX, Unplug } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CarGrid } from "@/components/cars/CarGrid";
import { Pagination } from "@/components/cars/Pagination";
import {
  listCars,
  DEFAULT_PAGE_SIZE,
  SORT_OPTIONS,
  DEFAULT_SORT,
} from "@/lib/queries/cars";
import { getFilterOptions } from "@/lib/queries/filters";
import { FilterRail } from "@/components/cars/FilterRail";
import { parseQuery } from "@/lib/search/parseQuery";
import { Badge } from "@/components/ui/Badge";
import { isConfigured } from "@/lib/supabase/server";
import {
  parseCarSearchParams,
  buildQueryString,
  hasActiveFilters,
  countActiveFilters,
  type RawSearchParams,
} from "@/lib/search-params";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Car Collection",
  description:
    "Browse every car in the AURIX catalogue by country, manufacturer, category, fuel type and drivetrain.",
};

/** Sorting is a row of links so the whole page works without JavaScript. */
function SortBar({
  active,
  searchParams,
}: {
  active: string;
  searchParams: RawSearchParams;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-label">Sort</span>
      {Object.entries(SORT_OPTIONS).map(([key, option]) => (
        <Link
          key={key}
          href={`/cars${buildQueryString(searchParams, {
            sort: key === DEFAULT_SORT ? undefined : key,
            page: undefined,
          })}`}
          aria-current={key === active ? "true" : undefined}
          className={cn(
            "rounded-xs border px-2.5 py-1 text-[11px] transition-colors duration-200",
            key === active
              ? "border-gold-700 bg-gold-800/15 text-gold-300"
              : "border-line text-ink-400 hover:border-line-strong hover:text-ink-100",
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}

export default async function CarsPage({ searchParams }: PageProps<"/cars">) {
  const params = (await searchParams) as RawSearchParams;
  const { filters, page, sort, query } = parseCarSearchParams(params);

  // A ?q= from the search overlay goes through the rule-based parser, which
  // turns "german supercars over 500 hp" into real filters and leaves only the
  // unmatched words for full-text search. Explicit URL filters win over
  // anything the parser inferred, so clicking a facet is never overridden.
  const parsed = query ? parseQuery(query) : null;
  const effectiveFilters = parsed
    ? {
        ...parsed.filters,
        ...Object.fromEntries(
          Object.entries(filters).filter(([, value]) =>
            Array.isArray(value) ? value.length > 0 : value !== undefined,
          ),
        ),
        text: parsed.text,
      }
    : filters;

  const [result, filterOptions] = await Promise.all([
    listCars({ page, pageSize: DEFAULT_PAGE_SIZE, sort, filters: effectiveFilters }),
    getFilterOptions(),
  ]);

  const activeSort = sort ?? DEFAULT_SORT;
  const filtersActive = hasActiveFilters(effectiveFilters);

  return (
    <Container className="py-16">
      <header>
        <p className="text-label">Collection</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          EVERY CAR IN THE CATALOGUE
        </h1>
        {query ? (
          <div className="mt-5">
            <p className="text-sm text-ink-300">
              Results for <span className="text-gold-300">“{query}”</span>
            </p>
            {parsed && parsed.matches.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-label">Understood as</span>
                {parsed.matches.map((match) => (
                  <Badge
                    key={`${match.kind}-${match.token}`}
                    tone={match.kind === "text" ? "neutral" : "gold"}
                  >
                    {match.label}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {!isConfigured() ? (
        <EmptyState
          className="mt-14"
          icon={<Unplug className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="Catalogue unavailable"
          description="The database is not configured. Copy .env.example to .env.local and add your Supabase project URL and publishable key."
          action={
            <ButtonLink href="/about" variant="secondary" size="sm">
              About this project
            </ButtonLink>
          }
        />
      ) : result.total === 0 ? (
        <EmptyState
          className="mt-14"
          icon={<SearchX className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="No cars match"
          description={
            filtersActive
              ? "No car in the catalogue matches every filter at once. Try removing one."
              : "The catalogue returned nothing. The database may be unreachable — reloading often resolves it."
          }
          action={
            filtersActive ? (
              <ButtonLink href="/cars" variant="secondary" size="sm">
                Clear filters
              </ButtonLink>
            ) : null
          }
        />
      ) : (
        <>
          <div className="mt-10 flex flex-col gap-4 border-y border-line py-4 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-xs text-ink-400">
              <span className="tabular text-ink-100">{formatNumber(result.total)}</span>{" "}
              {result.total === 1 ? "car" : "cars"}
              {result.pageCount > 1 ? (
                <>
                  {" · page "}
                  <span className="tabular text-ink-100">{result.page}</span> of{" "}
                  <span className="tabular text-ink-100">{result.pageCount}</span>
                </>
              ) : null}
              {filtersActive ? (
                <>
                  {" · "}
                  <Link href="/cars" className="text-gold-300 hover:text-gold-200">
                    clear filters
                  </Link>
                </>
              ) : null}
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <SortBar active={activeSort} searchParams={params} />
            </div>
          </div>

          <div className="mt-8 gap-10 lg:grid lg:grid-cols-[minmax(0,15rem)_1fr]">
            <FilterRail
              options={filterOptions}
              params={params}
              activeCount={countActiveFilters(effectiveFilters)}
            />

            <div>
              <CarGrid cars={result.rows} className="lg:mt-0" />

              <Pagination
                page={result.page}
                pageCount={result.pageCount}
                basePath="/cars"
                searchParams={params}
              />
            </div>
          </div>
        </>
      )}
    </Container>
  );
}
