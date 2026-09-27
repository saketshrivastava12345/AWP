import { describe, expect, it } from "vitest";
import type { VariantDetail } from "@/types/domain";
import { buildShowcaseCards, featureCards, highlightCards } from "./feature-cards";

/**
 * A minimal variant. Only the rows the card builder reads are filled in;
 * the rest of VariantDetail is irrelevant to it (and typed away here).
 */
function variant(overrides: Partial<VariantDetail> = {}): VariantDetail {
  const base = {
    variant: { fuel_type: "petrol", drive_type: "rwd" },
    model: {},
    manufacturer: {},
    country: {},
    category: {},
    engine: null,
    transmission: null,
    performance: null,
    dimensions: null,
    fuel: null,
    ev: null,
    features: [],
    parts: [],
    media: [],
    modelMedia: [],
    generation: null,
    colors: [],
    markets: [],
  };
  return { ...base, ...overrides } as unknown as VariantDetail;
}

describe("highlightCards", () => {
  it("produces no card for a subsystem with no published figure", () => {
    expect(
      highlightCards(
        variant({
          variant: { fuel_type: "petrol", drive_type: null } as VariantDetail["variant"],
        }),
      ),
    ).toEqual([]);
  });

  it("carries only the published figures, formatted as the site does", () => {
    const cards = highlightCards(
      variant({
        engine: {
          name: "4.0 flat-six",
          configuration: "Flat-6",
          displacement_cc: 3996,
          cylinders: 6,
          aspiration: "naturally_aspirated",
          redline_rpm: null,
          notes: null,
        } as unknown as VariantDetail["engine"],
        performance: {
          power_hp: 510,
          torque_nm: null,
          zero_to_100_s: 3.4,
          top_speed_kmh: 320,
          source: "Porsche press kit",
        } as unknown as VariantDetail["performance"],
      }),
    );
    const engine = cards.find((card) => card.id === "highlight-engine");
    expect(engine?.title).toBe("Flat-6");
    expect(engine?.figures.map((figure) => figure.label)).toEqual([
      "Displacement",
      "Cylinders",
      "Aspiration",
      "Power",
    ]);
    expect(engine?.figures[0]?.value).toBe("3,996 cc");

    const performance = cards.find((card) => card.id === "highlight-performance");
    expect(performance?.figures).toEqual([
      { label: "0–100 km/h", value: "3.4 s" },
      { label: "Top speed", value: "320 km/h" },
    ]);
    expect(performance?.summary).toBe("Source: Porsche press kit");
  });

  it("never gives an electric car an engine card, and never a petrol car an electric one", () => {
    const ev = highlightCards(
      variant({
        variant: { fuel_type: "electric", drive_type: "awd" } as VariantDetail["variant"],
        engine: { configuration: "V8", displacement_cc: 4000 } as VariantDetail["engine"],
        ev: { battery_kwh: 100, range_km: 600 } as VariantDetail["ev"],
      }),
    );
    expect(ev.map((card) => card.id)).toEqual([
      "highlight-electric",
      "highlight-drivetrain",
    ]);

    const petrol = highlightCards(
      variant({ ev: { battery_kwh: 100 } as VariantDetail["ev"] }),
    );
    expect(petrol.map((card) => card.id)).toEqual(["highlight-drivetrain"]);
  });
});

describe("featureCards", () => {
  it("keeps the note catalogued for this car apart from the general description", () => {
    const cards = featureCards([
      {
        feature: {
          id: "f1",
          name: "Rear-axle steering",
          slug: "rear-axle-steering",
          category: "Chassis",
          description: "Turns the rear wheels a few degrees.",
        },
        detail: "Standard on the GT3.",
      },
      {
        feature: {
          id: "f2",
          name: "LED matrix",
          slug: "led",
          category: null,
          description: null,
        },
        detail: null,
      },
    ]);
    expect(cards[0]).toMatchObject({
      id: "feature-f1",
      eyebrow: "Chassis",
      summary: "Standard on the GT3.",
      detail: "Turns the rear wheels a few degrees.",
      figures: [],
    });
    expect(cards[1]).toMatchObject({ eyebrow: "Feature", summary: null, detail: null });
  });
});

describe("buildShowcaseCards", () => {
  it("puts the car's own numbers first, then its features", () => {
    const cards = buildShowcaseCards(
      variant({
        performance: { top_speed_kmh: 250 } as VariantDetail["performance"],
        features: [
          {
            feature: {
              id: "f1",
              name: "Sunroof",
              slug: "sunroof",
              category: null,
              description: null,
            },
            detail: null,
          },
        ],
      }),
    );
    expect(cards.map((card) => card.kind)).toEqual(["highlight", "highlight", "feature"]);
  });
});
