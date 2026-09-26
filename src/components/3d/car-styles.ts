import type { BodyType } from "@/types/domain";

/**
 * The drawings behind the procedural car: one side elevation and plan per
 * body style, plus the curve helpers that evaluate them.
 *
 * Kept free of three.js on purpose. The 3D car (car-shape.ts) and the 2D
 * silhouettes on the collection grid are both drawn from these profiles, and
 * the grid is server-rendered — so this module must be cheap to import there.
 */

export type EnginePosition = "front" | "mid" | "rear";
export type Powertrain = "combustion" | "electric" | "hybrid";

export type BodyStyle =
  | "supercar"
  | "sports-rear"
  | "gt"
  | "sedan"
  | "electric-sedan"
  | "hatchback"
  | "wagon"
  | "suv"
  | "mpv"
  | "pickup"
  | "offroad";

/** A point on a side-view curve: [u, h], u from tail (0) to nose (1), h as a fraction of height. */
export type Knot = readonly [number, number];

export type StyleDef = {
  /** Window-sill and fender-top line. Outside the glasshouse it is the top of the body. */
  belt: readonly Knot[];
  /** Top centre-line of the glasshouse, between `deck` and `cowl`. */
  roof: readonly Knot[];
  /** Where the glasshouse meets the rear deck and the bonnet. */
  deck: number;
  cowl: number;
  /** The windscreen runs from `roofFront` down to `cowl`. */
  roofFront: number;
  /** Rear glass on the top surface. */
  rearGlass: readonly [number, number];
  /** Rear edge of the side glass, at the beltline and at the roof edge. */
  glassRear: readonly [number, number];
  /** Pillar between the two side windows, or null for one window per side. */
  bPillar: number | null;
  /** Share of the total overhang that sits ahead of the front axle. */
  frontOverhang: number;
  /** Height of the nose and tail tips, fraction of height. */
  nose: number;
  tail: number;
  /** Rise of the underside toward the tips, fraction of height. */
  chin: number;
  tailLift: number;
  /** Plan-view rounding: zone length (fraction of length) and superellipse exponent. */
  planFront: number;
  planFrontExp: number;
  planRear: number;
  planRearExp: number;
  /** Side-view rounding of the tips: zone length and superellipse exponent. */
  capFront: number;
  capRear: number;
  /** High = a squarer, cut-off tail; low = a rounder, tapering one. */
  capExp: number;
  /** Roof half-width relative to body half-width. Lower = more tumblehome. */
  roofWidth: number;
  /** Sill half-width relative to body half-width. */
  belly: number;
  /** Centre-line rise of the bonnet above its edges, metres. Negative when the fenders stand proud. */
  hoodCrown: number;
  roofCrown: number;
  /** Fender flare over each axle, fraction of half-width. */
  flareFront: number;
  flareRear: number;
  wheelRadius: number;
  tyreWidth: number;
  /** Rim radius as a fraction of the tyre radius. */
  rimRatio: number;
  groundClearance: number;
  spokes: "twin" | "five" | "six" | "mesh";
  spoiler: "none" | "lip" | "ducktail";
  roofRails: boolean;
  bedCover: boolean;
  spareWheel: boolean;
  headlights: "round" | "slim" | "blade" | "square";
  grille: "intakes" | "wide" | "tall" | "closed";
};

export const STYLES: Record<BodyStyle, StyleDef> = {
  // Mid-engined: cab-forward canopy, short low nose, long rear deck.
  supercar: {
    belt: [
      [0, 0.56],
      [0.03, 0.63],
      [0.12, 0.655],
      [0.24, 0.665],
      [0.36, 0.65],
      [0.48, 0.625],
      [0.6, 0.6],
      [0.72, 0.575],
      [0.84, 0.545],
      [0.93, 0.5],
      [1, 0.4],
    ],
    roof: [
      [0.25, 0.73],
      [0.32, 0.84],
      [0.39, 0.93],
      [0.46, 0.985],
      [0.52, 1],
      [0.58, 0.985],
      [0.635, 0.905],
      [0.69, 0.775],
      [0.735, 0.655],
    ],
    deck: 0.19,
    cowl: 0.775,
    roofFront: 0.585,
    rearGlass: [0.3, 0.44],
    glassRear: [0.4, 0.47],
    bPillar: null,
    frontOverhang: 0.47,
    nose: 0.31,
    tail: 0.54,
    chin: 0.05,
    tailLift: 0.17,
    planFront: 0.13,
    planFrontExp: 2.2,
    planRear: 0.07,
    planRearExp: 3.4,
    capFront: 0.03,
    capRear: 0.025,
    capExp: 3,
    roofWidth: 0.62,
    belly: 0.9,
    hoodCrown: -0.03,
    roofCrown: 0.03,
    flareFront: 0.02,
    flareRear: 0.045,
    wheelRadius: 0.345,
    tyreWidth: 0.3,
    rimRatio: 0.77,
    groundClearance: 0.1,
    spokes: "twin",
    spoiler: "ducktail",
    roofRails: false,
    bedCover: false,
    spareWheel: false,
    headlights: "blade",
    grille: "intakes",
  },

  // Rear-engined sports car: short bonnet between raised fenders, fastback roof
  // running almost to the tail, wide rear hips.
  "sports-rear": {
    belt: [
      [0, 0.48],
      [0.04, 0.565],
      [0.12, 0.615],
      [0.24, 0.645],
      [0.34, 0.652],
      [0.46, 0.632],
      [0.58, 0.606],
      [0.7, 0.592],
      [0.8, 0.59],
      [0.87, 0.575],
      [0.93, 0.525],
      [0.975, 0.445],
      [1, 0.37],
    ],
    roof: [
      [0.18, 0.7],
      [0.26, 0.82],
      [0.34, 0.915],
      [0.42, 0.975],
      [0.5, 1],
      [0.565, 0.99],
      [0.62, 0.925],
      [0.67, 0.795],
      [0.705, 0.68],
    ],
    deck: 0.12,
    cowl: 0.735,
    roofFront: 0.585,
    rearGlass: [0.2, 0.4],
    glassRear: [0.33, 0.43],
    bPillar: 0.445,
    frontOverhang: 0.47,
    nose: 0.33,
    tail: 0.45,
    chin: 0.1,
    tailLift: 0.16,
    planFront: 0.13,
    planFrontExp: 2.3,
    planRear: 0.08,
    planRearExp: 3,
    capFront: 0.03,
    capRear: 0.025,
    capExp: 2.6,
    roofWidth: 0.68,
    belly: 0.9,
    hoodCrown: -0.035,
    roofCrown: 0.03,
    flareFront: 0.015,
    flareRear: 0.05,
    wheelRadius: 0.345,
    tyreWidth: 0.29,
    rimRatio: 0.76,
    groundClearance: 0.11,
    spokes: "five",
    spoiler: "ducktail",
    roofRails: false,
    bedCover: false,
    spareWheel: false,
    headlights: "round",
    grille: "intakes",
  },

  // Front-engined coupé or fastback: long bonnet, cabin set back.
  gt: {
    belt: [
      [0, 0.49],
      [0.04, 0.585],
      [0.12, 0.625],
      [0.25, 0.64],
      [0.4, 0.635],
      [0.55, 0.615],
      [0.68, 0.6],
      [0.8, 0.59],
      [0.9, 0.565],
      [0.96, 0.52],
      [1, 0.44],
    ],
    roof: [
      [0.15, 0.71],
      [0.22, 0.82],
      [0.3, 0.92],
      [0.38, 0.978],
      [0.45, 1],
      [0.51, 0.99],
      [0.56, 0.93],
      [0.61, 0.8],
      [0.64, 0.7],
    ],
    deck: 0.09,
    cowl: 0.665,
    roofFront: 0.53,
    rearGlass: [0.15, 0.34],
    glassRear: [0.28, 0.36],
    bPillar: 0.43,
    frontOverhang: 0.44,
    nose: 0.38,
    tail: 0.46,
    chin: 0.08,
    tailLift: 0.14,
    planFront: 0.12,
    planFrontExp: 2.5,
    planRear: 0.08,
    planRearExp: 3,
    capFront: 0.03,
    capRear: 0.03,
    capExp: 3,
    roofWidth: 0.7,
    belly: 0.9,
    hoodCrown: 0.02,
    roofCrown: 0.03,
    flareFront: 0.015,
    flareRear: 0.035,
    wheelRadius: 0.35,
    tyreWidth: 0.28,
    rimRatio: 0.74,
    groundClearance: 0.12,
    spokes: "twin",
    spoiler: "lip",
    roofRails: false,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "wide",
  },

  // Three-box saloon: separate boot deck.
  sedan: {
    belt: [
      [0, 0.52],
      [0.04, 0.615],
      [0.12, 0.655],
      [0.3, 0.66],
      [0.5, 0.64],
      [0.68, 0.62],
      [0.82, 0.605],
      [0.93, 0.58],
      [0.98, 0.53],
      [1, 0.46],
    ],
    roof: [
      [0.21, 0.76],
      [0.26, 0.88],
      [0.32, 0.955],
      [0.38, 0.99],
      [0.48, 1],
      [0.56, 0.99],
      [0.61, 0.935],
      [0.66, 0.8],
    ],
    deck: 0.17,
    cowl: 0.705,
    roofFront: 0.585,
    rearGlass: [0.19, 0.37],
    glassRear: [0.26, 0.33],
    bPillar: 0.47,
    frontOverhang: 0.46,
    nose: 0.42,
    tail: 0.5,
    chin: 0.08,
    tailLift: 0.12,
    planFront: 0.1,
    planFrontExp: 2.8,
    planRear: 0.07,
    planRearExp: 3.2,
    capFront: 0.03,
    capRear: 0.03,
    capExp: 3,
    roofWidth: 0.76,
    belly: 0.92,
    hoodCrown: 0.025,
    roofCrown: 0.035,
    flareFront: 0.012,
    flareRear: 0.02,
    wheelRadius: 0.34,
    tyreWidth: 0.255,
    rimRatio: 0.7,
    groundClearance: 0.13,
    spokes: "five",
    spoiler: "lip",
    roofRails: false,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "wide",
  },

  // Battery-electric saloon: no engine to package, so a short nose and a
  // cabin pushed forward under one long arc.
  "electric-sedan": {
    belt: [
      [0, 0.5],
      [0.04, 0.6],
      [0.12, 0.64],
      [0.3, 0.645],
      [0.5, 0.625],
      [0.68, 0.6],
      [0.82, 0.575],
      [0.92, 0.545],
      [0.97, 0.5],
      [1, 0.43],
    ],
    roof: [
      [0.16, 0.73],
      [0.23, 0.85],
      [0.31, 0.94],
      [0.39, 0.985],
      [0.48, 1],
      [0.57, 0.99],
      [0.63, 0.93],
      [0.69, 0.8],
    ],
    deck: 0.1,
    cowl: 0.745,
    roofFront: 0.585,
    rearGlass: [0.16, 0.36],
    glassRear: [0.24, 0.32],
    bPillar: 0.48,
    frontOverhang: 0.46,
    nose: 0.4,
    tail: 0.48,
    chin: 0.07,
    tailLift: 0.12,
    planFront: 0.11,
    planFrontExp: 2.4,
    planRear: 0.08,
    planRearExp: 3,
    capFront: 0.03,
    capRear: 0.03,
    capExp: 3,
    roofWidth: 0.73,
    belly: 0.92,
    hoodCrown: 0.02,
    roofCrown: 0.035,
    flareFront: 0.012,
    flareRear: 0.02,
    wheelRadius: 0.345,
    tyreWidth: 0.255,
    rimRatio: 0.72,
    groundClearance: 0.13,
    spokes: "six",
    spoiler: "lip",
    roofRails: false,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "closed",
  },

  hatchback: {
    belt: [
      [0, 0.55],
      [0.02, 0.62],
      [0.08, 0.645],
      [0.25, 0.64],
      [0.45, 0.62],
      [0.62, 0.6],
      [0.78, 0.585],
      [0.9, 0.565],
      [0.96, 0.53],
      [1, 0.46],
    ],
    roof: [
      [0.045, 0.78],
      [0.07, 0.905],
      [0.1, 0.965],
      [0.16, 0.99],
      [0.35, 1],
      [0.52, 0.99],
      [0.585, 0.94],
      [0.64, 0.81],
    ],
    deck: 0.03,
    cowl: 0.69,
    roofFront: 0.565,
    rearGlass: [0.045, 0.1],
    glassRear: [0.13, 0.17],
    bPillar: 0.42,
    frontOverhang: 0.56,
    nose: 0.42,
    tail: 0.52,
    chin: 0.07,
    tailLift: 0.1,
    planFront: 0.09,
    planFrontExp: 3,
    planRear: 0.035,
    planRearExp: 4,
    capFront: 0.03,
    capRear: 0.025,
    capExp: 3,
    roofWidth: 0.78,
    belly: 0.92,
    hoodCrown: 0.025,
    roofCrown: 0.03,
    flareFront: 0.01,
    flareRear: 0.015,
    wheelRadius: 0.315,
    tyreWidth: 0.215,
    rimRatio: 0.66,
    groundClearance: 0.14,
    spokes: "five",
    spoiler: "lip",
    roofRails: false,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "wide",
  },

  wagon: {
    belt: [
      [0, 0.52],
      [0.03, 0.615],
      [0.1, 0.645],
      [0.3, 0.645],
      [0.52, 0.63],
      [0.7, 0.615],
      [0.84, 0.6],
      [0.94, 0.57],
      [0.98, 0.52],
      [1, 0.45],
    ],
    roof: [
      [0.05, 0.78],
      [0.08, 0.9],
      [0.11, 0.96],
      [0.17, 0.985],
      [0.35, 0.995],
      [0.52, 1],
      [0.585, 0.985],
      [0.625, 0.93],
      [0.67, 0.8],
    ],
    deck: 0.035,
    cowl: 0.715,
    roofFront: 0.6,
    rearGlass: [0.05, 0.11],
    glassRear: [0.15, 0.19],
    bPillar: 0.45,
    frontOverhang: 0.46,
    nose: 0.42,
    tail: 0.52,
    chin: 0.08,
    tailLift: 0.11,
    planFront: 0.1,
    planFrontExp: 2.8,
    planRear: 0.05,
    planRearExp: 3.5,
    capFront: 0.03,
    capRear: 0.025,
    capExp: 3,
    roofWidth: 0.76,
    belly: 0.92,
    hoodCrown: 0.025,
    roofCrown: 0.03,
    flareFront: 0.02,
    flareRear: 0.03,
    wheelRadius: 0.35,
    tyreWidth: 0.275,
    rimRatio: 0.74,
    groundClearance: 0.12,
    spokes: "twin",
    spoiler: "lip",
    roofRails: true,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "wide",
  },

  suv: {
    belt: [
      [0, 0.54],
      [0.02, 0.6],
      [0.07, 0.62],
      [0.25, 0.625],
      [0.5, 0.615],
      [0.7, 0.6],
      [0.85, 0.59],
      [0.94, 0.575],
      [0.98, 0.54],
      [1, 0.48],
    ],
    roof: [
      [0.04, 0.8],
      [0.065, 0.93],
      [0.1, 0.98],
      [0.18, 0.995],
      [0.45, 1],
      [0.6, 0.99],
      [0.655, 0.935],
      [0.705, 0.79],
    ],
    deck: 0.025,
    cowl: 0.75,
    roofFront: 0.63,
    rearGlass: [0.04, 0.1],
    glassRear: [0.12, 0.15],
    bPillar: 0.44,
    frontOverhang: 0.48,
    nose: 0.47,
    tail: 0.55,
    chin: 0.06,
    tailLift: 0.08,
    planFront: 0.075,
    planFrontExp: 3.4,
    planRear: 0.035,
    planRearExp: 4,
    capFront: 0.03,
    capRear: 0.02,
    capExp: 3,
    roofWidth: 0.82,
    belly: 0.93,
    hoodCrown: 0.03,
    roofCrown: 0.03,
    flareFront: 0.015,
    flareRear: 0.02,
    wheelRadius: 0.375,
    tyreWidth: 0.255,
    rimRatio: 0.68,
    groundClearance: 0.19,
    spokes: "six",
    spoiler: "lip",
    roofRails: true,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "tall",
  },

  mpv: {
    belt: [
      [0, 0.52],
      [0.02, 0.57],
      [0.07, 0.585],
      [0.5, 0.575],
      [0.8, 0.56],
      [0.94, 0.54],
      [0.98, 0.51],
      [1, 0.46],
    ],
    roof: [
      [0.035, 0.82],
      [0.06, 0.95],
      [0.1, 0.99],
      [0.5, 1],
      [0.64, 0.985],
      [0.7, 0.9],
      [0.76, 0.72],
    ],
    deck: 0.022,
    cowl: 0.8,
    roofFront: 0.66,
    rearGlass: [0.035, 0.1],
    glassRear: [0.11, 0.13],
    bPillar: 0.5,
    frontOverhang: 0.5,
    nose: 0.45,
    tail: 0.52,
    chin: 0.06,
    tailLift: 0.08,
    planFront: 0.08,
    planFrontExp: 3,
    planRear: 0.03,
    planRearExp: 4,
    capFront: 0.03,
    capRear: 0.02,
    capExp: 3,
    roofWidth: 0.84,
    belly: 0.94,
    hoodCrown: 0.02,
    roofCrown: 0.03,
    flareFront: 0.01,
    flareRear: 0.01,
    wheelRadius: 0.34,
    tyreWidth: 0.225,
    rimRatio: 0.66,
    groundClearance: 0.16,
    spokes: "five",
    spoiler: "lip",
    roofRails: true,
    bedCover: false,
    spareWheel: false,
    headlights: "slim",
    grille: "wide",
  },

  // Cab and separate bed. The bed wears a tonneau cover, which is how most
  // are photographed and avoids modelling an empty box.
  pickup: {
    belt: [
      [0, 0.6],
      [0.015, 0.64],
      [0.05, 0.655],
      [0.3, 0.655],
      [0.44, 0.655],
      [0.5, 0.645],
      [0.7, 0.635],
      [0.86, 0.63],
      [0.95, 0.62],
      [0.985, 0.585],
      [1, 0.54],
    ],
    roof: [
      [0.448, 0.8],
      [0.452, 0.95],
      [0.466, 0.99],
      [0.52, 1],
      [0.62, 0.99],
      [0.655, 0.93],
      [0.69, 0.79],
    ],
    deck: 0.445,
    cowl: 0.725,
    roofFront: 0.635,
    rearGlass: [0.4485, 0.458],
    glassRear: [0.475, 0.48],
    bPillar: 0.56,
    frontOverhang: 0.4,
    nose: 0.52,
    tail: 0.58,
    chin: 0.06,
    tailLift: 0.1,
    planFront: 0.05,
    planFrontExp: 4,
    planRear: 0.02,
    planRearExp: 6,
    capFront: 0.025,
    capRear: 0.015,
    capExp: 3,
    roofWidth: 0.86,
    belly: 0.94,
    hoodCrown: 0.02,
    roofCrown: 0.025,
    flareFront: 0.02,
    flareRear: 0.02,
    wheelRadius: 0.4,
    tyreWidth: 0.275,
    rimRatio: 0.62,
    groundClearance: 0.23,
    spokes: "six",
    spoiler: "none",
    roofRails: false,
    bedCover: true,
    spareWheel: false,
    headlights: "square",
    grille: "tall",
  },

  // Body-on-frame off-roader: upright glass, flat roof, short overhangs.
  offroad: {
    belt: [
      [0, 0.57],
      [0.012, 0.6],
      [0.05, 0.605],
      [0.5, 0.6],
      [0.8, 0.595],
      [0.95, 0.59],
      [0.985, 0.565],
      [1, 0.52],
    ],
    roof: [
      [0.021, 0.85],
      [0.03, 0.97],
      [0.05, 1],
      [0.58, 1],
      [0.615, 0.97],
      [0.645, 0.84],
    ],
    deck: 0.018,
    cowl: 0.675,
    roofFront: 0.605,
    rearGlass: [0.022, 0.04],
    glassRear: [0.1, 0.1],
    bPillar: 0.4,
    frontOverhang: 0.38,
    nose: 0.52,
    tail: 0.56,
    chin: 0.1,
    tailLift: 0.12,
    planFront: 0.035,
    planFrontExp: 5,
    planRear: 0.02,
    planRearExp: 6,
    capFront: 0.02,
    capRear: 0.015,
    capExp: 3,
    roofWidth: 0.9,
    belly: 0.95,
    hoodCrown: 0.02,
    roofCrown: 0.015,
    flareFront: 0.03,
    flareRear: 0.03,
    wheelRadius: 0.4,
    tyreWidth: 0.255,
    rimRatio: 0.6,
    groundClearance: 0.22,
    spokes: "six",
    spoiler: "none",
    roofRails: false,
    bedCover: false,
    spareWheel: true,
    headlights: "round",
    grille: "tall",
  },
};

/**
 * Fallback dimensions per body type, in metres, for variants without
 * published figures. Real dimensions override every one of these.
 */
export const FALLBACK_SIZE: Record<
  BodyType,
  { length: number; width: number; height: number; wheelbase: number }
> = {
  coupe: { length: 4.5, width: 1.9, height: 1.28, wheelbase: 2.6 },
  roadster: { length: 4.3, width: 1.88, height: 1.22, wheelbase: 2.5 },
  convertible: { length: 4.5, width: 1.88, height: 1.3, wheelbase: 2.6 },
  sedan: { length: 4.8, width: 1.85, height: 1.45, wheelbase: 2.85 },
  hatchback: { length: 4.05, width: 1.78, height: 1.46, wheelbase: 2.55 },
  wagon: { length: 4.95, width: 1.9, height: 1.47, wheelbase: 2.92 },
  suv: { length: 4.65, width: 1.94, height: 1.72, wheelbase: 2.8 },
  off_road: { length: 4.0, width: 1.82, height: 1.84, wheelbase: 2.45 },
  mpv: { length: 4.7, width: 1.85, height: 1.75, wheelbase: 2.8 },
  pickup: { length: 5.9, width: 2.03, height: 1.96, wheelbase: 3.68 },
};

// ---------------------------------------------------------------------------
// Curves
// ---------------------------------------------------------------------------

/**
 * Monotone cubic interpolation (Fritsch–Carlson).
 *
 * Plain Catmull-Rom overshoots between closely spaced knots, which on a
 * hatchback's near-vertical tailgate puts a bump on the roof. A monotone
 * spline cannot overshoot, so the drawn profile is exactly the one specified.
 */
export function monotone(knots: readonly Knot[]): (u: number) => number {
  const n = knots.length;
  const xs = knots.map((k) => k[0]);
  const ys = knots.map((k) => k[1]);
  const x = (i: number) => xs[i] ?? 0;
  const y = (i: number) => ys[i] ?? 0;

  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    slopes.push((y(i + 1) - y(i)) / Math.max(1e-9, x(i + 1) - x(i)));
  }
  const d = (i: number) => slopes[i] ?? 0;

  const tangents: number[] = [];
  for (let i = 0; i < n; i += 1) {
    if (i === 0) tangents.push(d(0));
    else if (i === n - 1) tangents.push(d(n - 2));
    else if (d(i - 1) * d(i) <= 0) tangents.push(0);
    else {
      const h0 = x(i) - x(i - 1);
      const h1 = x(i + 1) - x(i);
      const w1 = 2 * h1 + h0;
      const w2 = h1 + 2 * h0;
      tangents.push((w1 + w2) / (w1 / d(i - 1) + w2 / d(i)));
    }
  }
  const m = (i: number) => tangents[i] ?? 0;

  return (u: number) => {
    if (u <= x(0)) return y(0);
    if (u >= x(n - 1)) return y(n - 1);
    let i = 0;
    while (i < n - 2 && u > x(i + 1)) i += 1;
    const h = x(i + 1) - x(i);
    const t = (u - x(i)) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * y(i) +
      (t3 - 2 * t2 + t) * h * m(i) +
      (-2 * t3 + 3 * t2) * y(i + 1) +
      (t3 - t2) * h * m(i + 1)
    );
  };
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Superellipse falloff: 1 at s=0, 0 at s=1, blunt for high exponents. */
export const falloff = (s: number, exponent: number) =>
  s <= 0 ? 1 : s >= 1 ? 0 : Math.pow(1 - Math.pow(s, exponent), 1 / exponent);

const BODY_TYPES = new Set<string>(Object.keys(FALLBACK_SIZE));

export function isBodyType(value: string | null): value is BodyType {
  return value !== null && BODY_TYPES.has(value);
}

/** The drawing to use for a car. Engine position decides between coupé archetypes. */
export function pickStyle(
  bodyType: BodyType,
  enginePosition: EnginePosition | null | undefined,
  powertrain: Powertrain,
): BodyStyle {
  switch (bodyType) {
    case "coupe":
    case "roadster":
    case "convertible":
      if (enginePosition === "mid") return "supercar";
      if (enginePosition === "rear") return "sports-rear";
      return "gt";
    case "sedan":
      return powertrain === "electric" ? "electric-sedan" : "sedan";
    case "hatchback":
      return "hatchback";
    case "wagon":
      return "wagon";
    case "suv":
      return "suv";
    case "mpv":
      return "mpv";
    case "pickup":
      return "pickup";
    case "off_road":
      return "offroad";
  }
}
