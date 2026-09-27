import * as THREE from "three";
import type { BodyType } from "@/types/domain";
import {
  FALLBACK_SIZE,
  STYLES,
  clamp01,
  falloff,
  isBodyType,
  lerp,
  monotone,
  pickStyle,
  smooth,
  type BodyStyle,
  type EnginePosition,
  type Powertrain,
  type StyleDef,
} from "./car-styles";

export type { BodyStyle, EnginePosition, Powertrain } from "./car-styles";

/**
 * The shape of the procedural car.
 *
 * The body is a LOFT: a closed cross-section swept along the car's length.
 * Every station along the length evaluates the same cross-section recipe with
 * different heights and widths, which come from three side-view curves (the
 * sill, the beltline and the roofline) and a plan-view curve (the width). That
 * is how real cars are drawn — a side elevation and a plan — and it is what
 * gives the result a continuous, curved surface instead of a stack of boxes.
 *
 * Everything here is pure geometry with no React, so it can be reasoned about
 * (and measured) on its own. Real published dimensions drive the size; the
 * body style drives the proportions.
 */

export type ShapeInput = {
  bodyType: string | null;
  enginePosition?: EnginePosition | null;
  powertrain: Powertrain;
  length_mm?: number | null;
  width_mm?: number | null;
  height_mm?: number | null;
  wheelbase_mm?: number | null;
  ground_clearance_mm?: number | null;
};

export type CarSpec = {
  style: BodyStyle;
  def: StyleDef;
  length: number;
  width: number;
  height: number;
  wheelbase: number;
  groundClearance: number;
  wheelRadius: number;
  tyreWidth: number;
  rimRadius: number;
  /** Centre-to-centre distance of the tyres. */
  track: number;
  frontAxleZ: number;
  rearAxleZ: number;
  archRadius: number;
  /** Nose and tail z, for placing things at the ends. */
  noseZ: number;
  tailZ: number;
};

const mm = (value: number | null | undefined): number | null =>
  value !== null && value !== undefined && value > 0 ? value / 1000 : null;

export function resolveCarSpec(input: ShapeInput): CarSpec {
  const bodyType: BodyType = isBodyType(input.bodyType) ? input.bodyType : "coupe";
  const style = pickStyle(bodyType, input.enginePosition, input.powertrain);
  const def = STYLES[style];
  const fallback = FALLBACK_SIZE[bodyType];

  const length = mm(input.length_mm) ?? fallback.length;
  const width = mm(input.width_mm) ?? fallback.width;
  const height = mm(input.height_mm) ?? fallback.height;
  // A wheelbase longer than the car would be nonsense; clamp defensively.
  const wheelbase = Math.min(mm(input.wheelbase_mm) ?? fallback.wheelbase, length * 0.72);
  const groundClearance = Math.min(
    mm(input.ground_clearance_mm) ?? def.groundClearance,
    height * 0.16,
  );

  // Very low cars cannot physically carry the default wheel: the arch would
  // cut through the beltline. Real supercars run shallow tyres for this reason.
  const wheelRadius = Math.min(def.wheelRadius, height * 0.285);
  const tyreWidth = def.tyreWidth;
  const rimRadius = wheelRadius * def.rimRatio;
  const track = width - tyreWidth - 0.075;

  const overhang = length - wheelbase;
  const noseZ = length / 2;
  const tailZ = -length / 2;
  const frontAxleZ = noseZ - overhang * def.frontOverhang;
  const rearAxleZ = frontAxleZ - wheelbase;

  return {
    style,
    def,
    length,
    width,
    height,
    wheelbase,
    groundClearance,
    wheelRadius,
    tyreWidth,
    rimRadius,
    track,
    frontAxleZ,
    rearAxleZ,
    archRadius: wheelRadius * 1.12,
    noseZ,
    tailZ,
  };
}

// ---------------------------------------------------------------------------
// Cross-section
// ---------------------------------------------------------------------------

export type Band = "under" | "side" | "glass" | "top";

/** Samples per control segment of each band. Fixed, so every station shares one topology. */
const UNDER_SEGMENTS = 4; // per half
const SIDE_WEIGHTS = [1, 2, 2, 3, 3, 2] as const;
const GLASS_WEIGHTS = [2, 2] as const;
const TOP_WEIGHTS = [1, 3, 4] as const; // edge -> centre, mirrored for the other half

type P2 = [number, number];

export type Station = {
  u: number;
  z: number;
  /** Underside (lifted into the wheel arches), beltline and glasshouse height. */
  bottom: number;
  /** Underside before any arch lift: the line the body side is drawn from. */
  sill: number;
  belt: number;
  glass: number;
  halfWidth: number;
  /** Half-width of the glasshouse at the roof edge. */
  edge: number;
  crown: number;
  /** 0 on the bonnet and deck, 1 under the roof. */
  roofness: number;
  /** Inside a wheel-arch opening. */
  arch: boolean;
};

/**
 * Catmull-Rom through `points`, sampled with `weights[i]` samples per segment.
 * Returns samples including both ends.
 */
function sampleCatmull(points: readonly P2[], weights: readonly number[]): P2[] {
  const out: P2[] = [];
  const n = points.length;
  const at = (i: number): P2 => {
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
  };

  for (let segment = 0; segment < n - 1; segment += 1) {
    const p0 = at(segment - 1);
    const p1 = at(segment);
    const p2 = at(segment + 1);
    const p3 = at(segment + 2);
    const count = weights[segment] ?? 1;
    for (let k = 0; k < count; k += 1) {
      const t = k / count;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 *
        (2 * b +
          (-a + c) * t +
          (2 * a - 5 * b + 4 * c - d) * t2 +
          (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(at(n - 1));
  return out;
}

/** Evaluate the same spline at a continuous parameter t in [0, 1]. */
function evalCatmull(points: readonly P2[], weights: readonly number[], t: number): P2 {
  const total = weights.reduce((sum, w) => sum + w, 0);
  let target = clamp01(t) * total;
  let segment = 0;
  while (segment < weights.length - 1 && target > (weights[segment] ?? 1)) {
    target -= weights[segment] ?? 1;
    segment += 1;
  }
  const local = clamp01(target / (weights[segment] ?? 1));
  const n = points.length;
  const at = (i: number): P2 => {
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
  };
  const p0 = at(segment - 1);
  const p1 = at(segment);
  const p2 = at(segment + 1);
  const p3 = at(segment + 2);
  const tt = local;
  const t2 = tt * tt;
  const t3 = t2 * tt;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 *
    (2 * b +
      (-a + c) * tt +
      (2 * a - 5 * b + 4 * c - d) * t2 +
      (-a + 3 * b - 3 * c + d) * t3);
  return [f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])];
}

/**
 * The body, as a set of evaluable curves. Built once per car.
 */
export class BodyShape {
  readonly spec: CarSpec;
  private readonly beltAt: (u: number) => number;
  private readonly roofAt: (u: number) => number;

  constructor(spec: CarSpec) {
    this.spec = spec;
    const { def } = spec;
    this.beltAt = monotone(def.belt);
    // Pin the glasshouse ends to the beltline so the windscreen and rear
    // glass grow out of the body instead of starting at a step.
    const beltAtDeck = this.beltAt(def.deck);
    const beltAtCowl = this.beltAt(def.cowl);
    this.roofAt = monotone([[def.deck, beltAtDeck], ...def.roof, [def.cowl, beltAtCowl]]);
  }

  zOf(u: number): number {
    return lerp(this.spec.tailZ, this.spec.noseZ, u);
  }

  uOf(z: number): number {
    return (z - this.spec.tailZ) / this.spec.length;
  }

  /** Height of the wheel-arch opening at z, or -Infinity outside the arches. */
  archTop(z: number): number {
    const { frontAxleZ, rearAxleZ, archRadius, wheelRadius } = this.spec;
    let top = -Infinity;
    for (const axle of [frontAxleZ, rearAxleZ]) {
      const dz = z - axle;
      if (Math.abs(dz) < archRadius) {
        top = Math.max(top, wheelRadius + Math.sqrt(archRadius * archRadius - dz * dz));
      }
    }
    return top;
  }

  /** Smooth bump centred on each axle, for fender flares. */
  private flare(z: number): number {
    const { frontAxleZ, rearAxleZ, archRadius, def } = this.spec;
    const bump = (axle: number) => {
      const s = Math.abs(z - axle) / (archRadius * 1.9);
      return s >= 1 ? 0 : Math.pow(Math.cos((s * Math.PI) / 2), 2);
    };
    return def.flareFront * bump(frontAxleZ) + def.flareRear * bump(rearAxleZ);
  }

  station(u: number): Station {
    const { spec } = this;
    const { def, height: H, width, groundClearance: gc } = spec;
    const z = this.zOf(u);

    // --- side view -------------------------------------------------------
    let belt = this.beltAt(u) * H;
    const arch = this.archTop(z);
    // The fender has to clear the arch; where it would not, it rises over the
    // wheel instead — which is exactly the muscular hump real low cars have.
    if (arch > 0) belt = Math.max(belt, arch + 0.06);

    const inGlasshouse = u > def.deck && u < def.cowl;
    const roofTop = inGlasshouse ? this.roofAt(u) * H : 0;
    const glass = inGlasshouse ? Math.max(0, roofTop - def.roofCrown - belt) : 0;
    const roofness = smooth(glass / 0.12);
    let crown = lerp(def.hoodCrown, def.roofCrown, roofness);

    // Underside: flat between the axles, rising at the overhangs.
    let bottom = gc;
    const frontStart = spec.frontAxleZ + spec.archRadius;
    const rearStart = spec.rearAxleZ - spec.archRadius;
    if (z > frontStart) {
      bottom += def.chin * H * smooth((z - frontStart) / (spec.noseZ - frontStart));
    } else if (z < rearStart) {
      bottom += def.tailLift * H * smooth((rearStart - z) / (rearStart - spec.tailZ));
    }
    let sill = bottom;
    bottom = Math.max(bottom, arch);

    // --- plan view -------------------------------------------------------
    let halfWidth = (width / 2) * (1 + this.flare(z));
    const sFront = (u - (1 - def.planFront)) / def.planFront;
    const sRear = (def.planRear - u) / def.planRear;
    halfWidth *= falloff(sFront, def.planFrontExp) * falloff(sRear, def.planRearExp);

    // --- rounding of the tips in side view ------------------------------
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
    if (belt < bottom + 0.01) belt = bottom + 0.01;

    const edge = halfWidth * lerp(0.86, def.roofWidth, roofness);
    return {
      u,
      z,
      bottom,
      sill,
      belt,
      glass,
      halfWidth,
      edge,
      crown,
      roofness,
      arch: arch > 0,
    };
  }

  // --- band control points (right-hand side, x >= 0) ----------------------
  // Public so the shell and the glass can sample exactly the same curves.

  sidePoints(s: Station): P2[] {
    const { sill, belt, halfWidth: hw } = s;
    // The profile is drawn from the sill, never from the arch-lifted
    // underside. Rescaling it into the shorter span over a wheel would make
    // the fender bulge in and out along the car, which shows up at once as
    // rippling reflections. Instead the samples that fall inside the arch are
    // pushed up onto it afterwards (clampToArch), forming the flat ceiling of
    // the wheel well and leaving the surface above it untouched.
    const dL = belt - sill;
    const belly = this.spec.def.belly;
    const points: P2[] = [
      [hw * belly * 0.8, sill],
      [hw * belly * 0.97, sill + 0.1 * dL],
      [hw * belly, sill + 0.24 * dL],
      [hw * 0.985, sill + 0.47 * dL],
      [hw, sill + 0.7 * dL],
      [hw * 0.988, sill + 0.9 * dL],
      [hw * 0.958, belt],
    ];
    return points;
  }

  /**
   * Push a sampled side-band point up onto the wheel-arch ceiling. Applied to
   * samples, never to control points: clamping a control point would reshape
   * the spline above the arch as well.
   */
  clampToArch(s: Station, [x, y]: P2): P2 {
    return [x, Math.min(s.belt, Math.max(y, s.bottom))];
  }

  glassPoints(s: Station): P2[] {
    const start: P2 = [s.halfWidth * 0.958, s.belt];
    const end: P2 = [s.edge, s.belt + s.glass];
    // A slight outward bow: side glass is curved, not flat.
    const bow = 0.012 * s.roofness;
    return [start, [lerp(start[0], end[0], 0.5) + bow, lerp(start[1], end[1], 0.5)], end];
  }

  /** Right half of the top band, from the roof edge to the centre-line. */
  topPoints(s: Station): P2[] {
    const y = s.belt + s.glass;
    return [
      [s.edge, y],
      [s.edge * 0.93, y + s.crown * 0.3],
      [s.edge * 0.55, y + s.crown * 0.86],
      [0, y + s.crown],
    ];
  }

  underPoints(s: Station): P2[] {
    const x = s.halfWidth * this.spec.def.belly * 0.8;
    return [
      [-x, s.bottom],
      [x, s.bottom],
    ];
  }

  /**
   * A point on the surface. `t` runs along the band: under (left to right),
   * side (sill to belt), glass (belt to roof edge), top (right edge to left
   * edge). `side` mirrors the side and glass bands to the left.
   */
  point(u: number, band: Band, t: number, side: 1 | -1 = 1): THREE.Vector3 {
    const s = this.station(u);
    let p: P2;
    if (band === "under") {
      const [a, b] = this.underPoints(s);
      p = [lerp(a?.[0] ?? 0, b?.[0] ?? 0, t), s.bottom];
    } else if (band === "side") {
      p = this.clampToArch(s, evalCatmull(this.sidePoints(s), SIDE_WEIGHTS, t));
      p[0] *= side;
    } else if (band === "glass") {
      p = evalCatmull(this.glassPoints(s), GLASS_WEIGHTS, t);
      p[0] *= side;
    } else {
      const half = this.topPoints(s);
      if (t <= 0.5) p = evalCatmull(half, TOP_WEIGHTS, t * 2);
      else {
        const q = evalCatmull(half, TOP_WEIGHTS, (1 - t) * 2);
        p = [-q[0], q[1]];
      }
    }
    return new THREE.Vector3(p[0], p[1], s.z);
  }

  /** Stations along the length: dense at the tips, the arches and the glass edges. */
  stations(lowDetail: boolean): number[] {
    const { spec } = this;
    const { def } = spec;
    const base = lowDetail ? 70 : 130;
    const values = new Set<number>();
    for (let i = 0; i <= base; i += 1) {
      // Cosine spacing packs stations toward both tips, where the surface
      // turns fastest.
      values.add(0.5 - 0.5 * Math.cos((Math.PI * i) / base));
    }
    const add = (u: number) => {
      if (u > 0 && u < 1) values.add(Math.round(u * 1e6) / 1e6);
    };

    // Arch edges need a pair of stations a hair apart so the opening gets a
    // clean vertical edge rather than a slope.
    const archSteps = lowDetail ? 10 : 18;
    for (const axle of [spec.frontAxleZ, spec.rearAxleZ]) {
      const r = spec.archRadius;
      add(this.uOf(axle - r - 0.004));
      add(this.uOf(axle + r + 0.004));
      for (let k = 0; k <= archSteps; k += 1) {
        const angle = Math.PI * (k / archSteps);
        add(this.uOf(axle - r * Math.cos(angle) * 0.9995));
      }
    }
    for (const u of [
      def.deck,
      def.cowl,
      def.roofFront,
      ...def.rearGlass,
      ...def.glassRear,
    ]) {
      add(u);
    }
    if (def.bPillar !== null) add(def.bPillar);
    return [...values].sort((a, b) => a - b);
  }
}

// ---------------------------------------------------------------------------
// Shell mesh
// ---------------------------------------------------------------------------

/** Material slots of the shell geometry, in group order. */
export const SHELL_PAINT = 0;
export const SHELL_UNDER = 1;
export const SHELL_TRIM = 2;

type Window = {
  band: "glass" | "top";
  /**
   * Whether the shell is opened up behind the glass. Only straight-edged
   * openings are: a slanted edge cut from a grid of faces comes out as a
   * staircase, which shows through tinted glass.
   */
  cut: boolean;
  /** Inside test in (u, t) space, t along the band. */
  contains: (u: number, t: number, margin: number) => boolean;
};

/** The glazed openings, shared by the shell (to cut holes) and the glass. */
export function windowsOf(shape: BodyShape): Window[] {
  const { def } = shape.spec;
  const windows: Window[] = [];

  const glassRearAt = (t: number) => lerp(def.glassRear[0], def.glassRear[1], t);
  const front = def.cowl - 0.004;
  const pillar = def.bPillar;
  const pillarHalf = 0.012;

  // Side glass, split at the B-pillar when there is one.
  windows.push({
    band: "glass",
    cut: false,
    contains: (u, t, m) => {
      if (t < 0.07 + m || t > 0.93 - m) return false;
      if (u < glassRearAt(t) + m || u > front - m) return false;
      if (pillar !== null && Math.abs(u - pillar) < pillarHalf + m) return false;
      return true;
    },
  });

  // Windscreen.
  windows.push({
    band: "top",
    cut: true,
    contains: (u, t, m) =>
      u > def.roofFront + 0.004 + m &&
      u < def.cowl - 0.006 - m &&
      t > 0.05 + m &&
      t < 0.95 - m,
  });

  // Rear glass.
  windows.push({
    band: "top",
    cut: true,
    contains: (u, t, m) =>
      u > def.rearGlass[0] + m &&
      u < def.rearGlass[1] - m &&
      t > 0.09 + m &&
      t < 0.91 - m,
  });

  return windows;
}

/**
 * Build the body shell: one indexed geometry with paint, underside and trim
 * groups, and holes where the glass goes so the cabin can be seen through it.
 */
export function buildShell(shape: BodyShape, lowDetail: boolean): THREE.BufferGeometry {
  const us = shape.stations(lowDetail);
  const { def } = shape.spec;
  const windows = windowsOf(shape);

  const positions: number[] = [];
  const buckets: [number[], number[], number[]] = [[], [], []];

  type BandLayout = {
    band: Band;
    side: 1 | -1;
    count: number;
    /** Samples for station s. */
    sample: (s: Station) => P2[];
  };

  const sideSamples = (s: Station) =>
    sampleCatmull(shape.sidePoints(s), SIDE_WEIGHTS).map((p) => shape.clampToArch(s, p));
  const glassSamples = (s: Station) => sampleCatmull(shape.glassPoints(s), GLASS_WEIGHTS);
  const topSamples = (s: Station) => {
    const half = sampleCatmull(shape.topPoints(s), TOP_WEIGHTS);
    const mirrored = half
      .slice(0, -1)
      .reverse()
      .map(([x, y]) => [-x, y] as P2);
    return [...half, ...mirrored];
  };
  const underSamples = (s: Station) => {
    const [a, b] = shape.underPoints(s);
    const out: P2[] = [];
    const total = UNDER_SEGMENTS * 2;
    for (let k = 0; k <= total; k += 1) {
      out.push([lerp(a?.[0] ?? 0, b?.[0] ?? 0, k / total), s.bottom]);
    }
    return out;
  };

  const mirror = (samples: P2[]) => samples.map(([x, y]) => [-x, y] as P2).reverse();

  // Sample counts come from the samplers themselves, so the index buffer can
  // never disagree with the vertex layout.
  const probe = shape.station(0.5);
  const sideCount = sideSamples(probe).length;
  const glassCount = glassSamples(probe).length;
  const topCount = topSamples(probe).length;

  // Ring order runs around the section so every quad winds outward:
  // underside left→right, right side up, top right→left, left side down.
  const layout: BandLayout[] = [
    { band: "under", side: 1, count: underSamples(probe).length, sample: underSamples },
    { band: "side", side: 1, count: sideCount, sample: sideSamples },
    { band: "glass", side: 1, count: glassCount, sample: glassSamples },
    { band: "top", side: 1, count: topCount, sample: topSamples },
    {
      band: "glass",
      side: -1,
      count: glassCount,
      sample: (s) => mirror(glassSamples(s)),
    },
    { band: "side", side: -1, count: sideCount, sample: (s) => mirror(sideSamples(s)) },
  ];

  const stationData = us.map((u) => shape.station(u));
  const bandOffsets: number[] = [];
  let ringSize = 0;
  for (const band of layout) {
    bandOffsets.push(ringSize);
    ringSize += band.count;
  }

  for (const s of stationData) {
    for (const band of layout) {
      for (const [x, y] of band.sample(s)) positions.push(x, y, s.z);
    }
  }

  // t along a band for sample k, in the band's own "outward" orientation:
  // for mirrored bands the samples run backwards.
  const bandT = (band: BandLayout, k: number) => {
    const t = k / (band.count - 1);
    return band.side === 1 ? t : 1 - t;
  };

  for (let i = 0; i < stationData.length - 1; i += 1) {
    const s0 = stationData[i];
    const s1 = stationData[i + 1];
    if (!s0 || !s1) continue;
    const uMid = (s0.u + s1.u) / 2;

    layout.forEach((band, b) => {
      const offset = bandOffsets[b] ?? 0;
      for (let k = 0; k < band.count - 1; k += 1) {
        const a = i * ringSize + offset + k;
        const bIdx = a + 1;
        const d = a + ringSize;
        const c = d + 1;

        const tA = bandT(band, k);
        const tB = bandT(band, k + 1);

        // Cut the glazed openings. A face is removed only when all four
        // corners are inside, so the glass always overlaps the hole edge.
        const cut = windows.some(
          (w) =>
            w.cut &&
            w.band === band.band &&
            [s0.u, s1.u].every(
              (u) => w.contains(u, tA, 0.002) && w.contains(u, tB, 0.002),
            ),
        );
        if (cut) continue;

        let slot = SHELL_PAINT;
        if (band.band === "under") slot = SHELL_UNDER;
        // The near-vertical wall where the body steps up into a wheel arch is
        // the arch's front or rear edge. Painted, it reads as a slab; dark, it
        // reads as the opening it is.
        if (band.band !== "top" && s0.arch !== s1.arch) slot = SHELL_UNDER;
        // Pickup bed: a black tonneau cover over the load area.
        if (
          def.bedCover &&
          band.band === "top" &&
          uMid > 0.02 &&
          uMid < def.deck - 0.01
        ) {
          slot = SHELL_TRIM;
        }
        buckets[slot]?.push(a, bIdx, d, bIdx, c, d);
      }
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute(
    "normal",
    new THREE.Float32BufferAttribute(
      gridNormals(positions, stationData.length, ringSize, layout, bandOffsets),
      3,
    ),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      shellUvs(positions, stationData.length, ringSize),
      2,
    ),
  );
  const index: number[] = [];
  buckets.forEach((bucket, slot) => {
    geometry.addGroup(index.length, bucket.length, slot);
    index.push(...bucket);
  });
  geometry.setIndex(index);
  return geometry;
}

/**
 * Texture coordinates in metres: along the car, and around each section by
 * arc length. Only fine surface detail (the paint's metallic flake) is mapped
 * onto the shell, so an even physical scale matters and seams do not.
 */
function shellUvs(positions: number[], stationCount: number, ringSize: number): number[] {
  const uvs: number[] = [];
  for (let i = 0; i < stationCount; i += 1) {
    let arc = 0;
    for (let k = 0; k < ringSize; k += 1) {
      const base = (i * ringSize + k) * 3;
      if (k > 0) {
        arc += Math.hypot(
          (positions[base] ?? 0) - (positions[base - 3] ?? 0),
          (positions[base + 1] ?? 0) - (positions[base - 2] ?? 0),
        );
      }
      uvs.push(positions[base + 2] ?? 0, arc);
    }
  }
  return uvs;
}

/**
 * Surface normals from the grid's own tangents.
 *
 * `computeVertexNormals` averages the normals of the faces around a vertex.
 * The stations here are deliberately unevenly spaced (packed at the tips and
 * around the arches), and a thin quad that twists even slightly produces two
 * triangles whose normals disagree — so face averaging makes the normals
 * wobble from one station to the next, which a clear-coated surface shows at
 * once as stripes in its reflections. A central difference along the ring
 * and along the length is the surface's actual tangent plane, whatever the
 * spacing, so the shading stays as smooth as the shape.
 */
function gridNormals(
  positions: number[],
  stationCount: number,
  ringSize: number,
  layout: { count: number }[],
  offsets: number[],
): number[] {
  const normals = new Array<number>(positions.length).fill(0);
  const at = (i: number, k: number, out: THREE.Vector3) => {
    const base = (i * ringSize + k) * 3;
    return out.set(
      positions[base] ?? 0,
      positions[base + 1] ?? 0,
      positions[base + 2] ?? 0,
    );
  };
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const du = new THREE.Vector3();
  const dt = new THREE.Vector3();
  const n = new THREE.Vector3();

  for (let i = 0; i < stationCount; i += 1) {
    const iPrev = Math.max(0, i - 1);
    const iNext = Math.min(stationCount - 1, i + 1);
    layout.forEach((band, bandIndex) => {
      const start = offsets[bandIndex] ?? 0;
      for (let j = 0; j < band.count; j += 1) {
        const k = start + j;
        const kPrev = start + Math.max(0, j - 1);
        const kNext = start + Math.min(band.count - 1, j + 1);
        du.subVectors(at(iNext, k, a), at(iPrev, k, b));
        dt.subVectors(at(i, kNext, a), at(i, kPrev, b));
        n.crossVectors(dt, du);
        if (n.lengthSq() < 1e-14) {
          // The tips, where every point of the section coincides: the surface
          // faces straight along the car.
          n.set(0, 0, i > stationCount / 2 ? 1 : -1);
        }
        n.normalize();
        const base = (i * ringSize + k) * 3;
        normals[base] = n.x;
        normals[base + 1] = n.y;
        normals[base + 2] = n.z;
      }
    });
  }
  return normals;
}

/**
 * A curved patch lying on one band of the body, offset outward along the
 * surface normal. `outline(s, t)` maps the unit square to (u, tBand).
 */
export function buildPatch(
  shape: BodyShape,
  band: Band,
  side: 1 | -1,
  outline: (s: number, t: number) => [number, number],
  segments: [number, number],
  offset: number,
): THREE.BufferGeometry {
  const [ns, nt] = segments;
  const positions: number[] = [];
  const index: number[] = [];

  // Which way is "out" for this band. Good enough to orient a normal: every
  // patch sits on a surface that faces broadly this way.
  const outward =
    band === "top"
      ? new THREE.Vector3(0, 1, 0)
      : band === "under"
        ? new THREE.Vector3(0, -1, 0)
        : new THREE.Vector3(side, 0, 0);

  const probe = (u: number, t: number) => shape.point(u, band, t, side);

  for (let j = 0; j <= nt; j += 1) {
    for (let i = 0; i <= ns; i += 1) {
      const [u, t] = outline(i / ns, j / nt);
      const p = probe(u, t);
      // Surface normal by finite differences in (u, t).
      const du = probe(Math.min(1, u + 0.002), t).sub(probe(Math.max(0, u - 0.002), t));
      const dt = probe(u, Math.min(1, t + 0.01)).sub(probe(u, Math.max(0, t - 0.01)));
      const normal = new THREE.Vector3().crossVectors(dt, du).normalize();
      if (normal.dot(outward) < 0) normal.negate();
      p.addScaledVector(normal, offset);
      positions.push(p.x, p.y, p.z);
    }
  }

  const row = ns + 1;
  for (let j = 0; j < nt; j += 1) {
    for (let i = 0; i < ns; i += 1) {
      const a = j * row + i;
      const b = a + 1;
      const c = a + row + 1;
      const d = a + row;
      index.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  geometry.computeVertexNormals();

  // The (s, t) layout decides the winding; flip it if the patch faces inward.
  const normals = geometry.getAttribute("normal");
  const mid = Math.floor(normals.count / 2);
  const facing = new THREE.Vector3(
    normals.getX(mid),
    normals.getY(mid),
    normals.getZ(mid),
  );
  if (facing.dot(outward) < 0) {
    const flipped: number[] = [];
    for (let k = 0; k < index.length; k += 3) {
      flipped.push(index[k] ?? 0, index[k + 2] ?? 0, index[k + 1] ?? 0);
    }
    geometry.setIndex(flipped);
    geometry.computeVertexNormals();
  }
  return geometry;
}
