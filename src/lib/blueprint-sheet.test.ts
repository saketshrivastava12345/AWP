import { describe, expect, it } from "vitest";
import { FALLBACK_SIZE } from "@/components/3d/car-styles";
import { blueprintSheet, type SheetInput, type ViewId } from "./blueprint-sheet";

const carreraS: SheetInput = {
  bodyType: "coupe",
  powertrain: "combustion",
  enginePosition: "rear",
  lengthMm: 4519,
  widthMm: 1852,
  heightMm: 1300,
  wheelbaseMm: 2450,
  groundClearanceMm: null,
};

const suv: SheetInput = {
  bodyType: "suv",
  powertrain: "hybrid",
  enginePosition: "front",
  lengthMm: 4953,
  widthMm: 1958,
  heightMm: 1776,
  wheelbaseMm: 2984,
  groundClearanceMm: null,
};

type Pt = readonly [number, number];
const xs = (points: readonly Pt[]) => points.map((p) => p[0]);
const ys = (points: readonly Pt[]) => points.map((p) => p[1]);
const span = (values: number[]) => Math.max(...values) - Math.min(...values);

function view(sheet: ReturnType<typeof blueprintSheet>, id: ViewId) {
  const found = sheet.views.find((v) => v.id === id);
  if (!found) throw new Error(`no ${id} view`);
  return found;
}

function dims(sheet: ReturnType<typeof blueprintSheet>) {
  return sheet.views.flatMap((v) => v.dimensions.map((d) => ({ view: v.id, ...d })));
}

describe("blueprintSheet — proportions follow the published dimensions", () => {
  it("draws every view at the published length, width and height", () => {
    const sheet = blueprintSheet(carreraS);
    const { side, top, front } = sheet.outlines;
    expect(span(xs(side))).toBeCloseTo(4519, 3);
    expect(Math.max(...ys(side))).toBeCloseTo(1300, 0);
    expect(span(xs(top))).toBeCloseTo(4519, 3);
    expect(span(ys(top))).toBeCloseTo(1852, 3);
    // End-on, the silhouette is the body's full width and height.
    expect(span(xs(front))).toBeCloseTo(1852, -1);
    expect(Math.max(...ys(front))).toBeCloseTo(1300, -1);
    expect(Math.min(...ys(front))).toBeGreaterThan(0);
  });

  it("keeps the proportions of different cars apart (an SUV is taller for its width)", () => {
    const coupe = blueprintSheet(carreraS).outlines.front;
    const tall = blueprintSheet(suv).outlines.front;
    const ratio = (p: readonly Pt[]) => span(ys(p)) / span(xs(p));
    expect(ratio(tall)).toBeGreaterThan(ratio(coupe) + 0.15);
  });

  it("puts the tyres inside the published width, symmetrically", () => {
    const sheet = blueprintSheet(carreraS);
    const { front, rear } = sheet.outlines.tyreCentres;
    expect(front).toBeGreaterThan(0);
    expect(front).toBeLessThan(1852 / 2);
    expect(rear).toBeCloseTo(front, 6);
  });

  it("draws the views at one common scale, lined up like a drawing sheet", () => {
    const sheet = blueprintSheet(carreraS);
    const side = view(sheet, "side").viewBox;
    const top = view(sheet, "top").viewBox;
    const front = view(sheet, "front").viewBox;
    const rear = view(sheet, "rear").viewBox;
    // The long views share a column, the end views the one beside it at half
    // its width: grid columns of 2fr and 1fr then give every view one scale.
    expect(top.x).toBe(side.x);
    expect(top.width).toBe(side.width);
    expect(rear.x).toBe(front.x);
    expect(rear.width).toBe(front.width);
    expect(side.width).toBeCloseTo(front.width * 2, 6);
    // Side and front views share the ground line and height.
    expect(front.y).toBe(side.y);
    expect(front.height).toBe(side.height);
    expect(rear.height).toBe(top.height);
    // Every view has room for what it draws.
    for (const v of sheet.views) {
      expect(v.viewBox.width).toBeGreaterThan(0);
      expect(v.viewBox.height).toBeGreaterThan(0);
    }
  });

  it("emits finite path data only", () => {
    for (const input of [
      carreraS,
      suv,
      { ...carreraS, bodyType: "pickup", lengthMm: null },
    ]) {
      for (const v of blueprintSheet(input).views) {
        for (const shape of v.shapes) {
          expect(shape.d).not.toMatch(/NaN|Infinity/);
          expect(shape.d.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe("blueprintSheet — dimension lines", () => {
  it("draws one line per published figure, labelled with that figure", () => {
    const all = dims(blueprintSheet(carreraS));
    const summary = all.map((d) => `${d.view}:${d.id}=${d.valueMm}`).sort();
    expect(summary).toEqual(
      [
        "side:wheelbase=2450",
        "side:length=4519",
        "front:width=1852",
        "front:height=1300",
        "rear:width=1852",
        "rear:height=1300",
        "top:width=1852",
      ].sort(),
    );
  });

  it("spans exactly the figure it is labelled with", () => {
    for (const d of dims(blueprintSheet(carreraS))) {
      const length = Math.hypot(d.to[0] - d.from[0], d.to[1] - d.from[1]);
      expect(length, `${d.view} ${d.id}`).toBeCloseTo(d.valueMm, 6);
    }
  });

  it("draws no line for a figure that is not published, and falls back to the style", () => {
    const sheet = blueprintSheet({ ...carreraS, widthMm: null });
    expect(dims(sheet).some((d) => d.id === "width")).toBe(false);
    expect(sheet.missing).toEqual(["width"]);
    expect(sheet.published.width).toBe(false);
    // Drawn at the body style's typical width instead.
    expect(span(ys(sheet.outlines.top))).toBeCloseTo(FALLBACK_SIZE.coupe.width * 1000, 3);
    // The other published figures still get their lines.
    expect(dims(sheet).filter((d) => d.id === "height")).toHaveLength(2);
    expect(dims(sheet).filter((d) => d.id === "length")).toHaveLength(1);
  });

  it("draws no dimension lines at all when nothing is published", () => {
    const sheet = blueprintSheet({
      bodyType: "pickup",
      powertrain: "combustion",
      enginePosition: "front",
      lengthMm: null,
      widthMm: null,
      heightMm: null,
      wheelbaseMm: null,
      groundClearanceMm: null,
    });
    expect(dims(sheet)).toEqual([]);
    expect(sheet.missing).toEqual(["length", "width", "height", "wheelbase"]);
    // Still a whole drawing, at the pickup's typical size.
    expect(span(xs(sheet.outlines.side))).toBeCloseTo(
      FALLBACK_SIZE.pickup.length * 1000,
      3,
    );
    expect(sheet.views).toHaveLength(4);
  });

  it("drops a wheelbase too long for the car rather than drawing it wrongly", () => {
    const sheet = blueprintSheet({ ...carreraS, wheelbaseMm: 4000 });
    expect(dims(sheet).some((d) => d.id === "wheelbase")).toBe(false);
    expect(sheet.missing).toContain("wheelbase");
  });

  it("adds ground clearance only when it is published", () => {
    expect(dims(blueprintSheet(suv)).some((d) => d.id === "groundClearance")).toBe(false);
    const withGc = dims(blueprintSheet({ ...suv, groundClearanceMm: 205 }));
    const gc = withGc.filter((d) => d.id === "groundClearance");
    expect(gc).toHaveLength(1);
    expect(gc[0]?.view).toBe("side");
    expect(gc[0]?.valueMm).toBe(205);
  });

  it("dimensions a track only when the data has one", () => {
    expect(dims(blueprintSheet(carreraS)).some((d) => d.id.endsWith("Track"))).toBe(
      false,
    );
    const sheet = blueprintSheet({ ...carreraS, frontTrackMm: 1590 });
    const tracks = dims(sheet).filter((d) => d.id.endsWith("Track"));
    expect(tracks.map((d) => `${d.view}:${d.id}=${d.valueMm}`)).toEqual([
      "front:frontTrack=1590",
    ]);
    expect(sheet.outlines.tyreCentres.front).toBe(795);
  });
});

describe("blueprintSheet — drawn from the data", () => {
  it("draws a rear wing only when one is catalogued", () => {
    const count = (input: SheetInput) =>
      blueprintSheet(input).views.reduce((n, v) => n + v.shapes.length, 0);
    expect(count({ ...carreraS, rearWing: true })).toBeGreaterThan(count(carreraS));
  });

  it("uses the engine position to choose the body style, as the 3D car does", () => {
    expect(blueprintSheet(carreraS).style).toBe("sports-rear");
    expect(blueprintSheet({ ...carreraS, enginePosition: "mid" }).style).toBe("supercar");
    expect(blueprintSheet({ ...carreraS, enginePosition: null }).style).toBe("gt");
  });
});
