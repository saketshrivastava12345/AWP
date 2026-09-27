import "server-only";

import { cache } from "react";
import type { AdminSupabase } from "@/lib/admin/auth";
import { localFileMissing } from "@/lib/admin/local-files";
import { addDays, todayIso } from "@/lib/admin/validation";
import {
  buildProvenanceRows,
  summarizeProvenance,
  type ProvenanceInput,
  type ProvenanceRow,
  type ProvenanceSection,
  type ProvenanceSummary,
} from "@/lib/admin/provenance";
import { STALE_AFTER_DAYS, scopeOf, type PriceScope } from "@/lib/pricing/engine";
import type {
  CarColor,
  CarGeneration,
  CarMedia,
  CarModel,
  CarVariant,
  Category,
  DimensionSpec,
  Engine,
  EvSpec,
  FuelSpec,
  FuelType,
  Manufacturer,
  MarketPrice,
  PerformanceSpec,
  PriceType,
  Transmission,
  VariantMarket,
  VehicleStatus,
} from "@/types/domain";

/**
 * Reads for the admin tools.
 *
 * Every function takes the admin's own cookie-aware client (from
 * requireAdmin), so nothing here can run without the role check having
 * passed, and row level security still applies — which is also why these
 * reads see draft variants: car_variants' select policy lets an admin see
 * unpublished rows.
 *
 * Unlike the public queries, failures are not flattened into empty data: a
 * count that could not be read is reported as unknown, never as zero.
 */

type PgError = { message: string; code?: string } | null;

function report(label: string, error: PgError): void {
  if (error) console.error(`admin query ${label} failed:`, error.message);
}

/** The public URL path of a variant. */
export function publicCarPath(
  manufacturerSlug: string,
  modelSlug: string,
  variantSlug: string,
) {
  return `/cars/${manufacturerSlug}/${modelSlug}/${variantSlug}`;
}

/** "Porsche 911 Turbo S" without repeating a model name the variant already carries. */
export function vehicleTitle(
  manufacturer: string,
  model: string,
  variant: string,
): string {
  const tail = variant.toLowerCase().startsWith(model.toLowerCase())
    ? variant
    : `${model} ${variant}`;
  return `${manufacturer} ${tail}`;
}

// ---------------------------------------------------------------------------
// Variant labels: the lookup many screens share
// ---------------------------------------------------------------------------

export type VariantLabel = {
  id: string;
  title: string;
  name: string;
  slug: string;
  modelId: string;
  modelName: string;
  modelSlug: string;
  manufacturerId: string;
  manufacturerName: string;
  manufacturerSlug: string;
  fuelType: FuelType;
  yearStart: number;
  yearEnd: number | null;
  isPublished: boolean;
  /** "porsche/911/turbo-s" — the CSV importer's vehicle path. */
  path: string;
  publicPath: string;
};

type VariantLabelRow = {
  id: string;
  name: string;
  slug: string;
  fuel_type: FuelType;
  year_start: number;
  year_end: number | null;
  is_published: boolean;
  car_models: {
    id: string;
    name: string;
    slug: string;
    manufacturers: { id: string; name: string; slug: string };
  };
};

export async function getVariantLabels(supabase: AdminSupabase): Promise<VariantLabel[]> {
  const { data, error } = await supabase
    .from("car_variants")
    .select(
      "id, name, slug, fuel_type, year_start, year_end, is_published, car_models!inner ( id, name, slug, manufacturers!inner ( id, name, slug ) )",
    )
    .limit(10000)
    .overrideTypes<VariantLabelRow[], { merge: false }>();
  report("getVariantLabels", error);
  return (data ?? [])
    .map((row) => {
      const model = row.car_models;
      const maker = model.manufacturers;
      return {
        id: row.id,
        title: vehicleTitle(maker.name, model.name, row.name),
        name: row.name,
        slug: row.slug,
        modelId: model.id,
        modelName: model.name,
        modelSlug: model.slug,
        manufacturerId: maker.id,
        manufacturerName: maker.name,
        manufacturerSlug: maker.slug,
        fuelType: row.fuel_type,
        yearStart: row.year_start,
        yearEnd: row.year_end,
        isPublished: row.is_published,
        path: `${maker.slug}/${model.slug}/${row.slug}`,
        publicPath: publicCarPath(maker.slug, model.slug, row.slug),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title) || a.yearStart - b.yearStart);
}

// ---------------------------------------------------------------------------
// Provenance snapshot: every variant with its spec sections
// ---------------------------------------------------------------------------

type SnapshotRow = CarVariant & {
  car_models: {
    id: string;
    name: string;
    slug: string;
    engine_position: CarModel["engine_position"];
    manufacturers: { id: string; name: string; slug: string };
  };
  performance_specs: PerformanceSpec | null;
  dimensions: DimensionSpec | null;
  fuel_specs: FuelSpec | null;
  ev_specs: EvSpec | null;
  engines: Engine | null;
  transmissions: Transmission | null;
};

export type VehicleProvenance = {
  id: string;
  title: string;
  isPublished: boolean;
  fuelType: FuelType;
  rows: ProvenanceRow[];
  summary: ProvenanceSummary;
  /** Sections with figures but no source. */
  unsourcedSections: ProvenanceSection[];
  /** Spec rows (sections) that have never been verified. */
  unverifiedSections: ProvenanceSection[];
};

function provenanceInput(row: SnapshotRow): ProvenanceInput {
  return {
    variant: row,
    performance: row.performance_specs,
    dimensions: row.dimensions,
    engine: row.engines,
    transmission: row.transmissions,
    fuel: row.fuel_specs,
    ev: row.ev_specs,
  };
}

function toProvenance(row: SnapshotRow): VehicleProvenance {
  const rows = buildProvenanceRows(provenanceInput(row));
  const sections = [...new Set(rows.map((entry) => entry.section))];
  const bySection = (section: ProvenanceSection) =>
    rows.find((entry) => entry.section === section);
  return {
    id: row.id,
    title: vehicleTitle(row.car_models.manufacturers.name, row.car_models.name, row.name),
    isPublished: row.is_published,
    fuelType: row.fuel_type,
    rows,
    summary: summarizeProvenance(rows),
    unsourcedSections: sections.filter(
      (section) => bySection(section)?.status === "unsourced",
    ),
    unverifiedSections: sections.filter((section) => !bySection(section)?.lastVerified),
  };
}

const SNAPSHOT_SELECT =
  "*, car_models!inner ( id, name, slug, engine_position, manufacturers!inner ( id, name, slug ) ), performance_specs (*), dimensions (*), fuel_specs (*), ev_specs (*), engines (*), transmissions (*)";

async function getSnapshot(supabase: AdminSupabase): Promise<SnapshotRow[] | null> {
  const { data, error } = await supabase
    .from("car_variants")
    .select(SNAPSHOT_SELECT)
    .limit(10000)
    .overrideTypes<SnapshotRow[], { merge: false }>();
  report("getSnapshot", error);
  return error ? null : (data ?? []);
}

export async function getProvenanceOverview(
  supabase: AdminSupabase,
): Promise<VehicleProvenance[] | null> {
  const snapshot = await getSnapshot(supabase);
  if (!snapshot) return null;
  return snapshot
    .map(toProvenance)
    .sort(
      (a, b) =>
        (a.summary.verifiedShare ?? -1) - (b.summary.verifiedShare ?? -1) ||
        b.summary.unsourced - a.summary.unsourced ||
        a.title.localeCompare(b.title),
    );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export type DashboardCounts = {
  variantsPublished: number | null;
  variantsDraft: number | null;
  manufacturers: number | null;
  models: number | null;
  generations: number | null;
  images: number | null;
  models3d: number | null;
  currentPrices: number | null;
  priceRows: number | null;
  regions: number | null;
  cities: number | null;
  users: number | null;
  admins: number | null;
};

export type DashboardQuality = {
  unsourcedVehicles: number | null;
  unverifiedSpecRows: number | null;
  unverifiedPrices: number | null;
  stalePrices: number | null;
  vehiclesWithoutPhoto: number | null;
  modelsWithoutEnginePosition: number | null;
  /** Image records pointing at a file under /public that does not exist. */
  missingImageFiles: number | null;
};

export type RecentEdit = {
  kind: "vehicle" | "price" | "media";
  id: string;
  title: string;
  detail: string;
  at: string;
  href: string;
};

export type DashboardData = {
  counts: DashboardCounts;
  quality: DashboardQuality;
  recent: RecentEdit[];
};

type CountResult = PromiseLike<{ count: number | null; error: PgError }>;

async function countOf(label: string, query: CountResult): Promise<number | null> {
  const { count, error } = await query;
  report(label, error);
  return error ? null : (count ?? 0);
}

export async function getDashboard(supabase: AdminSupabase): Promise<DashboardData> {
  const head = { count: "exact", head: true } as const;
  const staleBefore = addDays(todayIso(), -STALE_AFTER_DAYS);

  const [
    variantsPublished,
    variantsDraft,
    manufacturers,
    models,
    generations,
    images,
    models3d,
    currentPrices,
    priceRows,
    regions,
    cities,
    users,
    admins,
    unverifiedPrices,
    stalePrices,
    vehiclesWithoutPhoto,
    snapshot,
    modelRows,
    recent,
    imageRows,
  ] = await Promise.all([
    countOf(
      "published",
      supabase.from("car_variants").select("id", head).eq("is_published", true),
    ),
    countOf(
      "drafts",
      supabase.from("car_variants").select("id", head).eq("is_published", false),
    ),
    countOf("manufacturers", supabase.from("manufacturers").select("id", head)),
    countOf("models", supabase.from("car_models").select("id", head)),
    countOf("generations", supabase.from("car_generations").select("id", head)),
    countOf("images", supabase.from("car_media").select("id", head).eq("type", "image")),
    countOf("glb", supabase.from("car_media").select("id", head).eq("type", "glb")),
    countOf("current prices", supabase.from("current_market_prices").select("id", head)),
    countOf("price rows", supabase.from("market_prices").select("id", head)),
    countOf("regions", supabase.from("market_regions").select("id", head)),
    countOf("cities", supabase.from("market_cities").select("id", head)),
    // Admins can read every profile (profiles_select_own allows is_admin()).
    countOf("users", supabase.from("profiles").select("id", head)),
    countOf("admins", supabase.from("profiles").select("id", head).eq("role", "admin")),
    countOf(
      "unverified prices",
      supabase.from("current_market_prices").select("id", head).eq("is_verified", false),
    ),
    countOf(
      "stale prices",
      supabase
        .from("current_market_prices")
        .select("id", head)
        .lt("last_verified_at", staleBefore),
    ),
    countOf(
      "no photo",
      supabase
        .from("car_catalog")
        .select("variant_id", head)
        .is("primary_image_url", null),
    ),
    getSnapshot(supabase),
    supabase
      .from("car_models")
      .select("id, engine_position, car_variants ( fuel_type )")
      .overrideTypes<
        {
          id: string;
          engine_position: string | null;
          car_variants: { fuel_type: FuelType }[];
        }[],
        { merge: false }
      >(),
    getRecentEdits(supabase),
    supabase.from("car_media").select("url").eq("type", "image").limit(10000),
  ]);
  report("image urls", imageRows.error);
  const missingImageFiles = imageRows.error
    ? null
    : (imageRows.data ?? []).filter((row) => localFileMissing(row.url)).length;

  report("models for engine position", modelRows.error);
  const modelsWithoutEnginePosition = modelRows.error
    ? null
    : (modelRows.data ?? []).filter(
        (model) =>
          model.engine_position === null &&
          model.car_variants.some((variant) => variant.fuel_type !== "electric"),
      ).length;

  let unsourcedVehicles: number | null = null;
  let unverifiedSpecRows: number | null = null;
  if (snapshot) {
    const provenance = snapshot.map(toProvenance);
    unsourcedVehicles = provenance.filter(
      (entry) => entry.unsourcedSections.length > 0,
    ).length;
    // Engines and transmissions are shared: count each record once.
    const shared = new Map<string, boolean>();
    let own = 0;
    for (const row of snapshot) {
      for (const record of [
        row.performance_specs,
        row.dimensions,
        row.fuel_specs,
        row.ev_specs,
      ]) {
        if (record && !record.last_verified_at) own += 1;
      }
      if (row.engines) shared.set(`e:${row.engines.id}`, !row.engines.last_verified_at);
      if (row.transmissions) {
        shared.set(`t:${row.transmissions.id}`, !row.transmissions.last_verified_at);
      }
    }
    unverifiedSpecRows = own + [...shared.values()].filter(Boolean).length;
  }

  return {
    counts: {
      variantsPublished,
      variantsDraft,
      manufacturers,
      models,
      generations,
      images,
      models3d,
      currentPrices,
      priceRows,
      regions,
      cities,
      users,
      admins,
    },
    quality: {
      unsourcedVehicles,
      unverifiedSpecRows,
      unverifiedPrices,
      stalePrices,
      vehiclesWithoutPhoto,
      modelsWithoutEnginePosition,
      missingImageFiles,
    },
    recent,
  };
}

type RecentVariantRow = {
  id: string;
  name: string;
  updated_at: string;
  is_published: boolean;
  car_models: { name: string; manufacturers: { name: string } };
};
type RecentPriceRow = {
  id: string;
  variant_id: string;
  price_type: PriceType;
  currency: string;
  updated_at: string;
  car_variants: {
    name: string;
    car_models: { name: string; manufacturers: { name: string } };
  };
};
type RecentMediaRow = {
  id: string;
  type: "image" | "glb";
  variant_id: string | null;
  model_id: string | null;
  updated_at: string;
  alt: string | null;
};

async function getRecentEdits(supabase: AdminSupabase): Promise<RecentEdit[]> {
  const [variants, prices, media] = await Promise.all([
    supabase
      .from("car_variants")
      .select(
        "id, name, updated_at, is_published, car_models!inner ( name, manufacturers!inner ( name ) )",
      )
      .order("updated_at", { ascending: false })
      .limit(8)
      .overrideTypes<RecentVariantRow[], { merge: false }>(),
    supabase
      .from("market_prices")
      .select(
        "id, variant_id, price_type, currency, updated_at, car_variants!inner ( name, car_models!inner ( name, manufacturers!inner ( name ) ) )",
      )
      .order("updated_at", { ascending: false })
      .limit(6)
      .overrideTypes<RecentPriceRow[], { merge: false }>(),
    supabase
      .from("car_media")
      .select("id, type, variant_id, model_id, updated_at, alt")
      .order("updated_at", { ascending: false })
      .limit(6)
      .overrideTypes<RecentMediaRow[], { merge: false }>(),
  ]);
  report("recent variants", variants.error);
  report("recent prices", prices.error);
  report("recent media", media.error);

  const edits: RecentEdit[] = [
    ...(variants.data ?? []).map((row) => ({
      kind: "vehicle" as const,
      id: row.id,
      title: vehicleTitle(
        row.car_models.manufacturers.name,
        row.car_models.name,
        row.name,
      ),
      detail: row.is_published ? "Vehicle · published" : "Vehicle · draft",
      at: row.updated_at,
      href: `/admin/vehicles/${row.id}`,
    })),
    ...(prices.data ?? []).map((row) => ({
      kind: "price" as const,
      id: row.id,
      title: vehicleTitle(
        row.car_variants.car_models.manufacturers.name,
        row.car_variants.car_models.name,
        row.car_variants.name,
      ),
      detail: `Price · ${row.price_type.replace(/_/g, " ")} · ${row.currency}`,
      at: row.updated_at,
      href: `/admin/vehicles/${row.variant_id}/prices`,
    })),
    ...(media.data ?? []).map((row) => ({
      kind: "media" as const,
      id: row.id,
      title: row.alt ?? (row.type === "glb" ? "3D model" : "Photograph"),
      detail: row.type === "glb" ? "Media · 3D model" : "Media · photograph",
      at: row.updated_at,
      href: row.variant_id
        ? `/admin/vehicles/${row.variant_id}/media`
        : `/admin/models/${row.model_id ?? ""}/media`,
    })),
  ];
  return edits.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
}

// ---------------------------------------------------------------------------
// Vehicle list
// ---------------------------------------------------------------------------

export type VehicleQuality = "no-photo" | "unsourced" | "unverified";

export type VehicleListFilters = {
  q: string;
  manufacturer: string | null;
  fuel: FuelType | null;
  status: VehicleStatus | "none" | null;
  published: "yes" | "no" | null;
  year: number | null;
  quality: VehicleQuality | null;
  sort: "name" | "year";
  page: number;
};

export type VehicleListRow = {
  id: string;
  name: string;
  modelName: string;
  manufacturerName: string;
  yearStart: number | null;
  yearEnd: number | null;
  fuelType: FuelType | null;
  status: VehicleStatus | null;
  isPublished: boolean;
  imageUrl: string | null;
  hasGlb: boolean;
  publicPath: string | null;
};

export type VehicleList = {
  rows: VehicleListRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  error: boolean;
};

export const VEHICLE_PAGE_SIZE = 25;

/** Words safe to place inside a PostgREST or() filter. */
function searchWords(q: string): string[] {
  return q
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

export async function listAdminVehicles(
  supabase: AdminSupabase,
  filters: VehicleListFilters,
): Promise<VehicleList> {
  const pageSize = VEHICLE_PAGE_SIZE;
  const empty: VehicleList = {
    rows: [],
    total: 0,
    page: 1,
    pageCount: 0,
    pageSize,
    error: false,
  };

  let ids: string[] | null = null;
  if (filters.quality === "unsourced" || filters.quality === "unverified") {
    const snapshot = await getSnapshot(supabase);
    if (!snapshot) return { ...empty, error: true };
    const provenance = snapshot.map(toProvenance);
    ids = provenance
      .filter((entry) =>
        filters.quality === "unsourced"
          ? entry.unsourcedSections.length > 0
          : entry.unverifiedSections.length > 0,
      )
      .map((entry) => entry.id);
  }

  let query = supabase
    .from("car_catalog")
    .select(
      "variant_id, variant_name, variant_slug, model_name, model_slug, manufacturer_name, manufacturer_slug, year_start, year_end, fuel_type, status, is_published, primary_image_url, has_glb",
      { count: "exact" },
    );

  for (const word of searchWords(filters.q)) {
    query = query.or(
      `variant_name.ilike.*${word}*,model_name.ilike.*${word}*,manufacturer_name.ilike.*${word}*`,
    );
  }
  if (filters.manufacturer) query = query.eq("manufacturer_id", filters.manufacturer);
  if (filters.fuel) query = query.eq("fuel_type", filters.fuel);
  if (filters.status === "none") query = query.is("status", null);
  else if (filters.status) query = query.eq("status", filters.status);
  if (filters.published) query = query.eq("is_published", filters.published === "yes");
  if (filters.year !== null) {
    query = query
      .lte("year_start", filters.year)
      .or(`year_end.is.null,year_end.gte.${filters.year}`);
  }
  if (filters.quality === "no-photo") query = query.is("primary_image_url", null);
  if (ids) query = query.in("variant_id", ids);

  query =
    filters.sort === "year"
      ? query
          .order("year_start", { ascending: false })
          .order("manufacturer_name")
          .order("model_name")
      : query
          .order("manufacturer_name")
          .order("model_name")
          .order("year_start", { ascending: false });
  query = query.order("variant_name").order("variant_id");

  const page = Math.max(1, filters.page);
  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) {
    report("listAdminVehicles", error);
    // A page past the end is a range error in PostgREST; show the empty list.
    return { ...empty, error: error.code !== "PGRST103" };
  }

  const total = count ?? 0;
  return {
    rows: (data ?? []).map((row) => ({
      id: row.variant_id ?? "",
      name: row.variant_name ?? "",
      modelName: row.model_name ?? "",
      manufacturerName: row.manufacturer_name ?? "",
      yearStart: row.year_start,
      yearEnd: row.year_end,
      fuelType: row.fuel_type,
      status: row.status,
      isPublished: row.is_published ?? false,
      imageUrl: row.primary_image_url,
      hasGlb: row.has_glb ?? false,
      publicPath:
        row.manufacturer_slug && row.model_slug && row.variant_slug
          ? publicCarPath(row.manufacturer_slug, row.model_slug, row.variant_slug)
          : null,
    })),
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
    error: false,
  };
}

export async function getManufacturerOptions(
  supabase: AdminSupabase,
): Promise<{ id: string; name: string; slug: string }[]> {
  const { data, error } = await supabase
    .from("manufacturers")
    .select("id, name, slug")
    .order("name");
  report("getManufacturerOptions", error);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// One vehicle, for the editor
// ---------------------------------------------------------------------------

export type AdminVehicle = {
  variant: CarVariant;
  model: CarModel;
  manufacturer: Pick<Manufacturer, "id" | "name" | "slug" | "country_id">;
  category: Pick<Category, "id" | "name" | "slug">;
  generation: CarGeneration | null;
  engine: Engine | null;
  transmission: Transmission | null;
  performance: PerformanceSpec | null;
  dimensions: DimensionSpec | null;
  fuel: FuelSpec | null;
  ev: EvSpec | null;
  title: string;
  publicPath: string;
};

type VehicleRow = CarVariant & {
  car_models: CarModel & {
    manufacturers: Pick<Manufacturer, "id" | "name" | "slug" | "country_id">;
    categories: Pick<Category, "id" | "name" | "slug">;
  };
  car_generations: CarGeneration | null;
  engines: Engine | null;
  transmissions: Transmission | null;
  performance_specs: PerformanceSpec | null;
  dimensions: DimensionSpec | null;
  fuel_specs: FuelSpec | null;
  ev_specs: EvSpec | null;
};

/** Cached per request: the editor's layout and page share one read. */
export const getAdminVehicle = cache(async function getAdminVehicle(
  supabase: AdminSupabase,
  id: string,
): Promise<AdminVehicle | null> {
  const { data, error } = await supabase
    .from("car_variants")
    .select(
      "*, car_models!inner ( *, manufacturers!inner ( id, name, slug, country_id ), categories!inner ( id, name, slug ) ), car_generations (*), engines (*), transmissions (*), performance_specs (*), dimensions (*), fuel_specs (*), ev_specs (*)",
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<VehicleRow | null, { merge: false }>();
  report("getAdminVehicle", error);
  if (!data) return null;

  const {
    car_models,
    car_generations,
    engines,
    transmissions,
    performance_specs,
    dimensions,
    fuel_specs,
    ev_specs,
    ...variant
  } = data;
  const { manufacturers, categories, ...model } = car_models;
  return {
    variant,
    model,
    manufacturer: manufacturers,
    category: categories,
    generation: car_generations,
    engine: engines,
    transmission: transmissions,
    performance: performance_specs,
    dimensions,
    fuel: fuel_specs,
    ev: ev_specs,
    title: vehicleTitle(manufacturers.name, model.name, variant.name),
    publicPath: publicCarPath(manufacturers.slug, model.slug, variant.slug),
  };
});

export type EngineOption = Pick<
  Engine,
  "id" | "name" | "configuration" | "displacement_cc" | "aspiration"
> & { usage: number };
export type TransmissionOption = Pick<Transmission, "id" | "name" | "type" | "gears"> & {
  usage: number;
};

export type VehicleFormOptions = {
  manufacturers: { id: string; name: string; slug: string }[];
  models: {
    id: string;
    name: string;
    slug: string;
    manufacturer_id: string;
    generation: string | null;
    body_type: CarModel["body_type"];
  }[];
  categories: { id: string; name: string }[];
  engines: EngineOption[];
  transmissions: TransmissionOption[];
  generations: Pick<
    CarGeneration,
    "id" | "model_id" | "name" | "year_start" | "year_end"
  >[];
};

export async function getVehicleFormOptions(
  supabase: AdminSupabase,
): Promise<VehicleFormOptions> {
  const [manufacturers, models, categories, engines, transmissions, generations, usage] =
    await Promise.all([
      supabase.from("manufacturers").select("id, name, slug").order("name"),
      supabase
        .from("car_models")
        .select("id, name, slug, manufacturer_id, generation, body_type")
        .order("name"),
      supabase.from("categories").select("id, name").order("display_order").order("name"),
      supabase
        .from("engines")
        .select("id, name, configuration, displacement_cc, aspiration")
        .order("name"),
      supabase.from("transmissions").select("id, name, type, gears").order("name"),
      supabase
        .from("car_generations")
        .select("id, model_id, name, year_start, year_end")
        .order("year_start", { ascending: false, nullsFirst: false }),
      supabase.from("car_variants").select("engine_id, transmission_id").limit(10000),
    ]);
  for (const [label, result] of Object.entries({
    manufacturers,
    models,
    categories,
    engines,
    transmissions,
    generations,
    usage,
  })) {
    report(`options.${label}`, result.error);
  }

  const engineUse = new Map<string, number>();
  const gearboxUse = new Map<string, number>();
  for (const row of usage.data ?? []) {
    if (row.engine_id)
      engineUse.set(row.engine_id, (engineUse.get(row.engine_id) ?? 0) + 1);
    if (row.transmission_id) {
      gearboxUse.set(row.transmission_id, (gearboxUse.get(row.transmission_id) ?? 0) + 1);
    }
  }

  return {
    manufacturers: manufacturers.data ?? [],
    models: models.data ?? [],
    categories: categories.data ?? [],
    engines: (engines.data ?? []).map((row) => ({
      ...row,
      usage: engineUse.get(row.id) ?? 0,
    })),
    transmissions: (transmissions.data ?? []).map((row) => ({
      ...row,
      usage: gearboxUse.get(row.id) ?? 0,
    })),
    generations: generations.data ?? [],
  };
}

// ---------------------------------------------------------------------------
// Features and parts attached to a vehicle
// ---------------------------------------------------------------------------

export type VehicleFeatures = {
  attached: {
    featureId: string;
    name: string;
    category: string | null;
    detail: string | null;
  }[];
  all: { id: string; name: string; category: string | null }[];
};

export async function getVehicleFeatures(
  supabase: AdminSupabase,
  variantId: string,
): Promise<VehicleFeatures> {
  const [attached, all] = await Promise.all([
    supabase
      .from("variant_features")
      .select("feature_id, detail, features!inner ( name, category )")
      .eq("variant_id", variantId)
      .overrideTypes<
        {
          feature_id: string;
          detail: string | null;
          features: { name: string; category: string | null };
        }[],
        { merge: false }
      >(),
    supabase
      .from("features")
      .select("id, name, category")
      .order("category")
      .order("name"),
  ]);
  report("variant_features", attached.error);
  report("features", all.error);
  return {
    attached: (attached.data ?? [])
      .map((row) => ({
        featureId: row.feature_id,
        name: row.features.name,
        category: row.features.category,
        detail: row.detail,
      }))
      .sort(
        (a, b) =>
          (a.category ?? "").localeCompare(b.category ?? "") ||
          a.name.localeCompare(b.name),
      ),
    all: all.data ?? [],
  };
}

export type VehicleParts = {
  attached: {
    partId: string;
    name: string;
    slug: string;
    category: string;
    detail: string | null;
  }[];
  all: { id: string; name: string; category: string }[];
};

export async function getVehicleParts(
  supabase: AdminSupabase,
  variantId: string,
): Promise<VehicleParts> {
  const [attached, all] = await Promise.all([
    supabase
      .from("variant_parts")
      .select(
        "part_id, detail, parts!inner ( name, slug, part_categories!inner ( name ) )",
      )
      .eq("variant_id", variantId)
      .overrideTypes<
        {
          part_id: string;
          detail: string | null;
          parts: { name: string; slug: string; part_categories: { name: string } };
        }[],
        { merge: false }
      >(),
    supabase
      .from("parts")
      .select("id, name, part_categories!inner ( name, display_order )")
      .order("name")
      .overrideTypes<
        {
          id: string;
          name: string;
          part_categories: { name: string; display_order: number };
        }[],
        { merge: false }
      >(),
  ]);
  report("variant_parts", attached.error);
  report("parts", all.error);
  return {
    attached: (attached.data ?? [])
      .map((row) => ({
        partId: row.part_id,
        name: row.parts.name,
        slug: row.parts.slug,
        category: row.parts.part_categories.name,
        detail: row.detail,
      }))
      .sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      ),
    all: (all.data ?? [])
      .map((row) => ({ id: row.id, name: row.name, category: row.part_categories.name }))
      .sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      ),
  };
}

// ---------------------------------------------------------------------------
// Geography (markets)
// ---------------------------------------------------------------------------

export type AdminCity = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  priceCount: number;
};
export type AdminRegion = {
  id: string;
  name: string;
  slug: string;
  display_order: number;
  priceCount: number;
  cities: AdminCity[];
};
export type AdminCountry = {
  id: string;
  name: string;
  slug: string;
  iso_code: string;
  flag_emoji: string | null;
  currency_code: string | null;
  priceCount: number;
  regions: AdminRegion[];
};
export type AdminGeography = { countries: AdminCountry[]; error: boolean };

type GeoRow = {
  id: string;
  name: string;
  slug: string;
  iso_code: string;
  flag_emoji: string | null;
  currency_code: string | null;
  market_regions: {
    id: string;
    name: string;
    slug: string;
    display_order: number;
    market_cities: { id: string; name: string; slug: string; display_order: number }[];
  }[];
};

const byOrder = <T extends { display_order: number; name: string }>(a: T, b: T) =>
  a.display_order - b.display_order || a.name.localeCompare(b.name);

export async function getAdminGeography(
  supabase: AdminSupabase,
): Promise<AdminGeography> {
  const [geo, prices] = await Promise.all([
    supabase
      .from("countries")
      .select(
        "id, name, slug, iso_code, flag_emoji, currency_code, market_regions ( id, name, slug, display_order, market_cities ( id, name, slug, display_order ) )",
      )
      .order("name")
      .overrideTypes<GeoRow[], { merge: false }>(),
    supabase.from("market_prices").select("country_id, region_id, city_id").limit(50000),
  ]);
  report("geography", geo.error);
  report("geography price counts", prices.error);

  const counts = new Map<string, number>();
  for (const row of prices.data ?? []) {
    for (const id of [row.country_id, row.region_id, row.city_id]) {
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }

  return {
    error: Boolean(geo.error),
    countries: (geo.data ?? []).map((country) => ({
      id: country.id,
      name: country.name,
      slug: country.slug,
      iso_code: country.iso_code,
      flag_emoji: country.flag_emoji,
      currency_code: country.currency_code,
      priceCount: counts.get(country.id) ?? 0,
      regions: [...(country.market_regions ?? [])].sort(byOrder).map((region) => ({
        id: region.id,
        name: region.name,
        slug: region.slug,
        display_order: region.display_order,
        priceCount: counts.get(region.id) ?? 0,
        cities: [...(region.market_cities ?? [])].sort(byOrder).map((city) => ({
          ...city,
          priceCount: counts.get(city.id) ?? 0,
        })),
      })),
    })),
  };
}

/** "Mumbai, Maharashtra, India" for a price row, from the geography. */
export function marketLabel(
  geography: AdminGeography,
  row: Pick<MarketPrice, "country_id" | "region_id" | "city_id">,
): string {
  const country = geography.countries.find((entry) => entry.id === row.country_id);
  const region = country?.regions.find((entry) => entry.id === row.region_id);
  const city = region?.cities.find((entry) => entry.id === row.city_id);
  return [city?.name, region?.name, country?.name ?? "Unknown market"]
    .filter(Boolean)
    .join(", ");
}

// ---------------------------------------------------------------------------
// Prices
// ---------------------------------------------------------------------------

export type AdminPriceRow = MarketPrice & {
  marketLabel: string;
  scope: PriceScope;
  isCurrent: boolean;
  /** Starts after today: recorded in advance, not yet in force. */
  isScheduled: boolean;
  isStale: boolean;
};

function decoratePrice(
  row: MarketPrice,
  geography: AdminGeography,
  currentIds: Set<string>,
  staleBefore: string,
): AdminPriceRow {
  return {
    ...row,
    marketLabel: marketLabel(geography, row),
    scope: scopeOf(row),
    isCurrent: currentIds.has(row.id),
    isScheduled: row.effective_from > todayIso(),
    isStale: row.last_verified_at < staleBefore,
  };
}

export async function getVehiclePrices(
  supabase: AdminSupabase,
  variantId: string,
  geography: AdminGeography,
): Promise<{ rows: AdminPriceRow[]; error: boolean }> {
  const [history, current] = await Promise.all([
    supabase
      .from("market_prices")
      .select("*")
      .eq("variant_id", variantId)
      .order("effective_from", { ascending: false })
      .limit(2000),
    supabase.from("current_market_prices").select("id").eq("variant_id", variantId),
  ]);
  report("vehicle prices", history.error);
  report("vehicle current prices", current.error);
  const currentIds = new Set(
    (current.data ?? []).flatMap((row) => (row.id ? [row.id] : [])),
  );
  const staleBefore = addDays(todayIso(), -STALE_AFTER_DAYS);
  return {
    error: Boolean(history.error || current.error),
    rows: (history.data ?? []).map((row) =>
      decoratePrice(row, geography, currentIds, staleBefore),
    ),
  };
}

export type PriceOverviewFilter = "all" | "unverified" | "stale";

export type PriceOverviewRow = AdminPriceRow & { vehicleTitle: string };

/** In-force prices across the catalogue, for the Prices overview. */
export async function getPriceOverview(
  supabase: AdminSupabase,
  filter: PriceOverviewFilter,
  geography: AdminGeography,
  labels: Map<string, VariantLabel>,
): Promise<{ rows: PriceOverviewRow[]; error: boolean }> {
  const staleBefore = addDays(todayIso(), -STALE_AFTER_DAYS);
  let query = supabase.from("current_market_prices").select("*");
  if (filter === "unverified") query = query.eq("is_verified", false);
  if (filter === "stale") query = query.lt("last_verified_at", staleBefore);
  const { data, error } = await query
    .order("last_verified_at", { ascending: true })
    .limit(500)
    .overrideTypes<MarketPrice[], { merge: false }>();
  report("price overview", error);
  const rows = (data ?? []).map((row) => ({
    ...decoratePrice(row, geography, new Set([row.id]), staleBefore),
    vehicleTitle: labels.get(row.variant_id)?.title ?? "Unknown vehicle",
  }));
  return { rows, error: Boolean(error) };
}

export async function getPriceById(
  supabase: AdminSupabase,
  id: string,
): Promise<MarketPrice | null> {
  const { data, error } = await supabase
    .from("market_prices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  report("getPriceById", error);
  return data;
}

// ---------------------------------------------------------------------------
// Media, availability, colours
// ---------------------------------------------------------------------------

export async function getOwnerMedia(
  supabase: AdminSupabase,
  owner: { variantId: string } | { modelId: string },
): Promise<{ images: CarMedia[]; glb: CarMedia | null; error: boolean }> {
  const column = "variantId" in owner ? "variant_id" : "model_id";
  const id = "variantId" in owner ? owner.variantId : owner.modelId;
  const { data, error } = await supabase
    .from("car_media")
    .select("*")
    .eq(column, id)
    .order("is_primary", { ascending: false })
    .order("display_order")
    .order("created_at");
  report("getOwnerMedia", error);
  const rows = data ?? [];
  return {
    images: rows.filter((row) => row.type === "image"),
    glb: rows.find((row) => row.type === "glb") ?? null,
    error: Boolean(error),
  };
}

export type AvailabilityRow = VariantMarket & {
  country: { name: string; flag_emoji: string | null };
};

export async function getVariantMarkets(
  supabase: AdminSupabase,
  variantId: string,
): Promise<{ rows: AvailabilityRow[]; error: boolean }> {
  const { data, error } = await supabase
    .from("variant_markets")
    .select("*, country:countries!inner ( name, flag_emoji )")
    .eq("variant_id", variantId)
    .overrideTypes<AvailabilityRow[], { merge: false }>();
  report("getVariantMarkets", error);
  return {
    rows: (data ?? []).sort((a, b) => a.country.name.localeCompare(b.country.name)),
    error: Boolean(error),
  };
}

export async function getModelColors(
  supabase: AdminSupabase,
  modelId: string,
): Promise<{ rows: CarColor[]; error: boolean }> {
  const { data, error } = await supabase
    .from("car_colors")
    .select("*")
    .eq("model_id", modelId)
    .order("display_order")
    .order("name");
  report("getModelColors", error);
  return { rows: data ?? [], error: Boolean(error) };
}

export async function getCountryOptions(
  supabase: AdminSupabase,
): Promise<
  { id: string; name: string; flag_emoji: string | null; currency_code: string | null }[]
> {
  const { data, error } = await supabase
    .from("countries")
    .select("id, name, flag_emoji, currency_code")
    .order("name");
  report("getCountryOptions", error);
  return data ?? [];
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

export type ModelListRow = {
  id: string;
  name: string;
  slug: string;
  manufacturerName: string;
  manufacturerId: string;
  categoryName: string;
  bodyType: CarModel["body_type"];
  enginePosition: CarModel["engine_position"];
  generation: string | null;
  productionStart: number | null;
  productionEnd: number | null;
  variantCount: number;
  combustion: boolean;
  colorCount: number;
  imageCount: number;
};

type ModelListQueryRow = {
  id: string;
  name: string;
  slug: string;
  body_type: CarModel["body_type"];
  engine_position: CarModel["engine_position"];
  generation: string | null;
  production_start: number | null;
  production_end: number | null;
  manufacturers: { id: string; name: string };
  categories: { name: string };
  car_variants: { fuel_type: FuelType }[];
  car_colors: { id: string }[];
  car_media: { id: string; type: string }[];
};

export async function listAdminModels(
  supabase: AdminSupabase,
): Promise<{ rows: ModelListRow[]; error: boolean }> {
  const { data, error } = await supabase
    .from("car_models")
    .select(
      "id, name, slug, body_type, engine_position, generation, production_start, production_end, manufacturers!inner ( id, name ), categories!inner ( name ), car_variants ( fuel_type ), car_colors ( id ), car_media ( id, type )",
    )
    .limit(5000)
    .overrideTypes<ModelListQueryRow[], { merge: false }>();
  report("listAdminModels", error);
  return {
    error: Boolean(error),
    rows: (data ?? [])
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        manufacturerName: row.manufacturers.name,
        manufacturerId: row.manufacturers.id,
        categoryName: row.categories.name,
        bodyType: row.body_type,
        enginePosition: row.engine_position,
        generation: row.generation,
        productionStart: row.production_start,
        productionEnd: row.production_end,
        variantCount: row.car_variants.length,
        combustion: row.car_variants.some((variant) => variant.fuel_type !== "electric"),
        colorCount: row.car_colors.length,
        imageCount: row.car_media.filter((media) => media.type === "image").length,
      }))
      .sort(
        (a, b) =>
          a.manufacturerName.localeCompare(b.manufacturerName) ||
          a.name.localeCompare(b.name),
      ),
  };
}

export type AdminModel = {
  model: CarModel;
  manufacturer: { id: string; name: string; slug: string };
  category: { id: string; name: string };
  generations: CarGeneration[];
  variants: {
    id: string;
    name: string;
    slug: string;
    fuel_type: FuelType;
    year_start: number;
    year_end: number | null;
    is_published: boolean;
    generation_id: string | null;
  }[];
  title: string;
};

type AdminModelRow = CarModel & {
  manufacturers: { id: string; name: string; slug: string };
  categories: { id: string; name: string };
  car_generations: CarGeneration[];
  car_variants: AdminModel["variants"];
};

export const getAdminModel = cache(async function getAdminModel(
  supabase: AdminSupabase,
  id: string,
): Promise<AdminModel | null> {
  const { data, error } = await supabase
    .from("car_models")
    .select(
      "*, manufacturers!inner ( id, name, slug ), categories!inner ( id, name ), car_generations (*), car_variants ( id, name, slug, fuel_type, year_start, year_end, is_published, generation_id )",
    )
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<AdminModelRow | null, { merge: false }>();
  report("getAdminModel", error);
  if (!data) return null;
  const { manufacturers, categories, car_generations, car_variants, ...model } = data;
  return {
    model,
    manufacturer: manufacturers,
    category: categories,
    generations: [...car_generations].sort(
      (a, b) => (b.year_start ?? 0) - (a.year_start ?? 0) || a.name.localeCompare(b.name),
    ),
    variants: [...car_variants].sort(
      (a, b) => b.year_start - a.year_start || a.name.localeCompare(b.name),
    ),
    title: `${manufacturers.name} ${model.name}`,
  };
});

// ---------------------------------------------------------------------------
// CSV import lookups
// ---------------------------------------------------------------------------

export async function getCsvData(supabase: AdminSupabase) {
  const [labels, geography] = await Promise.all([
    getVariantLabels(supabase),
    getAdminGeography(supabase),
  ]);
  return { labels, geography };
}

// ---------------------------------------------------------------------------
// Media overview
// ---------------------------------------------------------------------------

export type MediaOverviewRow = CarMedia & { ownerTitle: string; ownerHref: string };

export async function getMediaOverview(
  supabase: AdminSupabase,
  labels: Map<string, VariantLabel>,
): Promise<{ rows: MediaOverviewRow[]; error: boolean }> {
  const [media, models] = await Promise.all([
    supabase
      .from("car_media")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(5000),
    supabase
      .from("car_models")
      .select("id, name, manufacturers!inner ( name )")
      .overrideTypes<
        { id: string; name: string; manufacturers: { name: string } }[],
        { merge: false }
      >(),
  ]);
  report("media overview", media.error);
  report("media overview models", models.error);
  const modelTitles = new Map(
    (models.data ?? []).map((model) => [
      model.id,
      `${model.manufacturers.name} ${model.name}`,
    ]),
  );
  return {
    error: Boolean(media.error),
    rows: (media.data ?? []).map((row) => ({
      ...row,
      ownerTitle: row.variant_id
        ? (labels.get(row.variant_id)?.title ?? "Unknown vehicle")
        : `${modelTitles.get(row.model_id ?? "") ?? "Unknown model"} (model)`,
      ownerHref: row.variant_id
        ? `/admin/vehicles/${row.variant_id}/media`
        : `/admin/models/${row.model_id ?? ""}/media`,
    })),
  };
}
