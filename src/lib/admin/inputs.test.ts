import { describe, expect, it } from "vitest";
import { powertrainSections } from "./labels";
import { composeCredit, defaultAlt, readMediaMeta, readModelMeta } from "./media-input";
import { powertrainConflicts, readModel, readVariantCore } from "./vehicle-input";
import { FieldReader } from "./validation";

const today = "2026-09-27";

describe("readVariantCore", () => {
  const base = {
    name: "Turbo S",
    slug: "turbo-s",
    year_start: "2024",
    fuel_type: "petrol",
    drive_type: "awd",
    source: "Porsche AG",
  };

  it("reads a minimal, sourced variant with nothing defaulted", () => {
    const reader = FieldReader.fromRecord(base);
    expect(readVariantCore(reader, today)).toEqual({
      name: "Turbo S",
      slug: "turbo-s",
      year_start: 2024,
      year_end: null,
      fuel_type: "petrol",
      drive_type: "awd",
      status: null,
      description: null,
      notes: null,
      source: "Porsche AG",
      source_url: null,
      last_verified_at: null,
      is_published: false,
    });
  });

  it("requires a source and valid enums", () => {
    const reader = FieldReader.fromRecord({
      ...base,
      source: "",
      fuel_type: "steam",
      drive_type: "",
    });
    expect(readVariantCore(reader, today)).toBeNull();
    expect(Object.keys(reader.errors).sort()).toEqual([
      "drive_type",
      "fuel_type",
      "source",
    ]);
  });

  it("refuses an end year before the start year", () => {
    const reader = FieldReader.fromRecord({ ...base, year_end: "2020" });
    expect(readVariantCore(reader, today)).toBeNull();
    expect(reader.errors.year_end).toMatch(/cannot be before/);
  });
});

describe("readModel", () => {
  it("reads prefixed fields for the nested new-model form", () => {
    const reader = FieldReader.fromRecord({
      model_name: "911",
      model_slug: "911",
      model_category_id: "0f8fad5b-d9cb-469f-a165-70867728950e",
      model_body_type: "coupe",
      model_engine_position: "rear",
      model_production_start: "2019",
    });
    expect(readModel(reader, "model_")).toMatchObject({
      name: "911",
      slug: "911",
      body_type: "coupe",
      engine_position: "rear",
      production_start: 2019,
      production_end: null,
    });
  });

  it("flags the prefixed field names", () => {
    const reader = FieldReader.fromRecord({ model_name: "", model_slug: "Bad Slug" });
    expect(readModel(reader, "model_")).toBeNull();
    expect(Object.keys(reader.errors)).toEqual(
      expect.arrayContaining([
        "model_name",
        "model_slug",
        "model_category_id",
        "model_body_type",
      ]),
    );
  });
});

describe("powertrain rules (mirroring the database)", () => {
  it("lists the sections each fuel type can carry", () => {
    expect(powertrainSections("electric")).toEqual({
      engine: false,
      fuel: false,
      ev: true,
    });
    expect(powertrainSections("phev")).toEqual({ engine: true, fuel: true, ev: true });
    expect(powertrainSections("petrol")).toEqual({ engine: true, fuel: true, ev: false });
    expect(powertrainSections("hydrogen")).toEqual({
      engine: true,
      fuel: true,
      ev: false,
    });
  });

  it("explains conflicts before the database refuses them", () => {
    expect(
      powertrainConflicts({
        fuel: "electric",
        hasEngine: true,
        hasFuelSpecs: true,
        hasEvSpecs: false,
      }),
    ).toHaveLength(2);
    expect(
      powertrainConflicts({
        fuel: "petrol",
        hasEngine: true,
        hasFuelSpecs: false,
        hasEvSpecs: true,
      })[0]?.message,
    ).toMatch(/EV & charging/);
    expect(
      powertrainConflicts({
        fuel: "hybrid",
        hasEngine: true,
        hasFuelSpecs: true,
        hasEvSpecs: true,
      }),
    ).toEqual([]);
  });
});

describe("media provenance", () => {
  const base = {
    alt: "Porsche 911 Turbo S — three-quarter view",
    source: "Wikimedia Commons",
    source_url: "https://commons.wikimedia.org/wiki/File:x.jpg",
    license: "CC BY-SA 4.0",
    author: "Jane Doe",
  };

  it("requires source, URL, licence and author, and composes the credit", () => {
    const reader = FieldReader.fromRecord({ ...base, shot: "three_quarter" });
    expect(readMediaMeta(reader, "image")).toMatchObject({
      shot: "three_quarter",
      display_order: 0,
      credit: "Photo: Jane Doe / Wikimedia Commons (CC BY-SA 4.0)",
    });
    const missing = FieldReader.fromRecord({ alt: "x y z" });
    expect(readMediaMeta(missing, "image")).toBeNull();
    expect(Object.keys(missing.errors).sort()).toEqual([
      "author",
      "license",
      "source",
      "source_url",
    ]);
  });

  it("accepts a free-text licence only through Other", () => {
    const other = FieldReader.fromRecord({
      ...base,
      license: "other",
      license_other: "CC BY-NC 2.0",
    });
    expect(readMediaMeta(other, "image")?.license).toBe("CC BY-NC 2.0");
    const unknown = FieldReader.fromRecord({ ...base, license: "Whatever" });
    expect(readMediaMeta(unknown, "image")).toBeNull();
    expect(unknown.errors.license).toMatch(/Choose a licence/);
  });

  it("requires the exact-or-representation answer for 3D models", () => {
    expect(readModelMeta(FieldReader.fromRecord({}))).toBeNull();
    expect(readModelMeta(FieldReader.fromRecord({ is_exact_model: "false" }))).toEqual({
      is_exact_model: false,
      model_version: null,
    });
    expect(composeCredit("glb", { author: "A", source: "S", license: "CC0 1.0" })).toBe(
      "3D model: A / S (CC0 1.0)",
    );
    expect(defaultAlt("Porsche 911 Turbo S", "Three-quarter")).toBe(
      "Porsche 911 Turbo S — three-quarter view",
    );
  });
});
