import type { Part, VariantDetail, ViewerGroup } from "@/types/domain";

/**
 * Test fixtures shared by the tests of modules that read a VariantDetail
 * (the anatomy tour, the blueprint): the smallest VariantDetail that
 * type-checks — a Porsche 911 GT3 by default — with overrides.
 */

const stamp = "2024-01-01T00:00:00Z";

export function part(
  slug: string,
  group: ViewerGroup,
  fn = `What ${slug} does. More detail.`,
): Part {
  return {
    id: `part-${slug}`,
    category_id: "category",
    name: slug.replace(/-/g, " "),
    slug,
    description: null,
    function: fn,
    typical_materials: null,
    location: null,
    common_failure_points: null,
    performance_impact: null,
    image_url: null,
    viewer_group: group,
    display_order: 0,
    created_at: stamp,
    updated_at: stamp,
  };
}

export const ENCYCLOPEDIA: Part[] = [
  part("bonnet", "body"),
  part("fender", "body"),
  part("windscreen", "body"),
  part("front-bumper", "body"),
  part("rear-spoiler", "body"),
  part("cylinder-block", "engine"),
  part("crankshaft", "engine"),
  part("cylinder-head", "engine"),
  part("piston", "engine"),
  part("turbocharger", "engine"),
  part("supercharger", "engine"),
  part("intercooler", "engine"),
  part("dual-clutch-transmission", "transmission"),
  part("manual-gearbox", "transmission"),
  part("clutch", "transmission"),
  part("torque-converter", "transmission"),
  part("transfer-case", "transmission"),
  part("differential", "transmission"),
  part("cv-joint", "transmission"),
  part("coil-spring", "suspension"),
  part("air-spring", "suspension"),
  part("damper", "suspension"),
  part("anti-roll-bar", "suspension"),
  part("double-wishbone", "suspension"),
  part("brake-disc", "brakes"),
  part("carbon-ceramic-disc", "brakes"),
  part("brake-caliper", "brakes"),
  part("brake-pad", "brakes"),
  part("tyre", "wheels"),
  part("seat", "interior"),
  part("steering-wheel", "interior"),
  part("dashboard", "interior"),
  part("airbag", "interior"),
  part("traction-battery-pack", "battery"),
  part("battery-management-system", "battery"),
  part("battery-thermal-management", "battery"),
  part("on-board-charger", "battery"),
  part("electric-traction-motor", "battery"),
  part("inverter", "battery"),
  part("regenerative-braking-system", "battery"),
];

export const bySlug = (slug: string) => ENCYCLOPEDIA.find((entry) => entry.slug === slug)!;

export type Overrides = {
  fuel?: VariantDetail["variant"]["fuel_type"];
  drive?: VariantDetail["variant"]["drive_type"];
  body?: VariantDetail["model"]["body_type"];
  position?: VariantDetail["model"]["engine_position"];
  engine?: Partial<NonNullable<VariantDetail["engine"]>> | null;
  transmission?: Partial<NonNullable<VariantDetail["transmission"]>> | null;
  performance?: Partial<NonNullable<VariantDetail["performance"]>> | null;
  dimensions?: Partial<NonNullable<VariantDetail["dimensions"]>> | null;
  ev?: Partial<NonNullable<VariantDetail["ev"]>> | null;
  parts?: VariantDetail["parts"];
  features?: { slug: string; category: string; detail?: string | null }[];
};

export function makeDetail(o: Overrides = {}): VariantDetail {
  const fuel = o.fuel ?? "petrol";
  return {
    variant: {
      id: "variant",
      model_id: "model",
      name: "GT3",
      slug: "gt3",
      year_start: 2021,
      year_end: null,
      base_price: null,
      price_currency: null,
      fuel_type: fuel,
      drive_type: o.drive ?? "rwd",
      engine_id: null,
      transmission_id: null,
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
    },
    model: {
      id: "model",
      manufacturer_id: "manufacturer",
      category_id: "category",
      name: "911",
      slug: "911",
      generation: "992",
      body_type: o.body ?? "coupe",
      description: null,
      production_start: 2019,
      production_end: null,
      created_at: stamp,
      updated_at: stamp,
      engine_position: o.position === undefined ? "rear" : o.position,
    },
    manufacturer: {
      id: "manufacturer",
      country_id: "country",
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
    },
    country: {
      id: "country",
      name: "Germany",
      slug: "germany",
      iso_code: "DE",
      flag_emoji: null,
      description: null,
      automotive_history: null,
      currency_code: null,
      created_at: stamp,
      updated_at: stamp,
    },
    category: {
      id: "category",
      name: "Sports Car",
      slug: "sports-car",
      description: null,
      display_order: 0,
    },
    engine:
      o.engine === null || fuel === "electric"
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
            variant_id: "variant",
            power_hp: 510,
            power_rpm: 8400,
            torque_nm: 470,
            torque_rpm: 6100,
            top_speed_kmh: 318,
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
            variant_id: "variant",
            length_mm: 4573,
            width_mm: 1852,
            height_mm: 1279,
            wheelbase_mm: 2457,
            kerb_weight_kg: 1435,
            ground_clearance_mm: null,
            boot_capacity_l: null,
            seating_capacity: 2,
            source: null,
            source_url: null,
            last_verified_at: null,
            notes: null,
            ...o.dimensions,
          },
    fuel: null,
    ev:
      o.ev === null || o.ev === undefined
        ? null
        : {
            variant_id: "variant",
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
    features: (o.features ?? []).map(({ slug, category, detail }) => ({
      feature: { id: `feature-${slug}`, name: slug, slug, category, description: null },
      detail: detail ?? null,
    })),
    parts: o.parts ?? [],
    media: [],
    modelMedia: [],
    generation: null,
    colors: [],
    markets: [],
  };
}

