import { describe, expect, it } from "vitest";
import type { Part } from "@/types/domain";
import type { TourStop } from "@/lib/anatomy-tour";
import { makeDetail, makeMedia } from "./test-fixtures";
import {
  groupNotesFor,
  hasCarbonCeramicBrakes,
  hudFor,
  partDetailsFor,
  partsByGroupFor,
  primaryPhoto,
  tourParts,
  viewerDimensionsFor,
  viewerModelFor,
} from "./viewer";

const stamp = "2024-01-01T00:00:00Z";

function part(slug: string, group: Part["viewer_group"], name = slug): Part {
  return {
    id: `part-${slug}`,
    category_id: "category",
    name,
    slug,
    description: null,
    function: null,
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

function stop(components: string[]): TourStop {
  return {
    id: "design",
    group: "body",
    label: "Design",
    title: "Design",
    body: "",
    stats: [],
    features: [],
    components: components.map((slug) => ({ name: slug, slug, summary: null, note: null })),
    callouts: [],
  };
}

describe("viewerModelFor", () => {
  it("returns null when no GLB is registered", () => {
    expect(viewerModelFor(makeDetail())).toBeNull();
  });

  it("maps the variant's own GLB with its recorded provenance", () => {
    const detail = makeDetail({
      media: [
        makeMedia({ id: "photo", url: "/images/a.jpg", is_primary: true }),
        makeMedia({
          id: "glb",
          url: " https://cdn.example.org/gt3.glb ",
          type: "glb",
          is_exact_model: true,
          model_format: "GLB",
          compression: ["draco", ""],
          credit: "Studio",
          license: "CC-BY-4.0",
          author: "A. Modeller",
          source_url: "javascript:alert(1)",
          poster_url: "/images/poster.jpg",
        }),
      ],
    });
    expect(viewerModelFor(detail)).toEqual({
      url: "https://cdn.example.org/gt3.glb",
      isExact: true,
      format: "glb",
      compression: ["draco"],
      credit: "Studio",
      license: "CC-BY-4.0",
      author: "A. Modeller",
      sourceUrl: null,
      posterUrl: "/images/poster.jpg",
    });
  });

  it("never claims a model-level file as this exact car", () => {
    const detail = makeDetail({
      modelMedia: [
        makeMedia({
          id: "glb",
          url: "/models/911.gltf",
          type: "glb",
          variant_id: null,
          model_id: "model-911",
          is_exact_model: true,
          source_url: "https://example.org/911",
        }),
      ],
    });
    const model = viewerModelFor(detail);
    expect(model?.isExact).toBe(false);
    expect(model?.format).toBe("gltf");
    expect(model?.sourceUrl).toBe("https://example.org/911");
  });

  it("does not treat an unanswered exactness question as exact", () => {
    const detail = makeDetail({
      media: [makeMedia({ id: "glb", url: "/m.glb", type: "glb", is_exact_model: null })],
    });
    expect(viewerModelFor(detail)?.isExact).toBe(false);
  });
});

describe("primaryPhoto", () => {
  it("prefers the variant's photographs, then the model's, and ignores GLBs", () => {
    const glb = makeMedia({ id: "glb", url: "/m.glb", type: "glb" });
    const own = makeMedia({ id: "own", url: "/own.jpg" });
    const model = makeMedia({ id: "model", url: "/model.jpg", variant_id: null });
    expect(primaryPhoto(makeDetail({ media: [glb, own], modelMedia: [model] }))?.id).toBe(
      "own",
    );
    expect(primaryPhoto(makeDetail({ media: [glb], modelMedia: [model] }))?.id).toBe(
      "model",
    );
    expect(primaryPhoto(makeDetail({ media: [glb] }))).toBeNull();
  });
});

describe("parts by group", () => {
  const wishbone = part("double-wishbone", "suspension");
  const spoiler = part("rear-spoiler", "body");
  const turbo = part("turbocharger", "engine");
  const loose = part("floor-mat", null);

  it("lists the variant's own parts first, then the tour's, without repeats", () => {
    const detail = makeDetail({
      parts: [
        { part: wishbone, detail: "Adapted from the RSR." },
        { part: spoiler, detail: null },
        { part: loose, detail: null },
      ],
    });
    const groups = partsByGroupFor(
      detail,
      [stop(["rear-spoiler", "turbocharger", "unknown-slug"])],
      [wishbone, spoiler, turbo],
    );
    expect(groups.suspension?.map((p) => p.slug)).toEqual(["double-wishbone"]);
    expect(groups.body?.map((p) => p.slug)).toEqual(["rear-spoiler"]);
    expect(groups.engine?.map((p) => p.slug)).toEqual(["turbocharger"]);
    expect(Object.keys(groups).sort()).toEqual(["body", "engine", "suspension"]);
  });

  it("keeps only notes that say something", () => {
    const detail = makeDetail({
      parts: [
        { part: wishbone, detail: "  Adapted from the RSR. " },
        { part: spoiler, detail: "   " },
      ],
    });
    expect(partDetailsFor(detail)).toEqual({ "double-wishbone": "Adapted from the RSR." });
  });

  it("collects the tour's components in order, once each", () => {
    expect(
      tourParts(
        [stop(["turbocharger", "rear-spoiler"]), stop(["turbocharger"])],
        [spoiler, turbo],
      ).map((p) => p.slug),
    ).toEqual(["turbocharger", "rear-spoiler"]);
  });
});

describe("groupNotesFor", () => {
  it("writes one line per group from published figures only", () => {
    const notes = groupNotesFor(
      makeDetail({
        dimensions: { kerb_weight_kg: null, height_mm: null },
        performance: { braking_100_0_m: 31.5 },
      }),
    );
    expect(notes.engine).toBe(
      "4.0 flat-six · Flat-6 · 3,996 cc · Naturally Aspirated · 9,000 rpm redline",
    );
    expect(notes.transmission).toBe("7-speed PDK · 7 gears · RWD");
    expect(notes.body).toBe("4,573 mm long · 1,852 mm wide");
    expect(notes.brakes).toBe("100–0 km/h in 31.5 m");
    expect(notes.battery).toBeUndefined();
  });

  it("gives a group with nothing published no note", () => {
    const notes = groupNotesFor(
      makeDetail({
        variant: { fuel_type: "electric", drive_type: null },
        engine: null,
        transmission: { name: " ", gears: null },
        dimensions: null,
        ev: { battery_kwh: 100, motor_count: 3, range_km: 600, range_standard: "epa" },
      }),
    );
    expect(notes.engine).toBeUndefined();
    expect(notes.transmission).toBeUndefined();
    expect(notes.body).toBeUndefined();
    expect(notes.battery).toBe("100 kWh battery · 3 motors · 600 km (EPA)");
  });
});

describe("hudFor", () => {
  it("lists only published headline figures", () => {
    expect(hudFor(makeDetail({ performance: { torque_nm: null } }))).toEqual([
      { label: "Power", value: "510 hp" },
      { label: "0–100", value: "3.4 s" },
      { label: "Top speed", value: "320 km/h" },
    ]);
    expect(hudFor(makeDetail({ performance: null }))).toEqual([]);
  });
});

describe("viewerDimensionsFor", () => {
  it("passes the published measurements and nothing else", () => {
    expect(viewerDimensionsFor(makeDetail())).toEqual({
      length_mm: 4573,
      width_mm: 1852,
      height_mm: 1279,
      wheelbase_mm: 2457,
      ground_clearance_mm: null,
    });
    expect(viewerDimensionsFor(makeDetail({ dimensions: null }))).toBeNull();
  });
});

describe("hasCarbonCeramicBrakes", () => {
  const disc = part("carbon-ceramic-disc", "brakes", "Carbon-Ceramic Disc");
  const feature = (detail: string | null) => ({
    feature: {
      id: "f",
      name: "Carbon-Ceramic Brakes",
      slug: "carbon-ceramic-brakes",
      category: "Braking",
      description: null,
    },
    detail,
  });

  it("is false unless the variant catalogues them", () => {
    expect(hasCarbonCeramicBrakes(makeDetail())).toBe(false);
  });

  it("is true for the catalogued part or feature", () => {
    expect(hasCarbonCeramicBrakes(makeDetail({ parts: [{ part: disc, detail: null }] }))).toBe(
      true,
    );
    expect(
      hasCarbonCeramicBrakes(makeDetail({ features: [feature("Fitted as standard.")] })),
    ).toBe(true);
  });

  it("is false when the note says they are an option", () => {
    expect(
      hasCarbonCeramicBrakes(makeDetail({ features: [feature("Optional extra.")] })),
    ).toBe(false);
    expect(
      hasCarbonCeramicBrakes(
        makeDetail({ parts: [{ part: disc, detail: "Available as an option." }] }),
      ),
    ).toBe(false);
  });
});
