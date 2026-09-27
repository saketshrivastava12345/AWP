import { describe, expect, it } from "vitest";
import type { CarColor } from "@/types/domain";
import {
  FINISH_PARAMS,
  STUDIO_COLORS,
  catalogueSwatches,
  configStorageKey,
  defaultConfig,
  finishFromCatalogue,
  normaliseHex,
  resolvePaint,
  sanitizeConfig,
} from "./viewer-paint";

const color = (overrides: Partial<CarColor>): CarColor => ({
  id: "c1",
  model_id: "m1",
  name: "Guards Red",
  hex: "#c1121f",
  finish: "solid",
  source: "Manufacturer configurator",
  source_url: "https://example.com/colours",
  display_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("paint", () => {
  it("normalises hex values and rejects anything else", () => {
    expect(normaliseHex("#ABC")).toBe("#aabbcc");
    expect(normaliseHex("c1121F")).toBe("#c1121f");
    expect(normaliseHex("red")).toBeNull();
    expect(normaliseHex(null)).toBeNull();
  });

  it("maps every catalogue finish onto a rendered finish", () => {
    expect(finishFromCatalogue("solid")).toBe("gloss");
    expect(finishFromCatalogue("pearl")).toBe("pearl");
    expect(FINISH_PARAMS.matte.clearcoat).toBe(0);
    expect(FINISH_PARAMS.metallic.metalness).toBeGreaterThan(
      FINISH_PARAMS.gloss.metalness,
    );
  });

  it("lists only drawable catalogue colours, in display order", () => {
    const swatches = catalogueSwatches([
      color({ id: "b", display_order: 2 }),
      color({ id: "bad", hex: "not a colour" }),
      color({ id: "a", display_order: 1 }),
    ]);
    expect(swatches.map((entry) => entry.id)).toEqual(["a", "b"]);
  });

  it("resolves a catalogue colour with its own name, finish and source", () => {
    const colors = [color({ id: "c1", finish: "metallic" })];
    const paint = resolvePaint({ source: "catalogue", id: "c1" }, colors);
    expect(paint).toMatchObject({
      name: "Guards Red",
      finish: "metallic",
      source: "catalogue",
    });
    expect(paint.color?.source).toBe("Manufacturer configurator");
  });

  it("falls back to a studio finish when a catalogue colour disappears", () => {
    const paint = resolvePaint({ source: "catalogue", id: "gone" }, []);
    expect(paint.source).toBe("studio");
    expect(paint.color).toBeNull();
  });

  it("never presents studio colours under a catalogue name", () => {
    const paint = resolvePaint({ source: "studio", id: "racing-red", finish: "matte" }, [
      color({}),
    ]);
    expect(paint).toMatchObject({
      name: "Racing Red",
      finish: "matte",
      source: "studio",
    });
    expect(STUDIO_COLORS.map((entry) => entry.name)).toEqual([
      "Obsidian Black",
      "Arctic White",
      "Racing Red",
      "Graphite Grey",
      "Midnight Blue",
      "Silver",
      "Aurum Gold",
    ]);
  });
});

describe("configuration", () => {
  const defaults = defaultConfig({
    colors: [],
    wheelStyle: "twin",
    wheelFinish: "dark",
    carbonCeramic: true,
  });

  it("starts from the catalogue's first colour when there is one", () => {
    const config = defaultConfig({
      colors: [
        color({ id: "x", display_order: 5 }),
        color({ id: "y", display_order: 0 }),
      ],
      wheelStyle: "five",
      wheelFinish: "bright",
      carbonCeramic: false,
    });
    expect(config.paint).toEqual({ source: "catalogue", id: "y" });
    expect(config.disc).toBe("steel");
  });

  it("defaults to carbon-ceramic discs when the variant catalogues them", () => {
    expect(defaults.disc).toBe("carbon-ceramic");
    expect(defaults.paint).toMatchObject({ source: "studio", id: "silver" });
  });

  it("keeps valid stored fields and repairs the rest", () => {
    const restored = sanitizeConfig(
      {
        paint: { source: "studio", id: "midnight-blue", finish: "satin" },
        wheelStyle: "mesh",
        wheelFinish: "chrome",
        caliper: "red",
        disc: 42,
      },
      defaults,
      [],
    );
    expect(restored).toEqual({
      paint: { source: "studio", id: "midnight-blue", finish: "satin" },
      wheelStyle: "mesh",
      wheelFinish: "dark",
      caliper: "red",
      disc: "carbon-ceramic",
    });
  });

  it("drops a stored catalogue colour the car no longer has", () => {
    const restored = sanitizeConfig(
      { paint: { source: "catalogue", id: "old" } },
      defaults,
      [color({ id: "new" })],
    );
    expect(restored.paint).toEqual(defaults.paint);
    expect(sanitizeConfig("garbage", defaults, [])).toBe(defaults);
  });

  it("keys storage by car", () => {
    expect(configStorageKey("Porsche 911 GT3")).toBe(
      "aurix-viewer-config:porsche-911-gt3",
    );
  });
});
