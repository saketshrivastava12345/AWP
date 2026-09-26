import "server-only";

import { createServerSupabaseClient, isConfigured } from "@/lib/supabase/server";

export type TableCount = { table: string; label: string; count: number };

/** Tables surfaced on the admin dashboard, in a sensible reading order. */
const ADMIN_TABLES: { table: string; label: string }[] = [
  { table: "countries", label: "Countries" },
  { table: "manufacturers", label: "Manufacturers" },
  { table: "categories", label: "Categories" },
  { table: "car_models", label: "Models" },
  { table: "car_variants", label: "Variants" },
  { table: "engines", label: "Engines" },
  { table: "transmissions", label: "Transmissions" },
  { table: "performance_specs", label: "Performance specs" },
  { table: "dimensions", label: "Dimensions" },
  { table: "fuel_specs", label: "Fuel specs" },
  { table: "ev_specs", label: "EV specs" },
  { table: "part_categories", label: "Part categories" },
  { table: "parts", label: "Parts" },
  { table: "part_relations", label: "Part relations" },
  { table: "variant_parts", label: "Variant parts" },
  { table: "features", label: "Features" },
  { table: "variant_features", label: "Variant features" },
  { table: "car_media", label: "Media" },
  { table: "profiles", label: "Profiles" },
  { table: "favorites", label: "Favorites" },
];

/**
 * Row counts for the admin dashboard.
 *
 * Uses `head: true` so Postgres returns only the count, never the rows — the
 * dashboard needs twenty numbers, not twenty table dumps.
 */
export async function getTableCounts(): Promise<TableCount[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = await createServerSupabaseClient();

    const results = await Promise.all(
      ADMIN_TABLES.map(async (entry) => {
        const { count } = await supabase
          // The table list is a fixed literal above, never user input.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- from() needs a literal union; this list is a constant, not user input
          .from(entry.table as any)
          .select("*", { count: "exact", head: true });
        return { ...entry, count: count ?? 0 };
      }),
    );

    return results;
  } catch (error) {
    console.error("getTableCounts threw:", error);
    return [];
  }
}

export type RecentVariant = {
  id: string;
  name: string;
  model: string;
  manufacturer: string;
  updated_at: string;
  is_published: boolean;
};

/** Most recently edited variants, as a read-only activity list. */
export async function getRecentVariants(limit = 12): Promise<RecentVariant[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from("car_variants")
      .select(
        "id, name, updated_at, is_published, car_models ( name, manufacturers ( name ) )",
      )
      .order("updated_at", { ascending: false })
      .limit(limit)
      .returns<
        {
          id: string;
          name: string;
          updated_at: string;
          is_published: boolean;
          car_models: { name: string; manufacturers: { name: string } | null } | null;
        }[]
      >();

    if (error) {
      console.error("getRecentVariants failed:", error.message);
      return [];
    }

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      model: row.car_models?.name ?? "—",
      manufacturer: row.car_models?.manufacturers?.name ?? "—",
      updated_at: row.updated_at,
      is_published: row.is_published,
    }));
  } catch (error) {
    console.error("getRecentVariants threw:", error);
    return [];
  }
}
