import { describe, expect, it } from "vitest";
import { buildAnatomyTour, type TourStop } from "./anatomy-tour";
import type { Part, VariantDetail, ViewerGroup } from "@/types/domain";

// ---------------------------------------------------------------------------
// Fixtures: the smallest VariantDetail that type-checks, with overrides.
// ---------------------------------------------------------------------------

const stamp = "2024-01-01T00:00:00Z";

function part(
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

const ENCYCLOPEDIA: Part[] = [
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

const bySlug = (slug: string) => ENCYCLOPEDIA.find((entry) => entry.slug === slug)!;

type Overrides = {
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

function makeDetail(o: Overrides = {}): VariantDetail {
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

const ids = (stops: TourStop[]) => stops.map((stop) => stop.id);
const stop = (stops: TourStop[], id: TourStop["id"]) =>
  stops.find((entry) => entry.id === id)!;
const slugs = (entry: TourStop) => entry.components.map((component) => component.slug);

// ---------------------------------------------------------------------------

describe("buildAnatomyTour", () => {
  describe("stops follow the powertrain, like the spec sections do", () => {
    it("a combustion car tours its engine and has no battery stop", () => {
      const tour = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(ids(tour)).toEqual([
        "design",
        "engine",
        "drivetrain",
        "chassis",
        "brakes",
        "interior",
        "performance",
      ]);
    });

    it("an electric car has motors and a battery, and never an engine", () => {
      const tour = buildAnatomyTour(
        makeDetail({
          fuel: "electric",
          position: null,
          ev: { battery_kwh: 100, motor_count: 3 },
        }),
        ENCYCLOPEDIA,
      );
      expect(ids(tour)).not.toContain("engine");
      expect(ids(tour)).toContain("electric");
      expect(ids(tour)).toContain("battery");
      expect(stop(tour, "electric").title).toBe("3 electric motors");
      expect(stop(tour, "battery").title).toBe("100 kWh battery");
    });

    it("keeps an electric car's motor parts on the motors stop, not the battery", () => {
      const tour = buildAnatomyTour(
        makeDetail({
          fuel: "electric",
          position: null,
          ev: { motor_count: 3 },
          parts: [
            { part: bySlug("electric-traction-motor"), detail: "Carbon-sleeved rotors." },
          ],
        }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(tour, "electric"))[0]).toBe("electric-traction-motor");
      expect(slugs(stop(tour, "battery"))).not.toContain("electric-traction-motor");
      expect(slugs(stop(tour, "electric"))).not.toContain("traction-battery-pack");
    });

    it("a plug-in hybrid has an engine and a battery, but no separate motor stop", () => {
      const tour = buildAnatomyTour(
        makeDetail({ fuel: "phev", ev: { motor_count: 1 } }),
        ENCYCLOPEDIA,
      );
      expect(ids(tour)).toContain("engine");
      expect(ids(tour)).toContain("battery");
      expect(ids(tour)).not.toContain("electric");
      expect(slugs(stop(tour, "battery"))).toContain("on-board-charger");
    });

    it("a self-charging hybrid has no on-board charger to list", () => {
      const tour = buildAnatomyTour(makeDetail({ fuel: "hybrid" }), ENCYCLOPEDIA);
      expect(slugs(stop(tour, "battery"))).not.toContain("on-board-charger");
    });
  });

  describe("data honesty", () => {
    it("lists only figures that exist", () => {
      const tour = buildAnatomyTour(
        makeDetail({ performance: { top_speed_kmh: null, zero_to_100_s: null } }),
        ENCYCLOPEDIA,
      );
      const labels = stop(tour, "performance").stats.map((entry) => entry.label);
      expect(labels).not.toContain("Top speed");
      expect(labels).not.toContain("0–100 km/h");
      expect(labels).toContain("Power");
      for (const entry of tour) {
        for (const { value } of entry.stats)
          expect(value).not.toMatch(/null|undefined|NaN/);
      }
    });

    it("omits power-to-weight when the maker publishes no kerb weight", () => {
      const tour = buildAnatomyTour(
        makeDetail({ dimensions: { kerb_weight_kg: null } }),
        ENCYCLOPEDIA,
      );
      const labels = stop(tour, "performance").stats.map((entry) => entry.label);
      expect(labels).not.toContain("Power-to-weight");
    });

    it("never lists a turbocharger on a naturally aspirated engine", () => {
      const tour = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(slugs(stop(tour, "engine"))).not.toContain("turbocharger");
    });

    it("lists a turbocharger and intercooler on a twin-turbo engine", () => {
      const tour = buildAnatomyTour(
        makeDetail({ engine: { aspiration: "twin_turbo" } }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(tour, "engine"))).toEqual(
        expect.arrayContaining(["turbocharger", "intercooler"]),
      );
      expect(slugs(stop(tour, "engine"))).not.toContain("supercharger");
    });

    it("only shows carbon-ceramic brakes when they are catalogued", () => {
      const steel = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(slugs(stop(steel, "brakes"))).toContain("brake-disc");
      expect(slugs(stop(steel, "brakes"))).not.toContain("carbon-ceramic-disc");

      const ceramic = buildAnatomyTour(
        makeDetail({
          features: [{ slug: "carbon-ceramic-brakes", category: "Braking" }],
        }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(ceramic, "brakes"))).toContain("carbon-ceramic-disc");
      expect(stop(ceramic, "brakes").title).toBe("Carbon-ceramic brakes");
    });

    it("swaps coil springs for air springs only with catalogued air suspension", () => {
      const coil = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(slugs(stop(coil, "chassis"))).toContain("coil-spring");

      const air = buildAnatomyTour(
        makeDetail({ features: [{ slug: "air-suspension", category: "Chassis" }] }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(air, "chassis"))).toContain("air-spring");
      expect(slugs(stop(air, "chassis"))).not.toContain("coil-spring");
    });

    it("says nothing about where the engine sits when that is not recorded", () => {
      const known = stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "engine");
      expect(known.body).toMatch(/behind the rear axle/);

      const unknown = stop(
        buildAnatomyTour(makeDetail({ position: null }), ENCYCLOPEDIA),
        "engine",
      );
      expect(unknown.body).not.toMatch(/axle|cabin/);
      expect(unknown.stats.map((entry) => entry.label)).not.toContain("Position");
    });
  });

  describe("variant-specific notes", () => {
    it("puts this car's catalogued parts first, with their notes", () => {
      const tour = buildAnatomyTour(
        makeDetail({
          parts: [
            {
              part: bySlug("double-wishbone"),
              detail:
                "Double-wishbone front suspension adapted from the 911 RSR race car.",
            },
          ],
        }),
        ENCYCLOPEDIA,
      );
      const first = stop(tour, "chassis").components[0];
      expect(first?.slug).toBe("double-wishbone");
      expect(first?.note).toMatch(/RSR/);
    });

    it("keeps each stop to a readable handful of components", () => {
      const tour = buildAnatomyTour(
        makeDetail({ engine: { aspiration: "twincharged" } }),
        ENCYCLOPEDIA,
      );
      for (const entry of tour) expect(entry.components.length).toBeLessThanOrEqual(4);
    });

    it("summarises each component in one sentence", () => {
      const tour = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(stop(tour, "engine").components[0]?.summary).toMatch(
        /^What [a-z-]+ does\.$/,
      );
    });
  });

  describe("titles read naturally", () => {
    it("names the engine by size and layout", () => {
      expect(stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "engine").title).toBe(
        "4.0-litre Flat-6",
      );
    });

    it("names the gearbox and drive", () => {
      expect(stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "drivetrain").title).toBe(
        "7-speed dual-clutch · RWD",
      );
      const ev = buildAnatomyTour(
        makeDetail({
          fuel: "electric",
          drive: "awd",
          transmission: { type: "single_speed", gears: 1, name: "Single-speed" },
          ev: { motor_count: 2 },
        }),
        ENCYCLOPEDIA,
      );
      expect(stop(ev, "drivetrain").title).toBe("Single-speed · AWD");
    });

    it("leads the finale with 0–100 when it is published", () => {
      expect(
        stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "performance").title,
      ).toBe("0–100 km/h in 3.4 s");
      const noSprint = buildAnatomyTour(
        makeDetail({ performance: { zero_to_100_s: null } }),
        ENCYCLOPEDIA,
      );
      expect(stop(noSprint, "performance").title).toBe("510 hp");
    });
  });
});
