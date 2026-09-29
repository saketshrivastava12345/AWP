import { describe, expect, it } from "vitest";
import type { SearchResult } from "@/types/domain";
import {
  MAX_RECENT_SEARCHES,
  addRecentSearch,
  buildIdleSections,
  buildResultSections,
  carsSearchHref,
  flattenSections,
  highlightRanges,
  parseRecentSearches,
  resultPresentation,
  splitByRanges,
  stepIndex,
  understoodAs,
} from "./palette-model";

function result(
  partial: Partial<SearchResult> & Pick<SearchResult, "kind" | "title">,
): SearchResult {
  return {
    id: partial.title.toLowerCase().replace(/\W+/g, "-"),
    subtitle: null,
    href: `/${partial.kind}/${partial.title}`,
    imageUrl: null,
    score: 0.5,
    ...partial,
  };
}

describe("buildResultSections", () => {
  it("offers only the full search when nothing matches", () => {
    const sections = buildResultSections("german supercars", []);
    expect(sections.map((s) => s.id)).toEqual(["search"]);
    const option = sections[0]?.options[0];
    expect(option?.type).toBe("search-all");
    if (option?.type === "search-all") {
      expect(option.href).toBe("/cars?q=german%20supercars");
      expect(option.understood).toEqual(expect.arrayContaining(["Germany"]));
    }
  });

  it("orders groups by their best score, not a fixed kind order", () => {
    const sections = buildResultSections("brake", [
      result({ kind: "car", title: "Nissan GT-R NISMO", score: 0.06 }),
      result({ kind: "part", title: "Brake Disc", score: 1 }),
      result({ kind: "part", title: "Brake Pad", score: 1 }),
    ]);
    expect(sections.map((s) => s.id)).toEqual(["part", "car", "search"]);
  });

  it("puts a strong name match ahead of the full search even for a parsed word", () => {
    // "japan" is also a country filter for the parser, but the country page
    // itself is an exact hit and should be what Enter opens.
    const sections = buildResultSections("japan", [
      result({ kind: "car", title: "Nissan Leaf e+", score: 0.29 }),
      result({ kind: "country", title: "Japan", subtitle: "🇯🇵", score: 1 }),
    ]);
    expect(sections.map((s) => s.id)).toEqual(["country", "car", "search"]);
  });

  it("leads with the full search when a description only matches weakly", () => {
    const sections = buildResultSections("electric suv", [
      result({ kind: "car", title: "Renault Megane E-Tech Electric", score: 0.69 }),
      result({ kind: "part", title: "Electric Traction Motor", score: 0.69 }),
    ]);
    expect(sections[0]?.id).toBe("search");
    expect(flattenSections(sections)).toHaveLength(3);
  });

  it("breaks a score tie in favour of the marque, and sorts within a group by score", () => {
    const sections = buildResultSections("porche", [
      result({ kind: "car", title: "Porsche 911 GT3", score: 0.4 }),
      result({ kind: "manufacturer", title: "Porsche", score: 0.5 }),
      result({ kind: "car", title: "Porsche 911 Carrera S", score: 0.5 }),
    ]);
    expect(sections.map((s) => s.id)).toEqual(["manufacturer", "car", "search"]);
    expect(
      sections[1]?.options.map((o) => (o.type === "result" ? o.result.title : "")),
    ).toEqual(["Porsche 911 Carrera S", "Porsche 911 GT3"]);
  });

  it("leads with an exact name match even when another kind scores higher", () => {
    // Cars mentioning Porsche outscore the marque on the search's own scale.
    const sections = buildResultSections("  PORSCHE ", [
      result({ kind: "car", title: "Porsche 911 GT3", score: 1.6 }),
      result({ kind: "manufacturer", title: "Porsche", score: 1 }),
    ]);
    expect(sections.map((s) => s.id)).toEqual(["manufacturer", "car", "search"]);
  });

  it("matches names regardless of case, accents and punctuation", () => {
    const sections = buildResultSections("citroen", [
      result({ kind: "car", title: "Citroën C5 X", score: 1.2 }),
      result({ kind: "manufacturer", title: "Citroën", score: 0.9 }),
    ]);
    expect(sections[0]?.id).toBe("manufacturer");
  });
});

describe("buildIdleSections", () => {
  it("shows examples only when there is no history", () => {
    expect(buildIdleSections([]).map((s) => s.id)).toEqual(["examples"]);
  });

  it("puts recent searches first", () => {
    const sections = buildIdleSections(["911 gt", "brake"]);
    expect(sections.map((s) => s.id)).toEqual(["recent", "examples"]);
    expect(sections[0]?.options.map((o) => o.type)).toEqual([
      "recent",
      "recent",
      "clear-recent",
    ]);
  });

  it("links every example to the natural-language car search", () => {
    const examples = buildIdleSections([]).flatMap((s) => s.options);
    for (const option of examples) {
      expect(option.type).toBe("example");
      if (option.type === "example")
        expect(option.href).toBe(carsSearchHref(option.query));
    }
  });
});

describe("understoodAs", () => {
  it("lists recognised filters and leaves free text out", () => {
    expect(understoodAs("german supercars")).toEqual(
      expect.arrayContaining(["Germany", "Supercar"]),
    );
    expect(understoodAs("porsche")).toEqual([]);
  });
});

describe("highlightRanges", () => {
  it("marks each query word at a word start", () => {
    const text = "Porsche 911 GT3";
    const parts = splitByRanges(text, highlightRanges(text, "911 gt"));
    expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(["911", "GT"]);
  });

  it("does not mark short fragments inside words", () => {
    expect(highlightRanges("Ferrari", "ar")).toEqual([]);
  });

  it("marks longer fragments inside words", () => {
    expect(highlightRanges("Carbon-Ceramic Brake Disc", "eramic")).toEqual([[8, 14]]);
  });

  it("ignores case and accents", () => {
    const text = "McLaren 750S Coupé";
    const parts = splitByRanges(text, highlightRanges(text, "COUPE"));
    expect(parts.filter((p) => p.match).map((p) => p.text)).toEqual(["Coupé"]);
  });

  it("merges overlapping matches", () => {
    expect(highlightRanges("Brake Disc", "bra brake")).toEqual([[0, 5]]);
  });

  it("leaves typo matches unmarked", () => {
    expect(highlightRanges("Porsche", "porche")).toEqual([]);
  });

  it("round-trips the text through splitByRanges", () => {
    const text = "Mercedes-Benz AMG GT 63 S";
    const joined = splitByRanges(text, highlightRanges(text, "amg gt"))
      .map((p) => p.text)
      .join("");
    expect(joined).toBe(text);
  });
});

describe("recent searches", () => {
  it("reads malformed storage as empty", () => {
    expect(parseRecentSearches(null)).toEqual([]);
    expect(parseRecentSearches("not json")).toEqual([]);
    expect(parseRecentSearches('{"a":1}')).toEqual([]);
    expect(parseRecentSearches('["ok", 3, "", "  ", "OK"]')).toEqual(["ok"]);
  });

  it("adds newest first, de-duplicates case-insensitively and caps the list", () => {
    let list: string[] = [];
    for (const query of ["a", "b", "c", "d", "e", "f", "g"])
      list = addRecentSearch(list, query);
    expect(list).toHaveLength(MAX_RECENT_SEARCHES);
    expect(list[0]).toBe("g");
    expect(addRecentSearch(["911 GT", "brake"], " 911 gt ")).toEqual(["911 gt", "brake"]);
    expect(addRecentSearch(["x"], "   ")).toEqual(["x"]);
  });
});

describe("stepIndex", () => {
  it("wraps in both directions", () => {
    expect(stepIndex(0, -1, 4)).toBe(3);
    expect(stepIndex(3, 1, 4)).toBe(0);
    expect(stepIndex(1, 1, 4)).toBe(2);
    expect(stepIndex(0, 1, 0)).toBe(-1);
  });
});

describe("resultPresentation", () => {
  it("moves a country's flag out of the subtitle", () => {
    expect(
      resultPresentation(result({ kind: "country", title: "Japan", subtitle: "🇯🇵" })),
    ).toEqual({ subtitle: null, flag: "🇯🇵" });
    expect(
      resultPresentation(
        result({ kind: "part", title: "Brake Pad", subtitle: "Braking" }),
      ),
    ).toEqual({ subtitle: "Braking", flag: null });
  });
});
