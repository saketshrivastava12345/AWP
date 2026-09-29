import {
  FALLBACK_SIZE,
  STYLES,
  falloff,
  isBodyType,
  lerp,
  monotone,
  pickStyle,
  smooth,
  type BodyStyle,
} from "@/components/3d/car-styles";
import type { BodyType, EnginePosition, PowertrainKind } from "@/types/domain";
import { toFinite } from "./figures";

/**
 * Geometry for the dimensioned technical drawing: a side elevation and a plan
 * view of the car's body style, drawn at the car's PUBLISHED size.
 *
 * The profiles are the same ones behind the card silhouettes (carSilhouette)
 * and the 3D car (car-shape.ts), evaluated here at real dimensions instead of
 * being stretched afterwards: stretching a typical-size silhouette would put
 * the axles in the wrong place and turn the wheel arches into ellipses, and
 * then a wheelbase line drawn between the wheels would not be to scale.
 * Sizing follows resolveCarSpec() so the drawing and the 3D car agree.
 *
 * Every dimension that is not published falls back to the body style's
 * typical proportions, and `published` records which ones did — the drawing
 * component draws a dimension line only for a published figure.
 *
 * Units are millimetres. Side elevation: x runs from the tail (0) to the nose
 * (length), y up from the ground. Plan: x as above, y across from the centre
 * line (−width/2 … +width/2).
 */

export type DrawingInput = {
  bodyType: string | null;
  powertrain: PowertrainKind;
  enginePosition: EnginePosition | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  wheelbaseMm: number | null;
  groundClearanceMm: number | null;
};

export type Point = readonly [number, number];

export type DrawingGeometry = {
  style: BodyStyle;
  bodyType: BodyType;
  /** Which of the sizes below are published figures, as opposed to typical proportions. */
  published: {
    length: boolean;
    width: boolean;
    height: boolean;
    wheelbase: boolean;
    groundClearance: boolean;
  };
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  groundClearance: number;
  side: {
    /** Closed outline of the body, wheel arches cut in. */
    body: Point[];
    /** Closed outline of the side glass, or empty. */
    glass: Point[];
    /** Rear then front. `r` is the tyre, `rim` the wheel. */
    wheels: { cx: number; cy: number; r: number; rim: number }[];
    rearAxleX: number;
    frontAxleX: number;
  };
  plan: {
    /** Closed outline of the body seen from above. */
    outline: Point[];
    /** Closed outline of the glasshouse seen from above, or empty. */
    cabin: Point[];
    /** Tyre footprints (hidden under the body in a top view). */
    wheels: { x: number; y: number; w: number; h: number }[];
  };
};

const SAMPLES = 120;
/** How far the fender must stand above the arch opening, as in car-shape.ts. */
const FENDER_CLEARANCE = 60;

const positive = (value: number | null | undefined): number | null => {
  const number = toFinite(value);
  return number !== null && number > 0 ? number : null;
};

export function drawingGeometry(input: DrawingInput): DrawingGeometry {
  const bodyType: BodyType = isBodyType(input.bodyType) ? input.bodyType : "coupe";
  const style = pickStyle(bodyType, input.enginePosition, input.powertrain);
  const def = STYLES[style];
  const typical = FALLBACK_SIZE[bodyType];

  // --- Overall size ---------------------------------------------------------
  const publishedLength = positive(input.lengthMm);
  const publishedHeight = positive(input.heightMm);
  const publishedWidth = positive(input.widthMm);

  const L = publishedLength ?? typical.length * 1000;
  const H = publishedHeight ?? typical.height * 1000;
  const W = publishedWidth ?? typical.width * 1000;

  // A wheelbase implausibly close to the length is a data error; it is not
  // drawn to scale (and so gets no dimension line) rather than drawn wrongly.
  const publishedWheelbase = positive(input.wheelbaseMm);
  const wheelbaseUsable = publishedWheelbase !== null && publishedWheelbase <= L * 0.72;
  const WB = wheelbaseUsable
    ? publishedWheelbase
    : L * (typical.wheelbase / typical.length);

  const publishedGc = positive(input.groundClearanceMm);
  const gcUsable = publishedGc !== null && publishedGc <= H * 0.3;
  const GC = gcUsable ? publishedGc : Math.min(def.groundClearance * 1000, H * 0.16);

  // --- Wheels and axles (resolveCarSpec) ------------------------------------
  const R = Math.min(def.wheelRadius * 1000, H * 0.285);
  const arch = R * 1.12;
  const overhang = L - WB;
  const frontAxleX = L - overhang * def.frontOverhang;
  const rearAxleX = frontAxleX - WB;

  // --- Side elevation (carSilhouette, at real size) --------------------------
  const belt = monotone(def.belt);
  const roof = monotone([
    [def.deck, belt(def.deck)],
    ...def.roof,
    [def.cowl, belt(def.cowl)],
  ]);

  const archTop = (x: number) => {
    let top = Number.NEGATIVE_INFINITY;
    for (const axle of [frontAxleX, rearAxleX]) {
      const dx = x - axle;
      if (Math.abs(dx) < arch) top = Math.max(top, R + Math.sqrt(arch * arch - dx * dx));
    }
    return top;
  };

  const cap = (u: number, y: number) => {
    const s = Math.max(
      (u - (1 - def.capFront)) / def.capFront,
      (def.capRear - u) / def.capRear,
    );
    if (s <= 0) return y;
    const tip = (u > 0.5 ? def.nose : def.tail) * H;
    return tip + (y - tip) * falloff(s, def.capExp);
  };

  const beltHeight = (u: number) => {
    // Low cars carry the fender over the wheel, exactly as the 3D body does.
    const over = archTop(u * L);
    return Math.max(belt(u) * H, over > 0 ? over + FENDER_CLEARANCE : 0);
  };

  const top = (u: number) => {
    const b = beltHeight(u);
    const y = u > def.deck && u < def.cowl ? Math.max(b, roof(u) * H) : b;
    return cap(u, y);
  };

  const bottom = (u: number) => {
    const x = u * L;
    let y = GC;
    const frontStart = frontAxleX + arch;
    const rearStart = rearAxleX - arch;
    if (x > frontStart) y += def.chin * H * smooth((x - frontStart) / (L - frontStart));
    else if (x < rearStart) y += def.tailLift * H * smooth((rearStart - x) / rearStart);
    y = Math.max(y, archTop(x));
    return cap(u, y);
  };

  // Cosine-spaced stations, plus dense ones through each arch so the openings
  // stay round.
  const stations = new Set<number>();
  for (let i = 0; i <= SAMPLES; i += 1)
    stations.add(0.5 - 0.5 * Math.cos((Math.PI * i) / SAMPLES));
  for (const axle of [frontAxleX, rearAxleX]) {
    for (let k = 0; k <= 24; k += 1) {
      stations.add((axle - arch * Math.cos((Math.PI * k) / 24) * 0.999) / L);
    }
    stations.add((axle - arch - 2) / L);
    stations.add((axle + arch + 2) / L);
  }
  const us = [...stations].filter((u) => u >= 0 && u <= 1).sort((a, b) => a - b);

  const upper: Point[] = us.map((u) => [u * L, top(u)]);
  const lower: Point[] = [...us].reverse().map((u) => {
    const x = u * L;
    // The underside may never cross the top line.
    return [x, Math.min(bottom(u), top(u) - 10)];
  });
  const body = [...upper, ...lower];

  // Side glass: a little below the roof line, a little above the belt.
  const glassStations = us.filter((u) => u >= def.glassRear[0] && u <= def.cowl - 0.012);
  const glass: Point[] =
    glassStations.length > 1
      ? [
          ...glassStations.map((u): Point => {
            const lift = (Math.max(belt(u), roof(u)) - belt(u)) * H;
            return [u * L, belt(u) * H + Math.max(0, lift - 45)];
          }),
          ...[...glassStations].reverse().map((u): Point => [u * L, belt(u) * H + 20]),
        ]
      : [];

  const wheelR = R * 0.96;
  const wheels = [rearAxleX, frontAxleX].map((axle) => ({
    cx: axle,
    cy: R,
    r: wheelR,
    rim: wheelR * def.rimRatio,
  }));

  // --- Plan view (the width curve of car-shape.ts, normalised to the width) --
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
  // The published width is the widest point of the body, so scale to it.
  const widest = Math.max(...us.map(rawHalfWidth));
  const halfWidth = (u: number) =>
    widest > 0 ? (rawHalfWidth(u) * (W / 2)) / widest : 0;

  const outline: Point[] = [
    ...us.map((u): Point => [u * L, halfWidth(u)]),
    ...[...us].reverse().map((u): Point => [u * L, -halfWidth(u)]),
  ];

  // The glasshouse from above: where the roof stands clear of the belt. It
  // follows the body's plan curve but not the fender flares (glass does not
  // bulge over the wheels), narrows by the style's tumblehome, and its ends
  // round off into the windscreen and rear-glass bases.
  const bodyHalfWidth = (u: number) => {
    const sFront = (u - (1 - def.planFront)) / def.planFront;
    const sRear = (def.planRear - u) / def.planRear;
    const raw =
      (W / 2) * falloff(sFront, def.planFrontExp) * falloff(sRear, def.planRearExp);
    return widest > 0 ? (raw * (W / 2)) / widest : 0;
  };
  const cabinStations = us.filter((u) => {
    if (u <= def.deck || u >= def.cowl) return false;
    return roof(u) * H - def.roofCrown * 1000 - belt(u) * H > 15;
  });
  const cabinStart = cabinStations[0] ?? 0;
  const cabinEnd = cabinStations[cabinStations.length - 1] ?? 0;
  const roundZone = Math.max(1e-6, (cabinEnd - cabinStart) * 0.22);
  // Seen from above, the glasshouse is mostly roof: a constant inset a little
  // wider than the roof itself. (A factor that varied with glass height would
  // widen the shallow ends into "ears".)
  const cabinWidth = lerp(def.roofWidth, 0.86, 0.25);
  const cabinHalf = (u: number) => {
    const t = Math.min(1, Math.min(u - cabinStart, cabinEnd - u) / roundZone);
    const taper = lerp(0.62, 1, Math.sqrt(1 - (1 - t) * (1 - t)));
    return bodyHalfWidth(u) * cabinWidth * taper;
  };
  const cabin: Point[] =
    cabinStations.length > 1
      ? [
          ...cabinStations.map((u): Point => [u * L, cabinHalf(u)]),
          ...[...cabinStations].reverse().map((u): Point => [u * L, -cabinHalf(u)]),
        ]
      : [];

  const tyreWidth = def.tyreWidth * 1000;
  const track = W - tyreWidth - 75;
  const planWheels = [rearAxleX, frontAxleX].flatMap((axle) =>
    [1, -1].map((side) => ({
      x: axle - wheelR,
      y: side * (track / 2) - tyreWidth / 2,
      w: wheelR * 2,
      h: tyreWidth,
    })),
  );

  return {
    style,
    bodyType,
    published: {
      length: publishedLength !== null,
      width: publishedWidth !== null,
      height: publishedHeight !== null,
      wheelbase: wheelbaseUsable,
      groundClearance: gcUsable,
    },
    length: L,
    width: W,
    height: H,
    wheelbase: WB,
    groundClearance: GC,
    side: { body, glass, wheels, rearAxleX, frontAxleX },
    plan: { outline, cabin, wheels: planWheels },
  };
}

/** Closed SVG path from points, rounded to 0.1 mm. */
export function pathFrom(
  points: readonly Point[],
  transform: (p: Point) => Point,
): string {
  if (points.length === 0) return "";
  const parts = points.map((point, index) => {
    const [x, y] = transform(point);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return `${parts.join(" ")} Z`;
}
