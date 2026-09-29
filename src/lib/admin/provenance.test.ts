import { describe, expect, it } from "vitest";
import {
  buildProvenanceRows,
  provenanceStatus,
  sectionHref,
  summarizeProvenance,
} from "./provenance";
import { FieldReader } from "./validation";
import { SECTION_SCHEMAS, readSection } from "./sections";
import { readPriceFields } from "./price-input";

describe("provenanceStatus", () => {
  it("distinguishes verified, sourced and unsourced", () => {
    expect(provenanceStatus("Porsche AG", "2026-09-01")).toBe("verified");
    expect(provenanceStatus("Porsche AG", null)).toBe("sourced");
    expect(provenanceStatus(null, "2026-09-01")).toBe("unsourced");
    expect(provenanceStatus("  ", null)).toBe("unsourced");
  });
});

describe("buildProvenanceRows", () => {
  it("lists every populated figure with its section's provenance", () => {
    const rows = buildProvenanceRows({
      variant: {
        year_start: 2024,
        year_end: null,
        fuel_type: "petrol",
        drive_type: "awd",
        status: null,
        base_price: null,
        price_currency: null,
        source: "Porsche AG",
        source_url: "https://porsche.com",
        last_verified_at: "2026-09-01",
      },
      performance: {
        power_hp: 650,
        torque_nm: 800,
        zero_to_100_s: 2.7,
        top_speed_kmh: null,
        notes: "PS",
        source: "Porsche press kit",
        source_url: null,
        last_verified_at: null,
      },
      dimensions: { length_mm: 4535, source: null, last_verified_at: null },
      fuel: null,
    });

    expect(rows.map((row) => `${row.section}.${row.field}`)).toEqual([
      "variant.years",
      "variant.fuel_type",
      "variant.drive_type",
      "performance.power_hp",
      "performance.torque_nm",
      "performance.zero_to_100_s",
      "dimensions.length_mm",
    ]);
    expect(rows[0]).toMatchObject({ value: "2024 – present", status: "verified" });
    expect(rows[3]).toMatchObject({
      value: "650 hp",
      status: "sourced",
      source: "Porsche press kit",
    });
    expect(rows[5]?.value).toBe("2.7 s");
    expect(rows[6]).toMatchObject({ value: "4,535 mm", status: "unsourced" });

    expect(summarizeProvenance(rows)).toEqual({
      verified: 3,
      sourced: 3,
      unsourced: 1,
      total: 7,
      verifiedShare: 3 / 7,
    });
  });

  it("summarises an empty vehicle without dividing by zero", () => {
    expect(summarizeProvenance([]).verifiedShare).toBeNull();
  });

  it("links sections to their editors", () => {
    expect(sectionHref("abc", "variant")).toBe("/admin/vehicles/abc");
    expect(sectionHref("abc", "ev")).toBe("/admin/vehicles/abc/ev");
  });
});

describe("readSection", () => {
  const today = "2026-09-27";

  it("stores empty figures as NULL and requires a source for figures", () => {
    const reader = FieldReader.fromRecord({ power_hp: "650", torque_nm: "" });
    const { values, hasFigures } = readSection(
      reader,
      SECTION_SCHEMAS.performance,
      today,
    );
    expect(hasFigures).toBe(true);
    expect(values.power_hp).toBe(650);
    expect(values.torque_nm).toBeNull();
    expect(reader.errors.source).toMatch(/required/);
  });

  it("applies the cross-field constraints", () => {
    const perf = FieldReader.fromRecord({
      zero_to_100_s: "3.0",
      zero_to_200_s: "2.9",
      source: "x",
    });
    readSection(perf, SECTION_SCHEMAS.performance, today);
    expect(perf.errors.zero_to_200_s).toMatch(/longer/);

    const dims = FieldReader.fromRecord({
      length_mm: "4500",
      wheelbase_mm: "4600",
      source: "x",
    });
    readSection(dims, SECTION_SCHEMAS.dimensions, today);
    expect(dims.errors.wheelbase_mm).toMatch(/shorter/);

    const ev = FieldReader.fromRecord({
      battery_kwh: "80",
      usable_battery_kwh: "90",
      range_km: "500",
      source: "x",
    });
    readSection(ev, SECTION_SCHEMAS.ev, today);
    expect(ev.errors.usable_battery_kwh).toMatch(/cannot exceed/);
    expect(ev.errors.range_standard).toMatch(/standard/);

    const gearbox = FieldReader.fromRecord({
      name: "Reduction",
      type: "single_speed",
      gears: "2",
      source: "x",
    });
    readSection(gearbox, SECTION_SCHEMAS.transmission, today);
    expect(gearbox.errors.gears).toMatch(/exactly one gear/);
  });

  it("always requires a source on shared engine records", () => {
    const reader = FieldReader.fromRecord({
      name: "Test V8",
      layout: "vee",
      aspiration: "twin_turbo",
    });
    readSection(reader, SECTION_SCHEMAS.engine, today);
    expect(reader.errors.source).toMatch(/required/);
  });
});

describe("readPriceFields", () => {
  const today = "2026-09-27";
  const base = {
    price_type: "ex_showroom",
    currency: "INR",
    ex_showroom_price: "30800000",
    effective_from: "2026-09-01",
    source: "Dealer",
    source_url: "https://example.com",
    last_verified_at: "2026-09-20",
  };

  it("accepts a sourced ex-showroom price", () => {
    const reader = FieldReader.fromRecord(base);
    expect(readPriceFields(reader, { today })).toMatchObject({
      price_type: "ex_showroom",
      ex_showroom_price: 30_800_000,
      on_road_price: null,
      is_verified: false,
    });
  });

  it("keeps on-road totals out of listed rows and requires them on on-road rows", () => {
    const listed = FieldReader.fromRecord({ ...base, on_road_price: "35000000" });
    expect(readPriceFields(listed, { today })).toBeNull();
    expect(listed.errors.on_road_price).toMatch(/belongs in/);

    const onRoad = FieldReader.fromRecord({ ...base, price_type: "on_road" });
    expect(readPriceFields(onRoad, { today })).toBeNull();
    expect(onRoad.errors.on_road_price).toMatch(/needs the published on-road total/);
  });

  it("rejects an on-road total below the ex-showroom price", () => {
    const reader = FieldReader.fromRecord({
      ...base,
      price_type: "on_road",
      on_road_price: "100",
    });
    expect(readPriceFields(reader, { today })).toBeNull();
    expect(reader.errors.on_road_price).toMatch(/cannot be below/);
  });

  it("requires provenance", () => {
    const reader = FieldReader.fromRecord({
      ...base,
      source: "",
      source_url: "",
      last_verified_at: "",
    });
    expect(readPriceFields(reader, { today })).toBeNull();
    expect(Object.keys(reader.errors).sort()).toEqual([
      "last_verified_at",
      "source",
      "source_url",
    ]);
  });
});
