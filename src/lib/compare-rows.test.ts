import { describe, expect, it } from "vitest";
import type {
  DimensionSpec,
  Engine,
  EvSpec,
  Feature,
  FuelSpec,
  FuelType,
  PerformanceSpec,
  VariantDetail,
} from "@/types/domain";
import {
  buildCompareRows,
  countRows,
  powerConvention,
  priceTypeLabel,
  shortCarName,
  summariseCar,
  type CompareGroup,
  type CompareInput,
  type CompareRow,
  type ListedPrice,
} from "./compare-rows";

// ---------------------------------------------------------------------------
// Fixtures. Every figure below is an arbitrary test number, not a real spec.
// ---------------------------------------------------------------------------

const STAMP = "2026-01-01T00:00:00Z";

type CarOptions = {
  id: string;
  fuel?: FuelType;
  performance?: Partial<PerformanceSpec> | null;
  dimensions?: Partial<DimensionSpec> | null;
  engine?: Partial<Engine> | null;
  ev?: Partial<EvSpec> | null;
  fuelSpec?: Partial<FuelSpec> | null;
  features?: {
    feature: Partial<Feature> & { id: string; name: string };
    detail?: string;
  }[];
  listed?: ListedPrice | null;
  model?: string;
  variant?: string;
};

function car(options: CarOptions): CompareInput {
  const { id } = options;
  const performance: PerformanceSpec | null =
    options.performance === null
      ? null
      : {
          variant_id: id,
          power_hp: null,
          power_rpm: null,
          torque_nm: null,
          torque_rpm: null,
          top_speed_kmh: null,
          zero_to_100_s: null,
          zero_to_200_s: null,
          quarter_mile_s: null,
          braking_100_0_m: null,
          source: null,
          notes: null,
          source_url: null,
          last_verified_at: null,
          ...options.performance,
        };
  const dimensions: DimensionSpec | null =
    options.dimensions === null
      ? null
      : {
          variant_id: id,
          length_mm: null,
          width_mm: null,
          height_mm: null,
          wheelbase_mm: null,
          kerb_weight_kg: null,
          ground_clearance_mm: null,
          boot_capacity_l: null,
          seating_capacity: null,
          source: null,
          notes: null,
          source_url: null,
          last_verified_at: null,
          ...options.dimensions,
        };
  const engine: Engine | null = options.engine
    ? {
        id: `engine-${id}`,
        name: "Test engine",
        layout: "flat",
        cylinders: 6,
        displacement_cc: null,
        aspiration: "naturally_aspirated",
        fuel_system: null,
        compression_ratio: null,
        redline_rpm: null,
        cooling: null,
        valves_per_cylinder: null,
        notes: null,
        source: null,
        configuration: null,
        source_url: null,
        last_verified_at: null,
        ...options.engine,
      }
    : null;
  const ev: EvSpec | null = options.ev
    ? {
        variant_id: id,
        battery_kwh: null,
        usable_battery_kwh: null,
        range_km: null,
        range_standard: null,
        max_charge_kw: null,
        charge_10_80_min: null,
        motor_count: null,
        source: null,
        notes: null,
        source_url: null,
        last_verified_at: null,
        ...options.ev,
      }
    : null;
  const fuel: FuelSpec | null = options.fuelSpec
    ? {
        variant_id: id,
        tank_capacity_l: null,
        mileage_kmpl: null,
        co2_g_km: null,
        emission_standard: null,
        source: null,
        notes: null,
        source_url: null,
        last_verified_at: null,
        ...options.fuelSpec,
      }
    : null;

  const detail: VariantDetail = {
    variant: {
      id,
      model_id: `model-${id}`,
      name: options.variant ?? `Variant ${id}`,
      slug: `variant-${id}`,
      year_start: 2024,
      year_end: null,
      base_price: null,
      price_currency: null,
      fuel_type: options.fuel ?? "petrol",
      drive_type: "rwd",
      engine_id: engine?.id ?? null,
      transmission_id: null,
      description: null,
      source: null,
      notes: null,
      is_published: true,
      search_document: null,
      created_at: STAMP,
      updated_at: STAMP,
      source_url: null,
      last_verified_at: null,
      generation_id: null,
      status: null,
    },
    model: {
      id: `model-${id}`,
      manufacturer_id: "maker",
      category_id: "category",
      name: options.model ?? `Model ${id}`,
      slug: `model-${id}`,
      generation: null,
      body_type: "coupe",
      description: null,
      production_start: null,
      production_end: null,
      created_at: STAMP,
      updated_at: STAMP,
      engine_position: null,
    },
    manufacturer: {
      id: "maker",
      country_id: "country",
      name: "Maker",
      slug: "maker",
      logo_url: null,
      founded_year: null,
      headquarters: null,
      description: null,
      segment: "performance",
      website: null,
      created_at: STAMP,
      updated_at: STAMP,
    },
    country: {
      id: "country",
      name: "Testland",
      slug: "testland",
      iso_code: "TL",
      flag_emoji: null,
      description: null,
      automotive_history: null,
      created_at: STAMP,
      updated_at: STAMP,
      currency_code: null,
    },
    category: {
      id: "category",
      name: "Sports car",
      slug: "sports-car",
      description: null,
      display_order: 0,
    },
    engine,
    transmission: null,
    performance,
    dimensions,
    fuel,
    ev,
    features: (options.features ?? []).map(({ feature, detail }) => ({
      feature: { slug: feature.id, category: null, description: null, ...feature },
      detail: detail ?? null,
    })),
    parts: [],
    media: [],
    modelMedia: [],
    generation: null,
    colors: [],
    markets: [],
  };

  return { detail, listed: options.listed ?? null };
}

function findRow(groups: CompareGroup[], id: string): CompareRow {
  const row = groups.flatMap((group) => group.rows).find((entry) => entry.id === id);
  if (!row) throw new Error(`row ${id} not found`);
  return row;
}

function hasRow(groups: CompareGroup[], id: string): boolean {
  return groups.some((group) => group.rows.some((row) => row.id === id));
}

// ---------------------------------------------------------------------------

describe("bars and best-in-row, higher is better", () => {
  const groups = buildCompareRows([
    car({ id: "a", performance: { power_hp: 500 } }),
    car({ id: "b", performance: { power_hp: 250 } }),
    car({ id: "c", performance: { power_hp: null } }),
  ]);
  const power = findRow(groups, "performance.power");

  it("scales each bar to the row's maximum", () => {
    expect(power.hasBars).toBe(true);
    expect(power.cells.map((cell) => cell.bar)).toEqual([1, 0.5, null]);
  });

  it("crowns the highest figure", () => {
    expect(power.hasBest).toBe(true);
    expect(power.cells.map((cell) => cell.isBest)).toEqual([true, false, false]);
  });

  it("renders a missing figure as missing, never zero", () => {
    expect(power.cells[2]).toMatchObject({
      state: "missing",
      display: null,
      value: null,
    });
  });

  it("formats with a consistent unit", () => {
    expect(power.cells[0]?.display).toBe("500 hp");
    expect(power.cells[1]?.display).toBe("250 hp");
  });
});

describe("lower is better (inverted scale)", () => {
  const groups = buildCompareRows([
    car({
      id: "a",
      performance: { zero_to_100_s: 4 },
      dimensions: { kerb_weight_kg: 1500 },
    }),
    car({
      id: "b",
      performance: { zero_to_100_s: 2 },
      dimensions: { kerb_weight_kg: 2000 },
    }),
  ]);

  it("gives the lowest figure the full bar and scales the rest by lowest ÷ value", () => {
    const sprint = findRow(groups, "performance.zero100");
    expect(sprint.better).toBe("lower");
    expect(sprint.cells.map((cell) => cell.bar)).toEqual([0.5, 1]);
    expect(sprint.cells.map((cell) => cell.isBest)).toEqual([false, true]);
    expect(sprint.cells[1]?.display).toBe("2.0 s");
    expect(sprint.scale).toMatch(/inverted/);
  });

  it("never ranks kerb weight, and draws no bar for it", () => {
    const weight = findRow(groups, "dimensions.kerb");
    expect(weight.better).toBe("none");
    expect(weight.hasBest).toBe(false);
    expect(weight.hasBars).toBe(false);
    expect(weight.cells.every((cell) => !cell.isBest && cell.bar === null)).toBe(true);
  });
});

describe("best-in-row rules", () => {
  it("never crowns the only car that publishes a figure, and draws no bar", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", performance: { top_speed_kmh: 300 } }),
        car({ id: "b", performance: { top_speed_kmh: null } }),
      ]),
      "performance.top",
    );
    expect(row.hasBest).toBe(false);
    expect(row.hasBars).toBe(false);
    expect(row.cells.every((cell) => !cell.isBest && cell.bar === null)).toBe(true);
  });

  it("marks every tied leader when some cars differ", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", performance: { power_hp: 510 } }),
        car({ id: "b", performance: { power_hp: 510 } }),
        car({ id: "c", performance: { power_hp: 480 } }),
      ]),
      "performance.power",
    );
    expect(row.cells.map((cell) => cell.isBest)).toEqual([true, true, false]);
  });

  it("crowns nobody when every car ties", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", performance: { power_hp: 510 } }),
        car({ id: "b", performance: { power_hp: 510 } }),
      ]),
      "performance.power",
    );
    expect(row.hasBest).toBe(false);
    expect(row.differs).toBe(false);
    // Still drawn to scale: equal bars say "equal" honestly.
    expect(row.cells.map((cell) => cell.bar)).toEqual([1, 1]);
  });

  it("never ranks a neutral figure, and draws no bar for a dimension", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", dimensions: { length_mm: 4000 } }),
        car({ id: "b", dimensions: { length_mm: 5000 } }),
      ]),
      "dimensions.length",
    );
    expect(row.better).toBe("none");
    expect(row.hasBest).toBe(false);
    expect(row.hasBars).toBe(false);
    expect(row.cells.map((cell) => cell.bar)).toEqual([null, null]);
    expect(row.cells[0]?.display).toBe("4,000 mm");
  });

  it("marks the best on a ranked row without bars", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", dimensions: { boot_capacity_l: 300 } }),
        car({ id: "b", dimensions: { boot_capacity_l: 450 } }),
      ]),
      "dimensions.boot",
    );
    expect(row.hasBars).toBe(false);
    expect(row.hasBest).toBe(true);
    expect(row.cells.map((cell) => cell.isBest)).toEqual([false, true]);
    expect(row.cells.every((cell) => cell.bar === null)).toBe(true);
  });

  it("draws bars only on the headline performance rows", () => {
    const groups = buildCompareRows([
      car({
        id: "a",
        performance: { power_hp: 500, torque_nm: 600 },
        engine: { redline_rpm: 9000 },
        dimensions: { seating_capacity: 2, length_mm: 4500 },
      }),
      car({
        id: "b",
        performance: { power_hp: 400, torque_nm: 500 },
        engine: { redline_rpm: 7000 },
        dimensions: { seating_capacity: 4, length_mm: 4800 },
      }),
    ]);
    const barred = groups
      .flatMap((group) => group.rows)
      .filter((row) => row.hasBars)
      .map((row) => row.id);
    expect(barred).toEqual(["performance.power", "performance.torque"]);
  });

  it("neither ranks nor scales figures from different test cycles", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", fuel: "electric", ev: { range_km: 500, range_standard: "wltp" } }),
        car({ id: "b", fuel: "electric", ev: { range_km: 600, range_standard: "epa" } }),
      ]),
      "electric.range",
    );
    expect(row.better).toBe("none");
    expect(row.hasBars).toBe(false);
    expect(row.hasBest).toBe(false);
    expect(row.hint).toMatch(/different test cycles/);
    expect(row.cells.map((cell) => cell.note)).toEqual(["WLTP", "EPA"]);
  });

  it("ranks range when the test cycle matches", () => {
    const row = findRow(
      buildCompareRows([
        car({ id: "a", fuel: "electric", ev: { range_km: 500, range_standard: "wltp" } }),
        car({ id: "b", fuel: "electric", ev: { range_km: 600, range_standard: "wltp" } }),
      ]),
      "electric.range",
    );
    expect(row.cells.map((cell) => cell.isBest)).toEqual([false, true]);
  });
});

describe("powertrain applicability", () => {
  const groups = buildCompareRows([
    car({
      id: "petrol",
      fuel: "petrol",
      engine: { displacement_cc: 4000 },
      fuelSpec: { tank_capacity_l: 64 },
    }),
    car({
      id: "ev",
      fuel: "electric",
      ev: { battery_kwh: 90, range_km: 500, range_standard: "wltp" },
    }),
  ]);

  it("marks engine figures n/a for an electric car, not missing", () => {
    const row = findRow(groups, "engine.displacement");
    expect(row.cells.map((cell) => cell.state)).toEqual(["value", "not-applicable"]);
    // One published figure: no bars, no winner.
    expect(row.hasBars).toBe(false);
  });

  it("marks battery figures n/a for a combustion car", () => {
    const row = findRow(groups, "electric.battery");
    expect(row.cells.map((cell) => cell.state)).toEqual(["not-applicable", "value"]);
  });

  it("shows the Electric group only when an electrified car is present", () => {
    const petrolOnly = buildCompareRows([
      car({ id: "a", engine: { displacement_cc: 2000 } }),
      car({ id: "b", engine: { displacement_cc: 3000 } }),
    ]);
    expect(petrolOnly.some((group) => group.id === "electric")).toBe(false);
    expect(groups.some((group) => group.id === "electric")).toBe(true);
  });

  it("drops the Engine group when every car is electric", () => {
    const evs = buildCompareRows([
      car({ id: "a", fuel: "electric", ev: { battery_kwh: 80 } }),
      car({ id: "b", fuel: "electric", ev: { battery_kwh: 100 } }),
    ]);
    expect(evs.some((group) => group.id === "engine")).toBe(false);
  });

  it("drops rows where no car has a figure", () => {
    expect(hasRow(groups, "performance.braking")).toBe(false);
    expect(hasRow(groups, "electric.charge1080")).toBe(false);
  });
});

describe("prices", () => {
  const groups = buildCompareRows([
    car({
      id: "a",
      listed: {
        amount: "35100000.00",
        currency: "INR",
        type: "ex_showroom",
        market: "Pune, Maharashtra, India",
        verifiedAt: "2026-08-12",
      },
    }),
    car({
      id: "b",
      listed: {
        amount: 161100,
        currency: "USD",
        type: "base_price",
        market: null,
        verifiedAt: null,
      },
    }),
    car({ id: "c", listed: null }),
  ]);
  const price = findRow(groups, "price.listed");

  it("shows each price as published, with its type and market, never ranked", () => {
    expect(price.kind).toBe("price");
    expect(price.hasBest).toBe(false);
    expect(price.hasBars).toBe(false);
    expect(price.cells[0]?.display).toBe("₹3,51,00,000");
    expect(price.cells[0]?.note).toBe(
      "Ex-showroom · Pune, Maharashtra, India · verified 12 Aug 2026",
    );
    expect(price.cells[1]?.display).toBe("$161,100");
    expect(price.cells[1]?.note).toBe("Base price · market not recorded · unverified");
    expect(price.cells[2]?.state).toBe("missing");
  });

  it("labels price types", () => {
    expect(priceTypeLabel("base_price")).toBe("Base price");
    expect(priceTypeLabel("manufacturer_list")).toBe("Manufacturer list price");
    expect(priceTypeLabel(null)).toBeNull();
  });
});

describe("features", () => {
  const acc = {
    id: "acc",
    name: "Adaptive Cruise Control",
    category: "Driver Assistance",
  };
  const lsd = { id: "lsd", name: "Limited-Slip Differential", category: "Drivetrain" };
  const groups = buildCompareRows([
    car({
      id: "a",
      features: [{ feature: acc }, { feature: lsd, detail: "Electronic" }],
    }),
    car({ id: "b", features: [{ feature: lsd }] }),
  ]);

  it("splits safety systems from other features and takes the union", () => {
    const safety = groups.find((group) => group.id === "safety");
    const features = groups.find((group) => group.id === "features");
    expect(safety?.rows.map((row) => row.label)).toEqual(["Adaptive Cruise Control"]);
    expect(features?.rows.map((row) => row.label)).toEqual(["Limited-Slip Differential"]);
  });

  it("marks absence as missing (not catalogued), never as a claim", () => {
    const row = findRow(groups, "feature.acc");
    expect(row.cells.map((cell) => cell.state)).toEqual(["value", "missing"]);
    expect(row.differs).toBe(true);
    expect(row.hasBest).toBe(false);
  });

  it("carries the variant-specific detail as the note", () => {
    const row = findRow(groups, "feature.lsd");
    expect(row.cells.map((cell) => cell.note)).toEqual(["Electronic", null]);
  });
});

describe("differences", () => {
  it("counts rows that differ", () => {
    const groups = buildCompareRows([
      car({ id: "a", performance: { power_hp: 500, torque_nm: 600 } }),
      car({ id: "b", performance: { power_hp: 500, torque_nm: 650 } }),
    ]);
    expect(findRow(groups, "performance.power").differs).toBe(false);
    expect(findRow(groups, "performance.torque").differs).toBe(true);
    const counts = countRows(groups);
    expect(counts.differing).toBeLessThan(counts.total);
    // Same category, country and body: identity rows do not differ.
    expect(findRow(groups, "identity.category").differs).toBe(false);
  });

  it("treats published versus unpublished as a difference", () => {
    const groups = buildCompareRows([
      car({ id: "a", performance: { torque_nm: 600 } }),
      car({ id: "b", performance: { torque_nm: null } }),
    ]);
    expect(findRow(groups, "performance.torque").differs).toBe(true);
  });
});

describe("computed and labelled figures", () => {
  it("computes power-to-weight only when both inputs exist", () => {
    const groups = buildCompareRows([
      car({
        id: "a",
        performance: { power_hp: 500 },
        dimensions: { kerb_weight_kg: 1450 },
      }),
      car({
        id: "b",
        performance: { power_hp: 600 },
        dimensions: { kerb_weight_kg: null },
      }),
    ]);
    const row = findRow(groups, "performance.ptw");
    expect(row.cells[0]?.display).toBe("344.8 hp/t");
    expect(row.cells[1]?.state).toBe("missing");
  });

  it("reads a power convention only when the source states it", () => {
    expect(powerConvention("Ford published specifications (SAE net hp)")).toBe(
      "SAE net hp",
    );
    expect(powerConvention("Porsche data, 510 PS (DIN)")).toBe("metric PS");
    expect(powerConvention("Porsche published specifications")).toBeNull();
    expect(powerConvention(null)).toBeNull();
  });

  it("shortens names without repeating the model", () => {
    expect(shortCarName("911", "GT3")).toBe("911 GT3");
    expect(shortCarName("296 GTB", "296 GTB")).toBe("296 GTB");
    expect(shortCarName("M3", "M3 Competition")).toBe("M3 Competition");
  });

  it("summarises a car for the header", () => {
    const input = car({ id: "a", fuel: "phev", model: "296 GTB", variant: "296 GTB" });
    const summary = summariseCar(input.detail, "maker/296-gtb/296-gtb");
    expect(summary).toMatchObject({
      href: "/cars/maker/296-gtb/296-gtb",
      shortName: "296 GTB",
      fullName: "Maker 296 GTB",
      fuelLabel: "Plug-in hybrid",
      powertrain: "hybrid",
      photo: null,
      years: "2024 – present",
    });
  });
});
