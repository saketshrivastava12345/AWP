import { describe, expect, it } from "vitest";
import {
  brandTabs,
  buildLineup,
  groupByCountry,
  heroVisual,
  monogramOf,
  powerRange,
  rangeLabel,
  segmentOptions,
  websiteLink,
  type LineupCar,
  type LineupModelInput,
} from "./brand";

describe("monogramOf", () => {
  it.each([
    ["Porsche", "P"],
    ["BMW", "BMW"],
    ["BYD", "BYD"],
    ["Mercedes-Benz", "MB"],
    ["Mahindra & Mahindra", "M&M"],
    ["Tata Motors", "T"],
    ["Volvo Cars", "V"],
    ["Rolls-Royce Motor Cars", "RR"],
    ["Aston Martin", "AM"],
    ["McLaren", "M"],
    ["Škoda", "Š"],
    ["  ", "?"],
  ])("%s -> %s", (name, expected) => {
    expect(monogramOf(name)).toBe(expected);
  });

  it("never exceeds three letters", () => {
    expect(monogramOf("Bayerische Motoren Werke Aktiengesellschaft")).toBe("BMW");
  });
});

describe("segmentOptions", () => {
  it("offers only segments that exist, in presentation order, with counts", () => {
    const options = segmentOptions([
      { segment: "mass" },
      { segment: "performance" },
      { segment: "mass" },
    ] as const);
    expect(options).toEqual([
      { value: "all", label: "All", count: 3 },
      { value: "performance", label: "Performance", count: 1 },
      { value: "mass", label: "Mass market", count: 2 },
    ]);
  });
});

describe("groupByCountry", () => {
  const country = (name: string, slug: string) => ({ name, slug, flag_emoji: null });

  it("sorts countries and makers alphabetically and puts unknown countries last", () => {
    const groups = groupByCountry([
      { name: "Porsche", country: country("Germany", "germany") },
      { name: "Ferrari", country: country("Italy", "italy") },
      { name: "Audi", country: country("Germany", "germany") },
      { name: "Mystery", country: null },
    ]);
    expect(groups.map((group) => group.name)).toEqual([
      "Germany",
      "Italy",
      "Country not recorded",
    ]);
    expect(groups[0]?.makers.map((maker) => maker.name)).toEqual(["Audi", "Porsche"]);
  });
});

describe("brandTabs", () => {
  const car = (
    category_slug: string,
    fuel_type: "petrol" | "electric",
    body_type: "coupe" | "suv" | "off_road" | "sedan",
  ) => ({ category_slug, fuel_type, body_type });

  it("keeps only non-empty tabs, in a fixed order", () => {
    const tabs = brandTabs([
      car("sports-car", "petrol", "coupe"),
      car("ev", "electric", "sedan"),
      car("sports-car", "petrol", "coupe"),
    ]);
    expect(tabs.map((tab) => [tab.id, tab.cars.length])).toEqual([
      ["all", 3],
      ["performance", 2],
      ["ev", 1],
      ["sports", 2],
    ]);
  });

  it("counts off-road bodies as SUVs and supercars as performance", () => {
    const tabs = brandTabs([
      car("off-road", "petrol", "off_road"),
      car("supercar", "petrol", "coupe"),
    ]);
    expect(tabs.map((tab) => tab.id)).toEqual(["all", "performance", "suv"]);
  });

  it("returns nothing for a maker with no cars", () => {
    expect(brandTabs([])).toEqual([]);
  });
});

describe("powerRange", () => {
  it("ignores cars that publish no figure", () => {
    expect(
      powerRange([{ power_hp: 450 }, { power_hp: null }, { power_hp: 650 }]),
    ).toEqual({
      min: 450,
      max: 650,
      count: 2,
    });
  });

  it("is null when no car publishes power", () => {
    expect(powerRange([{ power_hp: null }])).toBeNull();
  });
});

describe("buildLineup", () => {
  const model = (overrides: Partial<LineupModelInput> = {}): LineupModelInput => ({
    id: "m-911",
    slug: "911",
    name: "911",
    generation: "992",
    production_start: 2019,
    production_end: null,
    body_type: "coupe",
    category: { name: "Sports Car", slug: "sports-car" },
    generations: [{ id: "g-992", name: "992", year_start: 2019, year_end: null }],
    ...overrides,
  });

  const car = (overrides: Partial<LineupCar>): LineupCar => ({
    variant_id: "v",
    variant_name: "Variant",
    model_id: "m-911",
    model_slug: "911",
    model_name: "911",
    body_type: "coupe",
    category_name: "Sports Car",
    category_slug: "sports-car",
    generation: "992",
    generation_id: "g-992",
    generation_name: "992",
    power_hp: null,
    year_start: 2020,
    ...overrides,
  });

  it("groups cars by model and generation, flagship first", () => {
    const lineup = buildLineup(
      [
        model(),
        model({
          id: "m-taycan",
          slug: "taycan",
          name: "Taycan",
          generation: "J1",
          generations: [{ id: "g-j1", name: "J1", year_start: 2019, year_end: null }],
        }),
      ],
      [
        car({ variant_id: "a", variant_name: "Carrera S", power_hp: 450 }),
        car({ variant_id: "b", variant_name: "Turbo S", power_hp: 650 }),
        car({
          variant_id: "c",
          variant_name: "Turbo S",
          model_id: "m-taycan",
          model_slug: "taycan",
          model_name: "Taycan",
          generation_id: "g-j1",
          generation_name: "J1",
          power_hp: 761,
        }),
      ],
    );

    expect(lineup.map((entry) => entry.name)).toEqual(["Taycan", "911"]);
    const nine = lineup[1];
    expect(nine?.variantCount).toBe(2);
    expect(nine?.generations).toHaveLength(1);
    expect(nine?.generations[0]).toMatchObject({
      name: "992",
      yearStart: 2019,
      yearEnd: null,
    });
    expect(nine?.generations[0]?.cars.map((entry) => entry.variant_name)).toEqual([
      "Turbo S",
      "Carrera S",
    ]);
  });

  it("falls back to the model's production years, and says so", () => {
    const lineup = buildLineup(
      [model({ generations: [], generation: null, production_start: 2020 })],
      [car({ generation_id: null, generation_name: null, generation: null })],
    );
    expect(lineup[0]?.generations[0]).toMatchObject({
      name: null,
      yearStart: 2020,
      yearsFromModel: true,
    });
  });

  it("still builds a line-up from the cars when model rows are unavailable", () => {
    const lineup = buildLineup(
      [],
      [car({ model_id: "m-x", model_name: "X", model_slug: "x" })],
    );
    expect(lineup[0]).toMatchObject({ name: "X", slug: "x", variantCount: 1 });
  });

  it("never lists a model without published cars", () => {
    expect(buildLineup([model()], [])).toEqual([]);
  });

  it("orders several generations newest first", () => {
    const lineup = buildLineup(
      [
        model({
          generations: [
            { id: "g-991", name: "991", year_start: 2011, year_end: 2019 },
            { id: "g-992", name: "992", year_start: 2019, year_end: null },
          ],
        }),
      ],
      [
        car({ variant_id: "old", generation_id: "g-991", generation_name: "991" }),
        car({ variant_id: "new", generation_id: "g-992", generation_name: "992" }),
      ],
    );
    expect(lineup[0]?.generations.map((generation) => generation.name)).toEqual([
      "992",
      "991",
    ]);
    expect(lineup[0]?.generations[1]).toMatchObject({ yearStart: 2011, yearEnd: 2019 });
  });
});

describe("websiteLink", () => {
  it("links http(s) URLs by their host", () => {
    expect(websiteLink("https://www.porsche.com/international/")).toEqual({
      href: "https://www.porsche.com/international/",
      label: "porsche.com",
    });
  });

  it("drops anything that is not a web address", () => {
    expect(websiteLink("javascript:alert(1)")).toBeNull();
    expect(websiteLink("not a url")).toBeNull();
    expect(websiteLink(null)).toBeNull();
    expect(websiteLink("  ")).toBeNull();
  });
});

describe("heroVisual", () => {
  const car = (
    primary_image_url: string | null,
    body_type: "coupe" | "sedan" = "coupe",
  ) => ({
    primary_image_url,
    body_type,
    fuel_type: "petrol" as const,
  });

  it("picks the first car that has a photograph", () => {
    const cars = [car(null), car("/images/b.jpg", "sedan"), car("/images/c.jpg")];
    expect(heroVisual(cars)).toEqual({
      kind: "photo",
      car: cars[1],
      src: "/images/b.jpg",
    });
  });

  it("falls back to the first car's drawing, and to nothing without cars", () => {
    const cars = [car(null, "sedan"), car("  ")];
    expect(heroVisual(cars)).toEqual({ kind: "drawing", car: cars[0] });
    expect(heroVisual([])).toBeNull();
  });
});

describe("rangeLabel", () => {
  it("joins a range with an en dash and collapses equal ends", () => {
    expect(rangeLabel({ min: 450, max: 761 }, String)).toBe("450–761");
    expect(rangeLabel({ min: 510, max: 510 }, String)).toBe("510");
  });
});
