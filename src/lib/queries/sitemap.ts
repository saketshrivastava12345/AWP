import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";

/** One indexable catalogue page and when its data last changed. */
export type SitemapEntry = { path: string; updatedAt: string | null };

export type SitemapData = {
  variants: SitemapEntry[];
  models: SitemapEntry[];
  /** /cars/[manufacturer]: a maker's catalogue, for makers with public cars. */
  makerCatalogues: SitemapEntry[];
  manufacturers: SitemapEntry[];
  countries: SitemapEntry[];
  parts: SitemapEntry[];
  partCategories: SitemapEntry[];
};

const EMPTY: SitemapData = {
  variants: [],
  models: [],
  makerCatalogues: [],
  manufacturers: [],
  countries: [],
  parts: [],
  partCategories: [],
};

type VariantRow = {
  slug: string;
  updated_at: string;
  car_models: {
    slug: string;
    updated_at: string;
    manufacturers: { slug: string } | null;
  } | null;
};

type ModelRow = {
  slug: string;
  updated_at: string;
  manufacturers: { slug: string } | null;
};

type SlugRow = { slug: string; updated_at: string };

type PartRow = SlugRow & { part_categories: { slug: string } | null };

/**
 * Every public catalogue page with its real last-modified time.
 *
 * Reads the base tables rather than `car_catalog` because the view carries no
 * `updated_at`. RLS decides what is public: the anonymous client only sees
 * published variants, so an unpublished car never reaches the sitemap. A model
 * is listed only when at least one of its variants is public, for the same
 * reason. Like every query here, a failure yields an empty sitemap section
 * rather than an error page.
 */
export async function getSitemapData(): Promise<SitemapData> {
  if (!isConfigured()) return EMPTY;

  try {
    const supabase = createStaticClient();
    const [variants, models, manufacturers, countries, parts] = await Promise.all([
      supabase
        .from("car_variants")
        .select(
          "slug, updated_at, car_models!inner ( slug, updated_at, manufacturers!inner ( slug ) )",
        )
        .returns<VariantRow[]>(),
      supabase
        .from("car_models")
        .select(
          "slug, updated_at, manufacturers!inner ( slug ), car_variants!inner ( id )",
        )
        .returns<ModelRow[]>(),
      supabase.from("manufacturers").select("slug, updated_at").returns<SlugRow[]>(),
      supabase.from("countries").select("slug, updated_at").returns<SlugRow[]>(),
      supabase
        .from("parts")
        .select("slug, updated_at, part_categories ( slug )")
        .returns<PartRow[]>(),
    ]);

    for (const [label, result] of [
      ["variants", variants],
      ["models", models],
      ["manufacturers", manufacturers],
      ["countries", countries],
      ["parts", parts],
    ] as const) {
      if (result.error)
        console.error(`getSitemapData ${label} failed:`, result.error.message);
    }

    return {
      variants: (variants.data ?? []).flatMap((row) => {
        const model = row.car_models;
        const maker = model?.manufacturers;
        if (!model || !maker) return [];
        return [
          {
            path: `/cars/${maker.slug}/${model.slug}/${row.slug}`,
            updatedAt: latest(row.updated_at, model.updated_at),
          },
        ];
      }),
      makerCatalogues: makerCatalogueEntries(models.data ?? []),
      models: (models.data ?? []).flatMap((row) =>
        row.manufacturers
          ? [
              {
                path: `/cars/${row.manufacturers.slug}/${row.slug}`,
                updatedAt: row.updated_at,
              },
            ]
          : [],
      ),
      manufacturers: (manufacturers.data ?? []).map((row) => ({
        path: `/manufacturers/${row.slug}`,
        updatedAt: row.updated_at,
      })),
      countries: (countries.data ?? []).map((row) => ({
        path: `/countries/${row.slug}`,
        updatedAt: row.updated_at,
      })),
      parts: (parts.data ?? []).map((row) => ({
        path: `/parts/${row.slug}`,
        updatedAt: row.updated_at,
      })),
      partCategories: categoryEntries(parts.data ?? []),
    };
  } catch (error) {
    console.error("getSitemapData threw:", error);
    return EMPTY;
  }
}

/** One /cars/[manufacturer] entry per maker with a public model, dated by its newest model. */
function makerCatalogueEntries(models: readonly ModelRow[]): SitemapEntry[] {
  const newest = new Map<string, string>();
  for (const model of models) {
    const slug = model.manufacturers?.slug;
    if (!slug) continue;
    const seen = newest.get(slug);
    newest.set(slug, seen ? latest(seen, model.updated_at) : model.updated_at);
  }
  return [...newest].map(([slug, updatedAt]) => ({ path: `/cars/${slug}`, updatedAt }));
}

/**
 * One entry per part category that has parts. Categories carry no timestamp
 * of their own, so each takes the newest date among its parts.
 */
function categoryEntries(parts: readonly PartRow[]): SitemapEntry[] {
  const newest = new Map<string, string>();
  for (const part of parts) {
    const slug = part.part_categories?.slug;
    if (!slug) continue;
    const seen = newest.get(slug);
    newest.set(slug, seen ? latest(seen, part.updated_at) : part.updated_at);
  }
  return [...newest].map(([slug, updatedAt]) => ({ path: `/parts/${slug}`, updatedAt }));
}

/** The later of two ISO timestamps. */
function latest(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

/** The most recent timestamp in a list, or null when there is none. */
export function newestOf(entries: readonly SitemapEntry[]): string | null {
  let best: string | null = null;
  for (const entry of entries) {
    if (
      entry.updatedAt &&
      (best === null || Date.parse(entry.updatedAt) > Date.parse(best))
    ) {
      best = entry.updatedAt;
    }
  }
  return best;
}
