import { describe, expect, it } from "vitest";
import { parseQuery } from "./parseQuery";

describe("parseQuery", () => {
  describe("the examples from the brief", () => {
    it("'german supercars' → country + category", () => {
      const { filters, text } = parseQuery("german supercars");
      expect(filters.country).toEqual(["germany"]);
      expect(filters.category).toEqual(["supercar"]);
      expect(text).toBeUndefined();
    });

    it("'cars under 500 hp' → power ceiling", () => {
      const { filters, text } = parseQuery("cars under 500 hp");
      expect(filters.powerMax).toBe(500);
      expect(filters.powerMin).toBeUndefined();
      // "cars" is a stop word and must not leak into full-text search.
      expect(text).toBeUndefined();
    });

    it("'above 300 km/h' → speed floor", () => {
      const { filters } = parseQuery("above 300 km/h");
      expect(filters.speedMin).toBe(300);
      expect(filters.speedMax).toBeUndefined();
    });

    it("'japanese sports cars' → country + category", () => {
      const { filters } = parseQuery("japanese sports cars");
      expect(filters.country).toEqual(["japan"]);
      expect(filters.category).toEqual(["sports-car"]);
    });

    it("'v8' → vee layout with 8 cylinders", () => {
      const { filters } = parseQuery("v8");
      expect(filters.engineLayout).toEqual(["vee"]);
      expect(filters.cylinders).toEqual([8]);
    });

    it("'4-cylinder turbo' → cylinder count + aspiration", () => {
      const { filters } = parseQuery("4-cylinder turbo");
      expect(filters.cylinders).toEqual([4]);
      // "turbo" must match single and twin turbo, since both are turbocharged.
      expect(filters.aspiration).toEqual(["turbocharged", "twin_turbo"]);
    });

    it("'awd' → drive type", () => {
      expect(parseQuery("awd").filters.drive).toEqual(["awd"]);
    });

    it("'electric' → fuel type", () => {
      expect(parseQuery("electric").filters.fuel).toEqual(["electric"]);
    });
  });

  describe("numeric comparisons", () => {
    it.each([
      ["under 500 hp", "powerMax", 500],
      ["below 400bhp", "powerMax", 400],
      ["less than 300 ps", "powerMax", 300],
      ["over 700 hp", "powerMin", 700],
      ["more than 1000 horsepower", "powerMin", 1000],
      ["at least 600 hp", "powerMin", 600],
    ] as const)("%s", (input, key, expected) => {
      expect(parseQuery(input).filters[key]).toBe(expected);
    });

    it("handles thousands separators", () => {
      expect(parseQuery("over 1,000 hp").filters.powerMin).toBe(1000);
    });

    it("accepts both power bounds at once", () => {
      const { filters } = parseQuery("over 400 hp under 700 hp");
      expect(filters.powerMin).toBe(400);
      expect(filters.powerMax).toBe(700);
    });

    it.each([
      ["under 250 kmh", "speedMax", 250],
      ["above 300 km/h", "speedMin", 300],
      ["over 320 kph", "speedMin", 320],
    ] as const)("%s", (input, key, expected) => {
      expect(parseQuery(input).filters[key]).toBe(expected);
    });

    it("parses production years", () => {
      expect(parseQuery("after 2020").filters.yearMin).toBe(2020);
      expect(parseQuery("before 2015").filters.yearMax).toBe(2015);
    });
  });

  describe("engine configurations", () => {
    it.each([
      ["v12", "vee", 12],
      ["v-10", "vee", 10],
      ["flat-6", "flat", 6],
      ["boxer six", "flat", 6],
      ["inline-4", "inline", 4],
      ["straight six", "inline", 6],
      ["i6", "inline", 6],
    ] as const)("%s → %s with %i cylinders", (input, layout, cylinders) => {
      const { filters } = parseQuery(input);
      expect(filters.engineLayout).toContain(layout);
      expect(filters.cylinders).toContain(cylinders);
    });

    it("reads spelled-out cylinder counts", () => {
      expect(parseQuery("six cylinder").filters.cylinders).toEqual([6]);
      expect(parseQuery("twelve-cylinder").filters.cylinders).toEqual([12]);
    });

    it("prefers twin-turbo over the looser turbo rule", () => {
      // Longest-match-first matters: "twin turbo" must not be read as "turbo".
      expect(parseQuery("twin-turbo v8").filters.aspiration).toEqual(["twin_turbo"]);
    });

    it("recognises naturally aspirated", () => {
      expect(parseQuery("naturally aspirated v10").filters.aspiration).toEqual([
        "naturally_aspirated",
      ]);
    });
  });

  describe("multi-word phrases beat their substrings", () => {
    it("'sports car' is a category, not the body word 'car'", () => {
      const { filters } = parseQuery("sports car");
      expect(filters.category).toEqual(["sports-car"]);
      expect(filters.body).toBeUndefined();
    });

    it("'plug-in hybrid' is phev, not hybrid", () => {
      expect(parseQuery("plug-in hybrid").filters.fuel).toEqual(["phev"]);
    });

    it("'all-wheel drive' resolves to awd", () => {
      expect(parseQuery("all-wheel drive").filters.drive).toEqual(["awd"]);
    });

    it("'four wheel drive' resolves to 4wd, not fwd", () => {
      expect(parseQuery("four wheel drive").filters.drive).toEqual(["4wd"]);
    });
  });

  describe("combinations", () => {
    it("parses a dense multi-facet query", () => {
      const { filters, text } = parseQuery(
        "german electric suv over 500 hp all-wheel drive after 2021",
      );
      expect(filters.country).toEqual(["germany"]);
      expect(filters.fuel).toEqual(["electric"]);
      expect(filters.body).toEqual(["suv"]);
      expect(filters.powerMin).toBe(500);
      expect(filters.drive).toEqual(["awd"]);
      expect(filters.yearMin).toBe(2021);
      expect(text).toBeUndefined();
    });

    it("collects several countries", () => {
      const { filters } = parseQuery("german and italian supercars");
      expect(filters.country).toEqual(expect.arrayContaining(["germany", "italy"]));
      expect(filters.country).toHaveLength(2);
    });
  });

  describe("leftover text", () => {
    it("passes unmatched words through for full-text search", () => {
      const { filters, text } = parseQuery("porsche german supercars");
      expect(filters.country).toEqual(["germany"]);
      expect(filters.category).toEqual(["supercar"]);
      expect(text).toBe("porsche");
    });

    it("returns everything as text when nothing matches", () => {
      const { filters, text } = parseQuery("huracan");
      expect(text).toBe("huracan");
      expect(Object.keys(filters)).toHaveLength(0);
    });

    it("strips filler words", () => {
      expect(parseQuery("show me all the cars").text).toBeUndefined();
    });
  });

  describe("edge cases", () => {
    it.each(["", "   ", "\n\t"])("returns empty for %j", (input) => {
      const { filters, text, matches } = parseQuery(input);
      expect(filters).toEqual({});
      expect(text).toBeUndefined();
      expect(matches).toHaveLength(0);
    });

    it("is case-insensitive", () => {
      expect(parseQuery("GERMAN SUPERCARS").filters.country).toEqual(["germany"]);
    });

    it("does not duplicate a repeated term", () => {
      expect(parseQuery("electric electric ev").filters.fuel).toEqual(["electric"]);
    });

    it("survives punctuation without throwing", () => {
      expect(() => parseQuery("v8!! (turbo) — 500hp???")).not.toThrow();
    });

    it("does not treat a model number as a comparison", () => {
      // "911" should reach full-text search, not become a numeric filter.
      const { filters, text } = parseQuery("911");
      expect(filters.powerMin).toBeUndefined();
      expect(filters.powerMax).toBeUndefined();
      expect(text).toBe("911");
    });
  });

  describe("reported matches", () => {
    it("describes what it understood", () => {
      const { matches } = parseQuery("german supercars over 500 hp");
      const kinds = matches.map((match) => match.kind);
      expect(kinds).toEqual(expect.arrayContaining(["country", "category", "power"]));
      expect(matches.find((match) => match.kind === "power")?.label).toBe("Over 500 hp");
    });
  });
});
