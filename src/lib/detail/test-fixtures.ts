import type { CarMedia, VariantDetail } from "@/types/domain";

/**
 * Test-only fixtures for the detail helpers: the smallest VariantDetail that
 * type-checks, shaped like a Porsche 911 GT3, with overrides. The figures are
 * fixtures for exercising code paths, not catalogue data.
 */

const stamp = "2024-01-01T00:00:00Z";

type DetailOverrides = {
  variant?: Partial<VariantDetail["variant"]>;
  model?: Partial<VariantDetail["model"]>;
  manufacturer?: Partial<VariantDetail["manufacturer"]>;
  engine?: Partial<NonNullable<VariantDetail["engine"]>> | null;
  transmission?: Partial<NonNullable<VariantDetail["transmission"]>> | null;
  performance?: Partial<NonNullable<VariantDetail["performance"]>> | null;
  dimensions?: Partial<NonNullable<VariantDetail["dimensions"]>> | null;
  fuel?: Partial<NonNullable<VariantDetail["fuel"]>> | null;
  ev?: Partial<NonNullable<VariantDetail["ev"]>> | null;
  generation?: VariantDetail["generation"];
  features?: VariantDetail["features"];
  parts?: VariantDetail["parts"];
  media?: CarMedia[];
  modelMedia?: CarMedia[];
};

export function makeDetail(o: DetailOverrides = {}): VariantDetail {
  return {
    variant: {
      id: "variant-gt3",
      model_id: "model-911",
      name: "GT3",
      slug: "gt3",
      year_start: 2021,
      year_end: null,
      base_price: null,
      price_currency: null,
      fuel_type: "petrol",
      drive_type: "rwd",
      engine_id: "engine",
      transmission_id: "transmission",
      description: null,
      source: null,
      notes: null,
      is_published: true,
      search_document: null,
      source_url: null,
      last_verified_at: null,
      generation_id: null,
      status: null,
      created_at: stamp,
      updated_at: stamp,
      ...o.variant,
    },
    model: {
      id: "model-911",
      manufacturer_id: "manufacturer-porsche",
      category_id: "category-sports",
      name: "911",
      slug: "911",
      generation: "992",
      body_type: "coupe",
      description: null,
      production_start: 2019,
      production_end: null,
      created_at: stamp,
      updated_at: stamp,
      engine_position: "rear",
      ...o.model,
    },
    manufacturer: {
      id: "manufacturer-porsche",
      country_id: "country-de",
      name: "Porsche",
      slug: "porsche",
      logo_url: null,
      founded_year: 1931,
      headquarters: null,
      description: null,
      segment: "performance",
      website: null,
      created_at: stamp,
      updated_at: stamp,
      ...o.manufacturer,
    },
    country: {
      id: "country-de",
      name: "Germany",
      slug: "germany",
      iso_code: "DE",
      flag_emoji: "🇩🇪",
      description: null,
      automotive_history: null,
      currency_code: "EUR",
      created_at: stamp,
      updated_at: stamp,
    },
    category: {
      id: "category-sports",
      name: "Sports Car",
      slug: "sports-car",
      description: null,
      display_order: 0,
    },
    engine:
      o.engine === null
        ? null
        : {
            id: "engine",
            name: "4.0 flat-six",
            layout: "flat",
            cylinders: 6,
            displacement_cc: 3996,
            aspiration: "naturally_aspirated",
            fuel_system: null,
            compression_ratio: null,
            redline_rpm: 9000,
            cooling: null,
            valves_per_cylinder: null,
            notes: null,
            source: null,
            source_url: null,
            last_verified_at: null,
            configuration: "Flat-6",
            ...o.engine,
          },
    transmission:
      o.transmission === null
        ? null
        : {
            id: "transmission",
            name: "7-speed PDK",
            type: "dct",
            gears: 7,
            notes: null,
            source: null,
            source_url: null,
            last_verified_at: null,
            ...o.transmission,
          },
    performance:
      o.performance === null
        ? null
        : {
            variant_id: "variant-gt3",
            power_hp: 510,
            power_rpm: null,
            torque_nm: 470,
            torque_rpm: null,
            top_speed_kmh: 320,
            zero_to_100_s: 3.4,
            zero_to_200_s: null,
            quarter_mile_s: null,
            braking_100_0_m: null,
            source: null,
            source_url: null,
            last_verified_at: null,
            notes: null,
            ...o.performance,
          },
    dimensions:
      o.dimensions === null
        ? null
        : {
            variant_id: "variant-gt3",
            length_mm: 4573,
            width_mm: 1852,
            height_mm: 1279,
            wheelbase_mm: 2457,
            kerb_weight_kg: 1418,
            ground_clearance_mm: null,
            boot_capacity_l: null,
            seating_capacity: 2,
            source: null,
            source_url: null,
            last_verified_at: null,
            notes: null,
            ...o.dimensions,
          },
    fuel:
      o.fuel === null || o.fuel === undefined
        ? null
        : {
            variant_id: "variant-gt3",
            tank_capacity_l: null,
            mileage_kmpl: null,
            co2_g_km: null,
            emission_standard: null,
            source: null,
            notes: null,
            source_url: null,
            last_verified_at: null,
            ...o.fuel,
          },
    ev:
      o.ev === null || o.ev === undefined
        ? null
        : {
            variant_id: "variant-gt3",
            battery_kwh: null,
            usable_battery_kwh: null,
            range_km: null,
            range_standard: null,
            max_charge_kw: null,
            charge_10_80_min: null,
            motor_count: null,
            source: null,
            source_url: null,
            last_verified_at: null,
            notes: null,
            ...o.ev,
          },
    features: o.features ?? [],
    parts: o.parts ?? [],
    media: o.media ?? [],
    modelMedia: o.modelMedia ?? [],
    generation: o.generation ?? null,
    colors: [],
    markets: [],
  };
}

export function makeMedia(
  overrides: Partial<CarMedia> & { id: string; url: string },
): CarMedia {
  return {
    variant_id: "variant-gt3",
    model_id: null,
    type: "image",
    alt: null,
    is_primary: false,
    display_order: 0,
    credit: null,
    created_at: stamp,
    shot: null,
    source: null,
    source_url: null,
    license: null,
    author: null,
    storage_path: null,
    width: null,
    height: null,
    file_size_bytes: null,
    model_format: null,
    compression: [],
    is_exact_model: null,
    model_version: null,
    poster_url: null,
    updated_at: stamp,
    ...overrides,
  };
}
