import { STYLES, falloff, lerp, monotone, smooth } from "@/components/3d/car-styles";
import {
  drawingGeometry,
  type DrawingGeometry,
  type DrawingInput,
  type Point,
} from "@/lib/detail/drawing";
import { toFinite } from "@/lib/detail/figures";

/**
 * The car page's blueprint sheet: four orthographic views of the car — side,
 * top, front and rear — at ONE common scale, laid out like a drawing sheet,
 * with a dimension line for every published figure and none for a missing one.
 *
 * Nothing here is a likeness of the model. The shape is the procedural car's:
 * the body style's side profile and plan curve (car-styles.ts), lofted into
 * cross-sections exactly as car-shape.ts lofts the 3D body, sized to the
 * variant's published dimensions where they exist and to the body style's
 * typical proportions where they do not (lib/detail/drawing.ts, which the side
 * and top views reuse unchanged). The lamps, grille, mirrors and the like are
 * the same simple shapes the 3D model paints on, placed by the same rules.
 *
 * How each view is derived:
 *   side   the lofted profile (drawingGeometry), side glass split at the
 *          B-pillar, door shut lines, wheels at the published wheelbase
 *   top    the plan curve at the published width (drawingGeometry), the
 *          glasshouse and roof panel, tyres as hidden lines
 *   front  the union of every cross-section seen end-on (the silhouette),
 *   rear   the sections ahead of the front wheels (or behind the rear ones)
 *          drawn over the tyres they hide, glazing and lamps
 *
 * Pure TypeScript with no three.js, so it runs in a server component and only
 * the resulting path data reaches the browser. Units are millimetres. Every
 * coordinate returned for drawing is already in the view's SVG space (y down).
 */

export type SheetInput = DrawingInput & {
  /** Published track widths. The catalogue has no column for them yet. */
  frontTrackMm?: number | null;
  rearTrackMm?: number | null;
  /** A rear wing is catalogued for this variant (CarBuild.rearWing). */
  rearWing?: boolean;
};

export type ViewId = "side" | "front" | "top" | "rear";

/**
 * What a shape is, which decides how it is painted:
 *   body    the main outline, filled with the body tone
 *   near    a nearer part of the body drawn over what it hides (nose, tail)
 *   glass   glazing
 *   tyre    tyres, filled dark
 *   detail  shut lines, lamps, grille, rims, mirrors' arms (thin)
 *   hidden  edges hidden behind the body (dashed)
 *   centre  centre lines (chain)
 *   ground  the ground line
 */
export type ShapeRole =
  "body" | "near" | "glass" | "tyre" | "detail" | "hidden" | "centre" | "ground";

export type SheetShape = { role: ShapeRole; d: string };

export type DimensionId =
  | "length"
  | "wheelbase"
  | "height"
  | "width"
  | "groundClearance"
  | "frontTrack"
  | "rearTrack";

export type SheetDimension = {
  id: DimensionId;
  /** Short label printed on the line: "L", "WB", "H", "W", "GC", "T". */
  abbr: string;
  /** The published figure, in millimetres. */
  valueMm: number;
  orientation: "horizontal" | "vertical";
  from: Point;
  to: Point;
  /** Extension lines from the feature measured out to the dimension line. */
  extensions: (readonly [Point, Point])[];
  /** Where the label sits: on the line, or beside it for a short span. */
  label: Point;
  placement: "on-line" | "beside";
};

export type SheetView = {
  id: ViewId;
  title: string;
  viewBox: { x: number; y: number; width: number; height: number };
  shapes: SheetShape[];
  dimensions: SheetDimension[];
  /** A 100 mm grid and a 500 mm grid over the whole view, as path data. */
  grid: { minor: string; major: string };
};

export type SheetDimensionName = "length" | "width" | "height" | "wheelbase";

export type BlueprintSheet = {
  style: DrawingGeometry["style"];
  bodyType: DrawingGeometry["bodyType"];
  published: DrawingGeometry["published"] & { frontTrack: boolean; rearTrack: boolean };
  /** The four main dimensions that are NOT published (drawn to typical proportions). */
  missing: SheetDimensionName[];
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  /** In reading order: side, front, top, rear. */
  views: SheetView[];
  /** The outlines in car millimetres, for measuring (tests). */
  outlines: {
    /** Side elevation: x from the tail, y up from the ground. */
    side: Point[];
    /** Plan: x from the tail, y across from the centre line. */
    top: Point[];
    /** End-on silhouette (the same seen from either end): x across, y up. */
    front: Point[];
    /** Tyre centres across the car, front and rear axle. */
    tyreCentres: { front: number; rear: number };
  };
};

// ---------------------------------------------------------------------------
// Sheet layout, millimetres. Labels are HTML at a fixed pixel size, so the
// spacing is sized for the smallest scale the sheet renders at (a 390px
// phone, about 0.06 px per mm).
// ---------------------------------------------------------------------------

/** From the object to the first dimension line. */
const FIRST = 330;
/** Between stacked dimension lines. */
const ROW = 330;
/** Half the thickness of a label on its line. */
const LABEL = 170;
/** Clear margin at the edge of a view. */
const EDGE = 240;
/** Above the roof. */
const HEAD = 200;
/** How far extension lines run past the dimension line, and their gap at the object. */
const OVERSHOOT = 90;
const GAP = 45;

type P = [number, number];

// ---------------------------------------------------------------------------
// Catmull-Rom, as car-shape.ts evaluates its cross-section bands
// ---------------------------------------------------------------------------

const SIDE_WEIGHTS = [1, 2, 2, 3, 3, 2] as const;
const GLASS_WEIGHTS = [2, 2] as const;
const TOP_WEIGHTS = [1, 3, 4] as const;

function knot(points: readonly P[], i: number): P {
  const n = points.length;
  if (i < 0) {
    const a = points[0] ?? [0, 0];
    const b = points[1] ?? a;
    return [2 * a[0] - b[0], 2 * a[1] - b[1]];
  }
  if (i > n - 1) {
    const a = points[n - 1] ?? [0, 0];
    const b = points[n - 2] ?? a;
    return [2 * a[0] - b[0], 2 * a[1] - b[1]];
  }
  return points[i] ?? [0, 0];
}

function catmull(points: readonly P[], segment: number, t: number): P {
  const p0 = knot(points, segment - 1);
  const p1 = knot(points, segment);
  const p2 = knot(points, segment + 1);
  const p3 = knot(points, segment + 2);
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * t +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

function sampleCatmull(
  points: readonly P[],
  weights: readonly number[],
  density: number,
): P[] {
  const out: P[] = [];
  for (let segment = 0; segment < points.length - 1; segment += 1) {
    const count = (weights[segment] ?? 1) * density;
    for (let k = 0; k < count; k += 1) out.push(catmull(points, segment, k / count));
  }
  out.push(knot(points, points.length - 1));
  return out;
}

/** The spline at a continuous parameter t in [0, 1], weighted like the samples. */
function evalCatmull(points: readonly P[], weights: readonly number[], t: number): P {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let target = Math.min(1, Math.max(0, t)) * total;
  let segment = 0;
  while (segment < weights.length - 1 && target > (weights[segment] ?? 1)) {
    target -= weights[segment] ?? 1;
    segment += 1;
  }
  return catmull(
    points,
    segment,
    Math.min(1, Math.max(0, target / (weights[segment] ?? 1))),
  );
}

// ---------------------------------------------------------------------------
// The lofted body, in millimetres (car-shape.ts's BodyShape, without three.js)
// ---------------------------------------------------------------------------

type Section = {
  u: number;
  /** Along the car from the tail. */
  x: number;
  bottom: number;
  sill: number;
  belt: number;
  glass: number;
  halfWidth: number;
  edge: number;
  crown: number;
  roofness: number;
};

/** How far the fender must stand above the arch opening (car-shape.ts). */
const FENDER_CLEARANCE = 60;

function loft(geometry: DrawingGeometry) {
  const def = STYLES[geometry.style];
  const { length: L, width: W, height: H, groundClearance: GC } = geometry;
  const { frontAxleX, rearAxleX } = geometry.side;
  const R = Math.min(def.wheelRadius * 1000, H * 0.285);
  const arch = R * 1.12;
  const beltAt = monotone(def.belt);
  const roofAt = monotone([
    [def.deck, beltAt(def.deck)],
    ...def.roof,
    [def.cowl, beltAt(def.cowl)],
  ]);

  const archTop = (x: number) => {
    let top = Number.NEGATIVE_INFINITY;
    for (const axle of [frontAxleX, rearAxleX]) {
      const dx = x - axle;
      if (Math.abs(dx) < arch) top = Math.max(top, R + Math.sqrt(arch * arch - dx * dx));
    }
    return top;
  };
  const flare = (x: number) => {
    const bump = (axle: number) => {
      const s = Math.abs(x - axle) / (arch * 1.9);
      return s >= 1 ? 0 : Math.pow(Math.cos((s * Math.PI) / 2), 2);
    };
    return def.flareFront * bump(frontAxleX) + def.flareRear * bump(rearAxleX);
  };
  const rawHalfWidth = (u: number) => {
    const sFront = (u - (1 - def.planFront)) / def.planFront;
    const sRear = (def.planRear - u) / def.planRear;
    return (
      (W / 2) *
      (1 + flare(u * L)) *
      falloff(sFront, def.planFrontExp) *
      falloff(sRear, def.planRearExp)
    );
  };
  // The published width is the widest point of the body (as in drawing.ts).
  let widest = 0;
  for (let i = 0; i <= 600; i += 1) widest = Math.max(widest, rawHalfWidth(i / 600));
  for (const axle of [frontAxleX, rearAxleX])
    widest = Math.max(widest, rawHalfWidth(axle / L));
  const halfWidthAt = (u: number) =>
    widest > 0 ? (rawHalfWidth(u) * (W / 2)) / widest : 0;

  const section = (u: number): Section => {
    const x = u * L;
    let belt = beltAt(u) * H;
    const over = archTop(x);
    if (over > 0) belt = Math.max(belt, over + FENDER_CLEARANCE);

    const inGlasshouse = u > def.deck && u < def.cowl;
    const roofTop = inGlasshouse ? roofAt(u) * H : 0;
    const glass = inGlasshouse ? Math.max(0, roofTop - def.roofCrown * 1000 - belt) : 0;
    const roofness = smooth(glass / 120);
    let crown = lerp(def.hoodCrown, def.roofCrown, roofness) * 1000;

    let bottom = GC;
    const frontStart = frontAxleX + arch;
    const rearStart = rearAxleX - arch;
    if (x > frontStart)
      bottom += def.chin * H * smooth((x - frontStart) / (L - frontStart));
    else if (x < rearStart)
      bottom += def.tailLift * H * smooth((rearStart - x) / rearStart);
    let sill = bottom;
    bottom = Math.max(bottom, over);

    const halfWidth = halfWidthAt(u);
    const capS = Math.max(
      (u - (1 - def.capFront)) / def.capFront,
      (def.capRear - u) / def.capRear,
    );
    if (capS > 0) {
      const tip = (u > 0.5 ? def.nose : def.tail) * H;
      const f = falloff(capS, def.capExp);
      belt = tip + (belt - tip) * f;
      bottom = tip + (bottom - tip) * f;
      sill = tip + (sill - tip) * f;
      crown *= f;
    }
    if (belt < bottom + 10) belt = bottom + 10;
    const edge = halfWidth * lerp(0.86, def.roofWidth, roofness);
    return { u, x, bottom, sill, belt, glass, halfWidth, edge, crown, roofness };
  };

  // Band control points, right-hand half (x >= 0), exactly as car-shape.ts.
  const sidePoints = (s: Section): P[] => {
    const d = s.belt - s.sill;
    const hw = s.halfWidth;
    return [
      [hw * def.belly * 0.8, s.sill],
      [hw * def.belly * 0.97, s.sill + 0.1 * d],
      [hw * def.belly, s.sill + 0.24 * d],
      [hw * 0.985, s.sill + 0.47 * d],
      [hw, s.sill + 0.7 * d],
      [hw * 0.988, s.sill + 0.9 * d],
      [hw * 0.958, s.belt],
    ];
  };
  const glassPoints = (s: Section): P[] => {
    const start: P = [s.halfWidth * 0.958, s.belt];
    const end: P = [s.edge, s.belt + s.glass];
    const bow = 12 * s.roofness;
    return [start, [lerp(start[0], end[0], 0.5) + bow, lerp(start[1], end[1], 0.5)], end];
  };
  const topPoints = (s: Section): P[] => {
    const y = s.belt + s.glass;
    return [
      [s.edge, y],
      [s.edge * 0.93, y + s.crown * 0.3],
      [s.edge * 0.55, y + s.crown * 0.86],
      [0, y + s.crown],
    ];
  };
  /** Top band across the whole section: t = 0 right edge, 0.5 centre, 1 left edge. */
  const topAt = (s: Section, t: number): P => {
    if (t <= 0.5) return evalCatmull(topPoints(s), TOP_WEIGHTS, t * 2);
    const [x, y] = evalCatmull(topPoints(s), TOP_WEIGHTS, (1 - t) * 2);
    return [-x, y];
  };
  const sideAt = (s: Section, t: number): P => {
    const [x, y] = evalCatmull(sidePoints(s), SIDE_WEIGHTS, t);
    return [x, Math.min(s.belt, Math.max(y, s.bottom))];
  };
  const glassAt = (s: Section, t: number): P =>
    evalCatmull(glassPoints(s), GLASS_WEIGHTS, t);

  /** The right half of a cross-section, from the underside centre round to the roof centre. */
  const halfSection = (s: Section): P[] => {
    const points: P[] = [
      [0, s.bottom],
      [s.halfWidth * def.belly * 0.8, s.bottom],
    ];
    for (const [x, y] of sampleCatmull(sidePoints(s), SIDE_WEIGHTS, 2))
      points.push([x, Math.min(s.belt, Math.max(y, s.bottom))]);
    points.push(...sampleCatmull(glassPoints(s), GLASS_WEIGHTS, 2).slice(1));
    points.push(...sampleCatmull(topPoints(s), TOP_WEIGHTS, 2).slice(1));
    return points;
  };

  return {
    def,
    L,
    W,
    H,
    R,
    arch,
    frontAxleX,
    rearAxleX,
    section,
    halfWidthAt,
    sideAt,
    glassAt,
    topAt,
    halfSection,
  };
}

/**
 * The outline of a union of cross-sections seen end-on, right half from the
 * bottom centre round to the top centre. Each ray from a centre point inside
 * the union keeps its farthest crossing of any section, which is the union's
 * boundary as long as it is star-shaped from that point — true for a car,
 * whose sections all straddle the same mid-height.
 */
function endOnOutline(sections: readonly P[][], rays = 300): P[] {
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const poly of sections) {
    for (const [, y] of poly) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (!Number.isFinite(minY)) return [];
  const cy = (minY + maxY) / 2;
  // Evenly spaced rays, plus one aimed at each section's widest point so the
  // extreme width (a fender flare, say) is never missed between two rays.
  const angles = new Set<number>();
  for (let k = 1; k < rays; k += 1) angles.add(-Math.PI / 2 + (Math.PI * k) / rays);
  for (const poly of sections) {
    const widest = poly.reduce<P | null>(
      (best, p) => (!best || p[0] > best[0] ? p : best),
      null,
    );
    if (widest && widest[0] > 1) angles.add(Math.atan2(widest[1] - cy, widest[0]));
  }
  const out: P[] = [[0, minY]];
  for (const theta of [...angles].sort((a, b) => a - b)) {
    const dx = Math.cos(theta);
    const dy = Math.sin(theta);
    let best = -1;
    for (const poly of sections) {
      for (let i = 0; i < poly.length - 1; i += 1) {
        const p = poly[i];
        const q = poly[i + 1];
        if (!p || !q) continue;
        const ex = q[0] - p[0];
        const ey = q[1] - p[1];
        const denom = dx * ey - dy * ex;
        if (Math.abs(denom) < 1e-9) continue;
        const px = p[0];
        const py = p[1] - cy;
        const t = (px * ey - py * ex) / denom;
        const s = (px * dy - py * dx) / denom;
        if (s >= 0 && s <= 1 && t > best) best = t;
      }
    }
    if (best > 0) out.push([dx * best, cy + dy * best]);
  }
  out.push([0, maxY]);
  return simplify(out, 1.2);
}

/** Ramer–Douglas–Peucker, to keep the served path data small. */
function simplify<T extends Point>(points: T[], tolerance: number): T[] {
  if (points.length < 3) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [a, b] = stack.pop() ?? [0, 0];
    const pa = points[a];
    const pb = points[b];
    if (!pa || !pb) continue;
    let worst = -1;
    let index = -1;
    const ex = pb[0] - pa[0];
    const ey = pb[1] - pa[1];
    const len = Math.hypot(ex, ey);
    for (let i = a + 1; i < b; i += 1) {
      const p = points[i];
      if (!p) continue;
      // A closed outline starts and ends at one point (a plan's tail tip):
      // with no chord to measure from, measure from that point.
      const d =
        len < 1e-6
          ? Math.hypot(p[0] - pa[0], p[1] - pa[1])
          : Math.abs((p[0] - pa[0]) * ey - (p[1] - pa[1]) * ex) / len;
      if (d > worst) {
        worst = d;
        index = i;
      }
    }
    if (worst > tolerance && index > 0) {
      keep[index] = true;
      stack.push([a, index], [index, b]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** Close a right half into a full symmetric outline. */
function mirrored(half: readonly P[]): P[] {
  const left = [...half]
    .reverse()
    .filter(([x]) => x > 1e-6)
    .map(([x, y]): P => [-x, y]);
  return [...half, ...left];
}

/** The half-width of an end-on outline at height y (0 where it has none). */
function halfWidthOf(half: readonly P[], y: number): number {
  let best = 0;
  for (let i = 0; i < half.length - 1; i += 1) {
    const p = half[i];
    const q = half[i + 1];
    if (!p || !q) continue;
    if ((p[1] - y) * (q[1] - y) > 0 || p[1] === q[1]) continue;
    const t = (y - p[1]) / (q[1] - p[1]);
    best = Math.max(best, lerp(p[0], q[0], t));
  }
  return best;
}

/** Linear interpolation of a polyline's y at x (the upper half of a plan outline). */
function yAtX(points: readonly Point[], x: number): number {
  let best = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p = points[i];
    const q = points[i + 1];
    if (!p || !q) continue;
    if ((p[0] - x) * (q[0] - x) > 0 || p[0] === q[0]) continue;
    const t = (x - p[0]) / (q[0] - p[0]);
    best = Math.max(best, lerp(p[1], q[1], t));
  }
  return best;
}

// ---------------------------------------------------------------------------
// Path data
// ---------------------------------------------------------------------------

/** Whole millimetres: at the largest scale the sheet renders, 1 mm is a sixth of a pixel. */
const f1 = (n: number) => Math.round(n).toString();

type Map2 = (p: Point) => Point;

function polyPath(points: readonly Point[], map: Map2, closed = true): string {
  if (points.length === 0) return "";
  const parts = points.map((point, i) => {
    const [x, y] = map(point);
    return `${i === 0 ? "M" : "L"}${f1(x)} ${f1(y)}`;
  });
  return `${parts.join(" ")}${closed ? " Z" : ""}`;
}

/** An ellipse as two arcs (SVG space). */
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M${f1(cx - rx)} ${f1(cy)} A${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx + rx)} ${f1(cy)} A${f1(rx)} ${f1(ry)} 0 1 0 ${f1(cx - rx)} ${f1(cy)} Z`;
}

/** A rounded rectangle, optionally rolled about its centre, as points (car space). */
function roundedRect(
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
  roll = 0,
): Point[] {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  const corners: [number, number, number][] = [
    [w / 2 - radius, h / 2 - radius, 0],
    [-w / 2 + radius, h / 2 - radius, Math.PI / 2],
    [-w / 2 + radius, -h / 2 + radius, Math.PI],
    [w / 2 - radius, -h / 2 + radius, (3 * Math.PI) / 2],
  ];
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const points: Point[] = [];
  for (const [ox, oy, start] of corners) {
    for (let k = 0; k <= 5; k += 1) {
      const a = start + (k / 5) * (Math.PI / 2);
      const x = ox + radius * Math.cos(a);
      const y = oy + radius * Math.sin(a);
      points.push([cx + x * cos - y * sin, cy + x * sin + y * cos]);
    }
  }
  return points;
}

function gridPaths(box: SheetView["viewBox"], step: number): string {
  const parts: string[] = [];
  const x0 = Math.ceil(box.x / step) * step;
  const y0 = Math.ceil(box.y / step) * step;
  for (let x = x0; x <= box.x + box.width; x += step)
    parts.push(`M${f1(x)} ${f1(box.y)}V${f1(box.y + box.height)}`);
  for (let y = y0; y <= box.y + box.height; y += step)
    parts.push(`M${f1(box.x)} ${f1(y)}H${f1(box.x + box.width)}`);
  return parts.join("");
}

// ---------------------------------------------------------------------------
// The sheet
// ---------------------------------------------------------------------------

const positive = (value: number | null | undefined): number | null => {
  const number = toFinite(value);
  return number !== null && number > 0 ? number : null;
};

export function blueprintSheet(input: SheetInput): BlueprintSheet {
  const geometry = drawingGeometry(input);
  const body = loft(geometry);
  const { def, L, W, H, R, arch, frontAxleX, rearAxleX } = body;
  const { published } = geometry;

  const tyreWidth = def.tyreWidth * 1000;
  const tyreR = R * 0.96;
  const typicalTrack = W - tyreWidth - 75;
  // A published track is used only if it fits the published width.
  const trackFrom = (value: number | null | undefined) => {
    const track = positive(value);
    return track !== null && track + tyreWidth * 0.5 <= W ? track : null;
  };
  const frontTrackMm = trackFrom(input.frontTrackMm);
  const rearTrackMm = trackFrom(input.rearTrackMm);
  const frontTrack = frontTrackMm ?? typicalTrack;
  const rearTrack = rearTrackMm ?? typicalTrack;

  // ---------------------------------------------------------- end-on views
  const stations = new Set<number>();
  for (let i = 0; i <= 90; i += 1) stations.add(0.5 - 0.5 * Math.cos((Math.PI * i) / 90));
  for (const axle of [frontAxleX, rearAxleX]) {
    for (let k = -4; k <= 4; k += 1) stations.add((axle + (k / 4) * arch * 1.05) / L);
  }
  // The roof's highest knot, so the silhouette reaches the published height.
  const peak = def.roof.reduce(
    (best, k) => (k[1] > best[1] ? k : best),
    def.roof[0] ?? [0.5, 1],
  );
  stations.add(peak[0]);
  const us = [...stations].filter((u) => u >= 0 && u <= 1).sort((a, b) => a - b);
  const sections = us.map((u) => body.section(u));
  const halves = sections.map((s) => body.halfSection(s));

  const frontStartU = (frontAxleX + arch) / L;
  const rearStartU = (rearAxleX - arch) / L;
  const silhouetteHalf = endOnOutline(halves);
  const noseHalf = endOnOutline(
    halves.filter((_, i) => (sections[i]?.u ?? 0) >= frontStartU),
  );
  const tailHalf = endOnOutline(
    halves.filter((_, i) => (sections[i]?.u ?? 1) <= rearStartU),
  );
  const silhouette = mirrored(silhouetteHalf);

  const silhouetteTop = silhouetteHalf.reduce((m, p) => Math.max(m, p[1]), 0);
  const widestAt = silhouetteHalf.reduce<P>(
    (best, p) => (p[0] > best[0] ? p : best),
    [0, 0],
  );

  // Mirrors (body-geometry.ts): on the glass band just behind the cowl.
  const mirrorU = def.cowl - 0.028;
  const mirrorSection = body.section(mirrorU);
  const [mirrorBaseX, mirrorBaseY] = body.glassAt(mirrorSection, 0.1);
  const mirror = {
    cx: mirrorBaseX + 100,
    cy: mirrorBaseY + 45,
    x: mirrorU * L - 20,
    rx: 75,
    ry: 55,
    rz: 105,
  };

  // Half-extent of everything drawn in an end-on view.
  const endHalf = Math.max(W / 2, mirror.cx + mirror.rx, frontTrack / 2 + tyreWidth / 2);

  // --------------------------------------------------- sheet layout (mm)
  const sideRows: DimensionId[] = [];
  if (published.wheelbase) sideRows.push("wheelbase");
  if (published.length) sideRows.push("length");
  const endRows = (track: boolean): DimensionId[] => {
    const rows: DimensionId[] = [];
    if (track) rows.push("frontTrack");
    if (published.width) rows.push("width");
    return rows;
  };
  const frontRows = endRows(frontTrackMm !== null);
  const rearRows = endRows(rearTrackMm !== null);
  const below = (rows: number) =>
    rows === 0 ? EDGE : FIRST + ROW * (rows - 1) + LABEL + 60;
  const beside = (drawn: boolean) => (drawn ? FIRST + LABEL + 60 : EDGE);

  const col1Need = Math.max(L + 2 * EDGE, EDGE + L + beside(published.width));
  const col2Need = endHalf + EDGE + endHalf + beside(published.height);
  const col1 = Math.max(col1Need, col2Need * 2);
  const col2 = col1 / 2;
  const x1 = -EDGE - (col1 - col1Need) / 2;
  const x2 = -(endHalf + EDGE) - (col2 - col2Need) / 2;

  const row1 = HEAD + H + Math.max(below(sideRows.length), below(frontRows.length));
  const y1 = -(HEAD + H);
  const topHalf = Math.max(W / 2, mirror.cx + mirror.rx) + EDGE;
  const rearNeed = HEAD + H + below(rearRows.length);
  const row2 = Math.max(topHalf * 2, rearNeed);

  // --------------------------------------------------------- dimensions
  const dimension = (
    id: DimensionId,
    abbr: string,
    valueMm: number,
    orientation: "horizontal" | "vertical",
    from: Point,
    to: Point,
    extensions: (readonly [Point, Point])[],
    placement: "on-line" | "beside" = "on-line",
  ): SheetDimension => ({
    id,
    abbr,
    valueMm,
    orientation,
    from,
    to,
    extensions,
    label:
      placement === "beside"
        ? [to[0], (from[1] + to[1]) / 2]
        : [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2],
    placement,
  });
  const figure = (value: number | null | undefined) => positive(value) ?? 0;

  // ============================================================ SIDE VIEW
  const sideMap: Map2 = ([x, y]) => [x, -y];
  const side: SheetShape[] = [];
  side.push({ role: "ground", d: `M${f1(-EDGE * 0.6)} 0H${f1(L + EDGE * 0.6)}` });
  side.push({
    role: "body",
    d: polyPath(simplify([...geometry.side.body], 0.8), sideMap),
  });

  // Side glass, split at the B-pillar, with the slanted rear edge of the
  // 3D model's windows (car-shape.ts windowsOf).
  const glassFront = def.cowl - 0.004;
  const glassRearAt = (t: number) => lerp(def.glassRear[0], def.glassRear[1], t);
  const glassPane = (rearAt: (t: number) => number, front: number): Point[] => {
    const at = (u: number, t: number): Point => {
      const s = body.section(u);
      return [u * L, s.belt + t * s.glass];
    };
    const n = 24;
    const bottom: Point[] = [];
    const top: Point[] = [];
    for (let k = 0; k <= n; k += 1) {
      const ub = lerp(rearAt(0.07), front, k / n);
      bottom.push(at(ub, 0.07));
      const ut = lerp(rearAt(0.93), front, k / n);
      top.push(at(ut, 0.93));
    }
    return [...bottom, ...top.reverse()];
  };
  const pillar = def.bPillar;
  const panes =
    pillar !== null
      ? [
          glassPane(glassRearAt, pillar - 0.013),
          glassPane(() => pillar + 0.013, glassFront),
        ]
      : [glassPane(glassRearAt, glassFront)];
  for (const pane of panes) side.push({ role: "glass", d: polyPath(pane, sideMap) });

  // Door shut lines and handles, where the 3D model paints them.
  const doorFront = def.cowl - 0.012;
  const doorRear = pillar ?? def.glassRear[0];
  const fourDoor =
    pillar !== null &&
    geometry.style !== "gt" &&
    geometry.style !== "sports-rear" &&
    geometry.style !== "supercar";
  const cuts = fourDoor
    ? [doorFront, doorRear, def.glassRear[0] + 0.012]
    : [doorFront, doorRear];
  const shut: string[] = [];
  for (const u of cuts) {
    const s = body.section(u);
    const [, mid] = body.sideAt(s, 0.55);
    const half = (s.belt - s.bottom) * 0.45;
    const lo = Math.max(s.sill + 25, mid - half);
    const hi = Math.min(s.belt - 15, mid + half);
    if (hi > lo) shut.push(`M${f1(u * L)} ${f1(-lo)}V${f1(-hi)}`);
  }
  const handles = fourDoor
    ? [doorRear + 0.03, def.glassRear[0] + 0.04]
    : [doorRear + 0.035];
  for (const u of handles) {
    const [, y] = body.sideAt(body.section(u), 0.84);
    shut.push(polyPath(roundedRect(u * L, y, 130, 24, 12), sideMap));
  }
  if (shut.length > 0) side.push({ role: "detail", d: shut.join(" ") });

  // Mirror housing.
  side.push({ role: "body", d: ellipsePath(mirror.x, -mirror.cy, mirror.rz, mirror.ry) });

  // Roof rails on the styles that carry them.
  if (def.roofRails) {
    const rail: Point[] = [];
    const start = def.rearGlass[1] + 0.02;
    const end = def.roofFront - 0.04;
    for (let k = 0; k <= 16; k += 1) {
      const u = lerp(start, end, k / 16);
      const [, y] = body.topAt(body.section(u), 0.075);
      rail.push([u * L, y + (k === 0 || k === 16 ? 12 : 40)]);
    }
    side.push({ role: "detail", d: polyPath(rail, sideMap, false) });
  }

  // A rear wing, only when one is catalogued for the variant.
  const wingSection = body.section(0.075);
  const wingY = wingSection.belt + wingSection.crown + 300;
  const wingX = wingSection.x + 50;
  if (input.rearWing) {
    const blade: Point[] = [
      [wingX + 165, wingY],
      [wingX + 70, wingY + 34],
      [wingX - 110, wingY + 30],
      [wingX - 160, wingY + 12],
      [wingX - 160, wingY - 4],
      [wingX + 165, wingY],
    ];
    side.push({ role: "detail", d: polyPath(blade, sideMap) });
    side.push({
      role: "detail",
      d: `M${f1(wingX + 20)} ${f1(-wingY)}V${f1(-(wingY - 300))}`,
    });
  }

  // Wheels: tyre, rim, hub and spokes in the style's pattern.
  const spokeCount = def.spokes === "six" ? 6 : def.spokes === "mesh" ? 10 : 5;
  for (const wheel of geometry.side.wheels) {
    const cx = wheel.cx;
    const cy = -wheel.cy;
    side.push({ role: "tyre", d: ellipsePath(cx, cy, wheel.r, wheel.r) });
    const hub = wheel.rim * 0.2;
    const spokes: string[] = [
      ellipsePath(cx, cy, wheel.rim, wheel.rim),
      ellipsePath(cx, cy, hub, hub),
    ];
    for (let k = 0; k < spokeCount; k += 1) {
      const base = (k / spokeCount) * Math.PI * 2 - Math.PI / 2;
      const offsets = def.spokes === "twin" ? [-0.09, 0.09] : [0];
      for (const offset of offsets) {
        const a = base + offset;
        spokes.push(
          `M${f1(cx + Math.cos(a) * hub)} ${f1(cy + Math.sin(a) * hub)}L${f1(cx + Math.cos(a) * wheel.rim * 0.93)} ${f1(cy + Math.sin(a) * wheel.rim * 0.93)}`,
        );
      }
    }
    side.push({ role: "detail", d: spokes.join(" ") });
  }

  // Axle centre lines, down to the wheelbase line (or just below the ground).
  const sideRowY = (id: DimensionId) => FIRST + ROW * sideRows.indexOf(id);
  const axleBottom = published.wheelbase ? sideRowY("wheelbase") + OVERSHOOT : 120;
  const axleTop = -(tyreR * 2 + 120);
  side.push({
    role: "centre",
    d: [rearAxleX, frontAxleX]
      .map((x) => `M${f1(x)} ${f1(axleTop)}V${f1(axleBottom)}`)
      .join(" "),
  });

  const sideDims: SheetDimension[] = [];
  if (published.wheelbase) {
    const y = sideRowY("wheelbase");
    sideDims.push(
      dimension(
        "wheelbase",
        "WB",
        figure(input.wheelbaseMm),
        "horizontal",
        [rearAxleX, y],
        [frontAxleX, y],
        [],
      ),
    );
  }
  if (published.length) {
    const y = sideRowY("length");
    sideDims.push(
      dimension(
        "length",
        "L",
        figure(input.lengthMm),
        "horizontal",
        [0, y],
        [L, y],
        [
          [
            [0, GAP],
            [0, y + OVERSHOOT],
          ],
          [
            [L, GAP],
            [L, y + OVERSHOOT],
          ],
        ],
      ),
    );
  }
  if (published.groundClearance) {
    const x = rearAxleX + (frontAxleX - rearAxleX) * 0.32;
    sideDims.push(
      dimension(
        "groundClearance",
        "GC",
        figure(input.groundClearanceMm),
        "vertical",
        [x, 0],
        [x, -geometry.groundClearance],
        [],
        "beside",
      ),
    );
  }

  // ============================================================= TOP VIEW
  const topMap: Map2 = ([x, y]) => [x, -y];
  const top: SheetShape[] = [];
  top.push({
    role: "centre",
    d: `M${f1(-EDGE * 0.6)} 0H${f1(L + EDGE * 0.6)}`,
  });
  // Tyres, hidden under the body.
  const planTyres = [
    { x: rearAxleX, track: rearTrack },
    { x: frontAxleX, track: frontTrack },
  ].flatMap(({ x, track }) =>
    [1, -1].map((sideSign) =>
      polyPath(
        roundedRect(x, (sideSign * track) / 2, tyreR * 2, tyreWidth, tyreWidth * 0.18),
        topMap,
      ),
    ),
  );
  top.push({ role: "hidden", d: planTyres.join(" ") });
  top.push({
    role: "body",
    d: polyPath(simplify([...geometry.plan.outline], 0.8), topMap),
  });
  if (geometry.plan.cabin.length > 0) {
    top.push({
      role: "glass",
      d: polyPath(simplify([...geometry.plan.cabin], 0.8), topMap),
    });
    // The roof panel between the rear glass and the windscreen header, at
    // the roof edge; what shows either side of it is side glass.
    const cabinUpper = geometry.plan.cabin.slice(
      0,
      Math.ceil(geometry.plan.cabin.length / 2),
    );
    const from = def.rearGlass[1];
    const to = def.roofFront;
    if (to > from) {
      // Rounded at the corners, as the cabin outline is (drawing.ts).
      const zone = (to - from) * 0.14;
      const roof: Point[] = [];
      const n = 28;
      for (let k = 0; k <= n; k += 1) {
        const u = lerp(from, to, k / n);
        const t = Math.min(1, Math.min(u - from, to - u) / zone);
        const taper = lerp(0.74, 1, Math.sqrt(1 - (1 - t) * (1 - t)));
        const half = Math.min(body.section(u).edge, yAtX(cabinUpper, u * L) - 15) * taper;
        roof.push([u * L, Math.max(0, half)]);
      }
      const lower = roof.map(([x, y]): Point => [x, -y]).reverse();
      top.push({ role: "body", d: polyPath([...roof, ...lower], topMap) });
    }
  }
  // A pickup's bed wears a tonneau cover (as the 3D model draws it).
  if (def.bedCover && def.deck > 0.05) {
    const cover: Point[] = [];
    const n = 16;
    for (let k = 0; k <= n; k += 1) {
      const u = lerp(0.02, def.deck - 0.01, k / n);
      cover.push([u * L, body.section(u).edge * 0.97]);
    }
    const lower = cover.map(([x, y]): Point => [x, -y]).reverse();
    top.push({ role: "detail", d: polyPath([...cover, ...lower], topMap) });
  }
  // Mirrors.
  top.push({
    role: "body",
    d: [1, -1]
      .map((s) => ellipsePath(mirror.x, -s * mirror.cx, mirror.rz, mirror.rx))
      .join(" "),
  });
  if (def.roofRails) {
    const rails: string[] = [];
    for (const t of [0.075, 0.925]) {
      const rail: Point[] = [];
      for (let k = 0; k <= 16; k += 1) {
        const u = lerp(def.rearGlass[1] + 0.02, def.roofFront - 0.04, k / 16);
        const [y] = body.topAt(body.section(u), t);
        rail.push([u * L, y]);
      }
      rails.push(polyPath(rail, topMap, false));
    }
    top.push({ role: "detail", d: rails.join(" ") });
  }
  if (input.rearWing) {
    top.push({
      role: "detail",
      d: polyPath(roundedRect(wingX, 0, 330, W * 0.84, 20), topMap),
    });
  }
  top.push({
    role: "centre",
    d: [rearAxleX, frontAxleX]
      .map((x) => `M${f1(x)} ${f1(-(W / 2 + 90))}V${f1(W / 2 + 90)}`)
      .join(" "),
  });

  const topDims: SheetDimension[] = [];
  if (published.width) {
    const x = L + FIRST;
    const widestX = geometry.plan.outline.reduce<Point>(
      (best, p) => (p[1] > best[1] ? p : best),
      [0, 0],
    )[0];
    topDims.push(
      dimension(
        "width",
        "W",
        figure(input.widthMm),
        "vertical",
        [x, W / 2],
        [x, -W / 2],
        [
          [
            [widestX + GAP, -W / 2],
            [x + OVERSHOOT, -W / 2],
          ],
          [
            [widestX + GAP, W / 2],
            [x + OVERSHOOT, W / 2],
          ],
        ],
      ),
    );
  }

  // ======================================================= FRONT / REAR
  const endView = (
    end: "front" | "rear",
  ): { shapes: SheetShape[]; dims: SheetDimension[] } => {
    // Seen from behind, the car's right side is on the viewer's left.
    const map: Map2 = end === "front" ? ([x, y]) => [x, -y] : ([x, y]) => [-x, -y];
    const nearHalf = end === "front" ? noseHalf : tailHalf;
    const track = end === "front" ? frontTrack : rearTrack;
    const shapes: SheetShape[] = [];
    const heightDim = published.height;
    const hx = endHalf + FIRST;
    shapes.push({
      role: "ground",
      d: `M${f1(-(endHalf + EDGE * 0.6))} 0H${f1(heightDim ? hx + OVERSHOOT : endHalf + EDGE * 0.6)}`,
    });
    shapes.push({ role: "body", d: polyPath(silhouette, map) });
    // Mirrors stand out beyond the body, both ends.
    shapes.push({
      role: "body",
      d: [1, -1]
        .map((s) => {
          const [cx, cy] = map([s * mirror.cx, mirror.cy]);
          return ellipsePath(cx, cy, mirror.rx, mirror.ry);
        })
        .join(" "),
    });
    shapes.push({
      role: "detail",
      d: [1, -1]
        .map((s) => {
          const [ax, ay] = map([s * mirrorBaseX, mirrorBaseY + 12]);
          const [bx] = map([s * (mirror.cx - mirror.rx * 0.8), 0]);
          return `M${f1(ax)} ${f1(ay)}H${f1(bx)}`;
        })
        .join(" "),
    });
    // Tyres, then the nearer part of the body over the top of them.
    shapes.push({
      role: "tyre",
      d: [1, -1]
        .map((s) =>
          polyPath(
            roundedRect((s * track) / 2, tyreR, tyreWidth, tyreR * 2, tyreWidth * 0.22),
            map,
          ),
        )
        .join(" "),
    });
    if (nearHalf.length > 0)
      shapes.push({ role: "near", d: polyPath(mirrored(nearHalf), map) });

    const details: string[] = [];
    if (end === "front") {
      // Windscreen, from the cowl up to the header.
      const base = def.cowl - 0.004;
      const header = def.roofFront + 0.002;
      if (header < base) {
        const screen: Point[] = [];
        const n = 16;
        for (let k = 0; k <= n; k += 1)
          screen.push(body.topAt(body.section(base), lerp(0.035, 0.965, k / n)));
        for (let k = 1; k <= 8; k += 1)
          screen.push(body.topAt(body.section(lerp(base, header, k / 8)), 0.965));
        for (let k = 1; k <= n; k += 1)
          screen.push(body.topAt(body.section(header), lerp(0.965, 0.035, k / n)));
        for (let k = 1; k < 8; k += 1)
          screen.push(body.topAt(body.section(lerp(header, base, k / 8)), 0.035));
        shapes.push({ role: "glass", d: polyPath(screen, map) });
      }

      // Headlights and grille: the 3D model's decals, drawn as outlines.
      const nose = body.section(1 - def.capFront - 0.02);
      const style = def.headlights;
      const headY = nose.belt - (style === "round" ? 60 : 70);
      const reach = halfWidthOf(noseHalf, headY) - 30;
      for (const s of reach > 250 ? [1, -1] : []) {
        if (style === "round") {
          const r = 0.47 * 230;
          const cx = Math.min(W * 0.31, reach - r);
          const [x, y] = map([s * cx, headY]);
          details.push(ellipsePath(x, y, r, r), ellipsePath(x, y, r * 0.8, r * 0.8));
          continue;
        }
        const size =
          style === "blade" ? [460, 100] : style === "square" ? [340, 200] : [440, 130];
        const [dw, dh] = size as [number, number];
        const h = dh * (style === "blade" ? 0.42 : style === "square" ? 0.9 : 0.62);
        const radius = style === "square" ? dh * 0.12 : dh * 0.35;
        const roll = style === "blade" ? -s * 0.18 : style === "slim" ? -s * 0.06 : 0;
        // Keep the lamp on the nose: the decal wraps, the drawing clips.
        const outer = Math.min(W * 0.31 + (dw * 0.96) / 2, reach);
        const inner = W * 0.31 - (dw * 0.96) / 2;
        const w = Math.max(80, outer - inner);
        details.push(
          polyPath(roundedRect(s * (inner + w / 2), headY, w, h, radius, roll), map),
        );
      }
      const grilleY = lerp(nose.bottom, nose.belt, def.grille === "tall" ? 0.52 : 0.36);
      const grilleH = (nose.belt - nose.bottom) * (def.grille === "tall" ? 0.78 : 0.62);
      const openings: [number, number, number, number, number][] =
        def.grille === "closed"
          ? [[0.2, 0.64, 0.6, 0.2, 0.1]]
          : def.grille === "intakes"
            ? [
                [0.04, 0.34, 0.25, 0.52, 0.2],
                [0.36, 0.5, 0.28, 0.36, 0.16],
                [0.71, 0.34, 0.25, 0.52, 0.2],
              ]
            : def.grille === "tall"
              ? [
                  [0.22, 0.04, 0.56, 0.58, 0.1],
                  [0.28, 0.72, 0.44, 0.2, 0.08],
                ]
              : [
                  [0.3, 0.1, 0.4, 0.26, 0.1],
                  [0.14, 0.56, 0.72, 0.32, 0.14],
                ];
      const grilleW = W * 0.8;
      for (const [u, v, w, h, r] of openings) {
        const cy = grilleY + (0.5 - (v + h / 2)) * grilleH;
        // Clip each opening to the nose at its height, as the decal is.
        const half = halfWidthOf(noseHalf, cy) - 40;
        const left = Math.max((u - 0.5) * grilleW, -half);
        const right = Math.min((u + w - 0.5) * grilleW, half);
        if (right - left > 40) {
          details.push(
            polyPath(
              roundedRect((left + right) / 2, cy, right - left, h * grilleH, r * grilleH),
              map,
            ),
          );
        }
      }
    } else {
      // Rear glass.
      const [lo, hi] = def.rearGlass;
      if (hi > lo) {
        const pane: Point[] = [];
        const n = 16;
        for (let k = 0; k <= n; k += 1)
          pane.push(body.topAt(body.section(lo), lerp(0.075, 0.925, k / n)));
        for (let k = 1; k <= 6; k += 1)
          pane.push(body.topAt(body.section(lerp(lo, hi, k / 6)), 0.925));
        for (let k = 1; k <= n; k += 1)
          pane.push(body.topAt(body.section(hi), lerp(0.925, 0.075, k / n)));
        for (let k = 1; k < 6; k += 1)
          pane.push(body.topAt(body.section(lerp(hi, lo, k / 6)), 0.075));
        shapes.push({ role: "glass", d: polyPath(pane, map) });
      }
      // Tail lamps: a full-width bar on the styles that use one, else a pair.
      const tail = body.section(def.capRear + 0.02);
      const tailY = tail.belt - 90;
      const reach = halfWidthOf(tailHalf, tailY) - 25;
      const bar =
        geometry.style === "sports-rear" ||
        geometry.style === "electric-sedan" ||
        geometry.style === "supercar";
      if (bar) {
        const w = Math.min(W * 0.94, reach * 2);
        if (w > 100) details.push(polyPath(roundedRect(0, tailY, w, 36, 18), map));
      } else {
        const outer = Math.min(W * 0.34 + 200, reach);
        const inner = W * 0.34 - 200;
        const w = outer - inner;
        if (w > 80) {
          for (const s of [1, -1])
            details.push(
              polyPath(roundedRect(s * (inner + w / 2), tailY, w, 60, 18), map),
            );
        }
      }
      // Lower trim panel.
      const trimY = tail.bottom + 70;
      const trimReach = halfWidthOf(tailHalf, trimY) - 40;
      const trimW = Math.min(W * 0.72, trimReach * 2);
      if (trimW > 100) details.push(polyPath(roundedRect(0, trimY, trimW, 130, 30), map));
      // Off-roaders carry the spare wheel on the tailgate.
      if (def.spareWheel) {
        const s = body.section(0.012);
        const cy = (s.belt + s.bottom) / 2 + 120;
        const [x, y] = map([0, cy]);
        shapes.push({ role: "tyre", d: ellipsePath(x, y, R, R) });
        details.push(ellipsePath(x, y, R * def.rimRatio, R * def.rimRatio));
      }
      if (input.rearWing) {
        const blade = roundedRect(0, wingY + 15, W * 0.84, 40, 12);
        const post = (s: number) =>
          polyPath(roundedRect(s * W * 0.2, wingY - 150, 18, 300, 4), map);
        const plate = (s: number) =>
          polyPath(roundedRect(s * W * 0.42, wingY + 10, 12, 130, 4), map);
        shapes.push({
          role: "near",
          d: [polyPath(blade, map), post(1), post(-1), plate(1), plate(-1)].join(" "),
        });
      }
    }
    if (details.length > 0) shapes.push({ role: "detail", d: details.join(" ") });
    shapes.push({
      role: "centre",
      d: `M0 ${f1(90)}V${f1(-(silhouetteTop + 120))}`,
    });

    const rows = end === "front" ? frontRows : rearRows;
    const trackMm = end === "front" ? frontTrackMm : rearTrackMm;
    const dims: SheetDimension[] = [];
    const rowY = (id: DimensionId) => FIRST + ROW * rows.indexOf(id);
    if (trackMm !== null) {
      const y = rowY("frontTrack");
      dims.push(
        dimension(
          end === "front" ? "frontTrack" : "rearTrack",
          "T",
          trackMm,
          "horizontal",
          [-track / 2, y],
          [track / 2, y],
          [
            [
              [-track / 2, GAP],
              [-track / 2, y + OVERSHOOT],
            ],
            [
              [track / 2, GAP],
              [track / 2, y + OVERSHOOT],
            ],
          ],
        ),
      );
    }
    if (published.width) {
      const y = rowY("width");
      dims.push(
        dimension(
          "width",
          "W",
          figure(input.widthMm),
          "horizontal",
          [-W / 2, y],
          [W / 2, y],
          [
            [
              [-W / 2, -widestAt[1] + GAP],
              [-W / 2, y + OVERSHOOT],
            ],
            [
              [W / 2, -widestAt[1] + GAP],
              [W / 2, y + OVERSHOOT],
            ],
          ],
        ),
      );
    }
    if (heightDim) {
      const roofHalf = halfWidthOf(silhouetteHalf, silhouetteTop - 4);
      dims.push(
        dimension(
          "height",
          "H",
          figure(input.heightMm),
          "vertical",
          [hx, 0],
          [hx, -H],
          [
            [
              [roofHalf + GAP, -H],
              [hx + OVERSHOOT, -H],
            ],
          ],
        ),
      );
    }
    return { shapes, dims };
  };

  const front = endView("front");
  const rear = endView("rear");

  // ---------------------------------------------------------------- views
  const box = (x: number, y: number, width: number, height: number) => ({
    x,
    y,
    width,
    height,
  });
  const sideBox = box(x1, y1, col1, row1);
  const frontBox = box(x2, y1, col2, row1);
  const topBox = box(x1, -row2 / 2, col1, row2);
  const rearBox = box(x2, -(HEAD + H) - (row2 - rearNeed) / 2, col2, row2);
  const view = (
    id: ViewId,
    title: string,
    viewBox: SheetView["viewBox"],
    shapes: SheetShape[],
    dimensions: SheetDimension[],
  ): SheetView => ({
    id,
    title,
    viewBox,
    shapes: shapes.filter((shape) => shape.d.length > 0),
    dimensions,
    grid: { minor: gridPaths(viewBox, 100), major: gridPaths(viewBox, 500) },
  });

  const missing = (["length", "width", "height", "wheelbase"] as const).filter(
    (name) => !published[name],
  );

  return {
    style: geometry.style,
    bodyType: geometry.bodyType,
    published: {
      ...published,
      frontTrack: frontTrackMm !== null,
      rearTrack: rearTrackMm !== null,
    },
    missing,
    length: L,
    width: W,
    height: H,
    wheelbase: geometry.wheelbase,
    views: [
      view("side", "Side view", sideBox, side, sideDims),
      view("front", "Front view", frontBox, front.shapes, front.dims),
      view("top", "Top view", topBox, top, topDims),
      view("rear", "Rear view", rearBox, rear.shapes, rear.dims),
    ],
    outlines: {
      side: geometry.side.body,
      top: geometry.plan.outline,
      front: silhouette,
      tyreCentres: { front: frontTrack / 2, rear: rearTrack / 2 },
    },
  };
}
