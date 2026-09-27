import type { CatalogCar } from "@/types/domain";

/**
 * The catalogue-view columns a car card reads — the one list every card query
 * selects (collection, featured, siblings, favourites, maker and country pages,
 * model pages).
 *
 * The view is wide (fifty-odd columns), so cards never select `*`. The row
 * type is derived from this list, so a component that receives a card row
 * cannot read a column that was not selected: it is a type error, not an
 * `undefined` typed as `null` at runtime.
 *
 * Type-only dependencies: safe to `import type` from client components.
 */
export const CARD_COLUMN_LIST = [
  "variant_id",
  "variant_slug",
  "variant_name",
  "model_id",
  "model_slug",
  "model_name",
  "generation_name",
  "manufacturer_slug",
  "manufacturer_name",
  "country_slug",
  "country_name",
  "country_flag_emoji",
  "category_name",
  "category_slug",
  "body_type",
  "fuel_type",
  "drive_type",
  "power_hp",
  "torque_nm",
  "top_speed_kmh",
  "zero_to_100_s",
  "range_km",
  "year_start",
  "year_end",
  "status",
  "engine_configuration",
  "aspiration",
  "motor_count",
  "primary_image_url",
  "has_glb",
  "listed_price",
  "listed_price_currency",
  "listed_price_type",
  "listed_price_market",
  "listed_price_verified_at",
] as const satisfies readonly (keyof CatalogCar)[];

export type CardColumn = (typeof CARD_COLUMN_LIST)[number];

/** A catalogue row with exactly the card columns. */
export type CatalogCardRow = Pick<CatalogCar, CardColumn>;

/** The PostgREST select string for CARD_COLUMN_LIST. */
export const CARD_COLUMNS: string = CARD_COLUMN_LIST.join(",");
