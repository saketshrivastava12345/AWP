import { describe, expect, it } from "vitest";
import {
  activeChapterId,
  chapterPosition,
  detailSubNav,
  placementOf,
  type ChapterPlacement,
} from "./chapters";

const order = ["machine", "performance", "engineering", "pricing"];
const placements = (entries: [string, ChapterPlacement][]) => new Map(entries);

describe("activeChapterId", () => {
  it("is the last chapter inside the reading band", () => {
    expect(
      activeChapterId(
        order,
        placements([
          ["machine", "above"],
          ["performance", "in"],
          ["engineering", "in"],
          ["pricing", "below"],
        ]),
      ),
    ).toBe("engineering");
  });

  it("between chapters, stays on the one last scrolled past", () => {
    expect(
      activeChapterId(
        order,
        placements([
          ["machine", "above"],
          ["performance", "above"],
          ["engineering", "below"],
          ["pricing", "below"],
        ]),
      ),
    ).toBe("performance");
  });

  it("is none above the first chapter", () => {
    expect(
      activeChapterId(
        order,
        placements([
          ["machine", "below"],
          ["performance", "below"],
        ]),
      ),
    ).toBeNull();
    expect(activeChapterId(order, new Map())).toBeNull();
  });

  it("ignores chapters that are not on the page", () => {
    expect(activeChapterId(order, placements([["pricing", "in"]]))).toBe("pricing");
  });
});

describe("placementOf", () => {
  it("classifies observer entries against the band's top edge", () => {
    expect(placementOf(true, 400, 0)).toBe("in");
    expect(placementOf(false, -10, 0)).toBe("above");
    expect(placementOf(false, 0, 0)).toBe("above");
    expect(placementOf(false, 900, 0)).toBe("below");
  });
});

describe("chapterPosition", () => {
  const chapters = [
    { id: "machine", number: "01", label: "The Machine" },
    { id: "performance", number: "02", label: "Performance" },
    { id: "explore", number: "07", label: "Explore" },
  ];
  it("prints the chapter's own number over the last chapter's", () => {
    expect(chapterPosition(chapters, "performance")).toBe("02 / 07");
    expect(chapterPosition(chapters, null)).toBeNull();
    expect(chapterPosition(chapters, "missing")).toBeNull();
  });
});

describe("detailSubNav", () => {
  it("lists every section in reading order, as in-page links", () => {
    expect(detailSubNav().map((item) => `${item.label} ${item.href}`)).toEqual([
      "Overview #overview",
      "Performance #performance",
      "Engineering #engineering",
      "Design #design",
      "Features #features",
      "Technical data #technical-data",
      "Price #pricing",
      "Compare #compare",
    ]);
  });

  it("drops a section the page leaves out and keeps the rest in order", () => {
    expect(detailSubNav({ engineering: false }).map((item) => item.id)).toEqual([
      "overview",
      "performance",
      "design",
      "features",
      "technical-data",
      "pricing",
      "compare",
    ]);
  });
});
