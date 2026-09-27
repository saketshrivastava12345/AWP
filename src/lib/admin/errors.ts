/**
 * Turns a Postgres / PostgREST error into a sentence an editor can act on.
 *
 * The database is the final authority on every rule (constraints, triggers,
 * row level security), so its refusals must reach the admin as plain English,
 * not as "violates check constraint car_variants_electric_has_no_engine".
 * Pure: unit-tested without a database.
 */

export type DbErrorLike = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

/** Messages for named constraints, unique indexes and foreign keys. */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  // Unique keys and indexes
  car_variants_no_duplicate_name:
    "This model already has a variant with that name starting in that year.",
  car_variants_model_id_slug_key: "Another variant of this model already uses that slug.",
  car_models_manufacturer_id_slug_key:
    "This manufacturer already has a model with that slug.",
  engines_name_key: "An engine with that name already exists. Select it instead.",
  transmissions_name_key:
    "A transmission with that name already exists. Select it instead.",
  features_name_key: "A feature with that name already exists. Select it instead.",
  features_slug_key: "A feature with that slug already exists.",
  market_prices_one_per_scope_and_date:
    "A price of this type for this market already starts on that date. Edit that price, or choose another effective date.",
  market_regions_country_id_slug_key: "This country already has a state with that slug.",
  market_regions_country_id_name_key: "This country already has a state with that name.",
  market_cities_region_id_slug_key: "This state already has a city with that slug.",
  market_cities_region_id_name_key: "This state already has a city with that name.",
  car_generations_model_id_slug_key:
    "This model already has a generation with that slug.",
  car_colors_model_id_name_key: "This model already has a colour with that name.",
  variant_markets_pkey:
    "Availability in this country is already recorded for this vehicle. Edit it instead.",
  variant_features_pkey: "That feature is already attached to this vehicle.",
  variant_parts_pkey: "That part is already attached to this vehicle.",
  car_media_one_primary_per_variant: "Another image is already the primary image.",
  car_media_one_primary_per_model: "Another image is already the primary image.",
  car_media_one_glb_per_variant:
    "This vehicle already has a 3D model. Use Replace to swap it.",

  // Check constraints
  car_variants_electric_has_no_engine:
    "A battery-electric vehicle cannot have a combustion engine. Clear the engine first.",
  car_variants_year_order: "The last model year cannot be before the first.",
  car_models_year_order: "Production cannot end before it starts.",
  car_generations_year_order: "A generation cannot end before it starts.",
  car_variants_price_currency_together:
    "A base price needs its currency, and a currency needs a price.",
  performance_specs_200_after_100: "0–200 km/h must take longer than 0–100 km/h.",
  dimensions_wheelbase_within_length:
    "The wheelbase must be shorter than the overall length.",
  ev_specs_range_needs_standard:
    "A range figure needs the test standard it was measured under (WLTP, EPA, …).",
  ev_specs_usable_lte_gross: "Usable battery capacity cannot exceed the gross capacity.",
  transmissions_single_speed_gears: "A single-speed transmission has exactly one gear.",
  market_prices_city_needs_region: "A city price must also name the city's state.",
  market_prices_period: "“Effective to” cannot be before “effective from”.",
  market_prices_listed_types_have_price:
    "This price type needs the listed (ex-showroom) price.",
  market_prices_on_road_types_have_total:
    "An on-road price type needs the on-road total.",
  countries_currency_code_iso: "Currency must be a three-letter ISO code such as INR.",
  market_prices_currency_iso: "Currency must be a three-letter ISO code such as INR.",
  car_media_glb_declares_fidelity:
    "A 3D model must say whether it is the exact vehicle or a representation.",
  car_media_model_fields_only_on_glb:
    "3D-model details can only be recorded on a 3D model.",
  car_media_exactly_one_owner: "Media must belong to exactly one vehicle or model.",
  car_media_compression_values: "Unknown 3D compression type.",
  car_media_model_format_values: "Unknown 3D model format.",
  slug_check: "Slugs may only use lowercase letters, digits and single hyphens.",

  // Foreign keys (delete blocked, or a referenced row has gone)
  market_prices_region_id_fkey:
    "Prices are recorded for this state. Delete or move those prices first.",
  market_prices_city_id_fkey:
    "Prices are recorded for this city. Delete or move those prices first.",
  market_prices_country_id_fkey:
    "Prices are recorded for this country. Delete those prices first.",
  manufacturers_country_id_fkey: "Manufacturers still belong to this country.",
  car_models_category_id_fkey: "Models still use this category.",
  parts_category_id_fkey: "Parts still use this category.",
};

/** Messages raised by the powertrain and scope triggers (errcode check_violation). */
const TRIGGER_MESSAGES: { test: RegExp; message: string }[] = [
  {
    test: /fuel_specs cannot be attached to a battery-electric/i,
    message: "A battery-electric vehicle has no fuel specifications.",
  },
  {
    test: /ev_specs cannot be attached to a/i,
    message:
      "EV specifications apply only to electric, plug-in hybrid and hybrid vehicles.",
  },
  {
    test: /Generation .* does not belong to model/i,
    message: "That generation belongs to a different model.",
  },
  {
    test: /Region .* is not in country/i,
    message: "That state is not in the chosen country.",
  },
  { test: /City .* is not in region/i, message: "That city is not in the chosen state." },
];

/** The form field a constraint is about, so the message can sit next to it. */
const CONSTRAINT_FIELDS: Record<string, string> = {
  car_variants_no_duplicate_name: "name",
  car_variants_model_id_slug_key: "slug",
  car_models_manufacturer_id_slug_key: "slug",
  engines_name_key: "name",
  transmissions_name_key: "name",
  features_name_key: "name",
  features_slug_key: "slug",
  market_prices_one_per_scope_and_date: "effective_from",
  market_regions_country_id_slug_key: "slug",
  market_regions_country_id_name_key: "name",
  market_cities_region_id_slug_key: "slug",
  market_cities_region_id_name_key: "name",
  car_generations_model_id_slug_key: "slug",
  car_colors_model_id_name_key: "name",
  variant_markets_pkey: "country_id",
  car_variants_electric_has_no_engine: "engine_id",
  car_variants_year_order: "year_end",
  car_models_year_order: "production_end",
  car_generations_year_order: "year_end",
  performance_specs_200_after_100: "zero_to_200_s",
  dimensions_wheelbase_within_length: "wheelbase_mm",
  ev_specs_range_needs_standard: "range_standard",
  ev_specs_usable_lte_gross: "usable_battery_kwh",
  transmissions_single_speed_gears: "gears",
  market_prices_period: "effective_to",
  market_prices_listed_types_have_price: "ex_showroom_price",
  market_prices_on_road_types_have_total: "on_road_price",
};

export function fieldForDbError(error: DbErrorLike | null | undefined): string | null {
  if (!error) return null;
  const text = [error.message, error.details].filter(Boolean).join(" ");
  const name = constraintName(text);
  if (!name) return null;
  if (sourceUrlConstraint(name)) return "source_url";
  return CONSTRAINT_FIELDS[name] ?? null;
}

function constraintName(text: string): string | null {
  // PostgREST passes Postgres' wording through: … constraint "name" …
  const match = /constraint "([^"]+)"/i.exec(text);
  return match?.[1] ?? null;
}

function sourceUrlConstraint(name: string): boolean {
  return /_source_url_http$/.test(name);
}

export function describeDbError(error: DbErrorLike | null | undefined): string {
  if (!error) return "Something went wrong. Nothing was saved.";
  const code = error.code ?? "";
  const text = [error.message, error.details, error.hint].filter(Boolean).join(" ");

  for (const entry of TRIGGER_MESSAGES) {
    if (entry.test.test(text)) return entry.message;
  }

  const name = constraintName(text);
  if (name) {
    const known = CONSTRAINT_MESSAGES[name];
    if (known) return known;
    if (sourceUrlConstraint(name))
      return "Source URLs must start with http:// or https://.";
  }

  switch (code) {
    case "23505":
      return "That already exists. Change the name or slug, or edit the existing record.";
    case "23514":
      return "A value is outside what the database accepts for that field.";
    case "23503":
      return /update or delete/i.test(text)
        ? "Other records still refer to this one, so it cannot be deleted."
        : "A linked record no longer exists. Reload the page and try again.";
    case "23502": {
      const column = /column "([^"]+)"/i.exec(text)?.[1];
      return column
        ? `A required value is missing (${column.replace(/_/g, " ")}).`
        : "A required value is missing.";
    }
    case "22P02":
    case "22007":
    case "22008":
      return "A value has the wrong format.";
    case "22003":
      return "A number is too large for its field.";
    case "22001":
      return "A text value is too long for its field.";
    case "42501":
      return "You do not have permission to do that. The admin role is required.";
    case "PGRST301":
    case "PGRST302":
      return "Your session has expired. Sign in again.";
    case "PGRST116":
      return "That record no longer exists. Reload the page.";
    case "P0001":
      return error.message ?? "The database refused this change.";
    default:
      break;
  }

  if (/row-level security/i.test(text)) {
    return "You do not have permission to do that. The admin role is required.";
  }
  if (/JWT expired|invalid JWT/i.test(text))
    return "Your session has expired. Sign in again.";
  if (/fetch failed|ECONNREFUSED|network/i.test(text)) {
    return "The database could not be reached. Nothing was saved; try again.";
  }
  return "The database refused this change. Nothing was saved.";
}
