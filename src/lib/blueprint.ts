import type { VariantDetail, ViewerGroup } from "@/types/domain";
import { powertrainKind } from "@/types/domain";
import { formatEnumLabel, formatNumber } from "@/lib/format";
import {
  indexParts,
  partComponents,
  type TourComponent,
  type TourStat,
  type TourStop,
  type TourStopId,
} from "@/lib/anatomy-tour";
import type { Part } from "@/types/domain";

/**
 * The blueprint: the anatomy tour told as an exploded technical drawing.
 *
 * Scrolling into it turns the rendered car into a line drawing over a grid
 * with its published dimensions, then takes it apart one subsystem per scroll
 * beat — the shell lifts, the wheels come off, the brakes, the suspension, the
 * powertrain… — and ends on the whole car exploded. Scrolling back puts it
 * together again, because every value here is a function of scroll position.
 *
 * This module holds the parts that are pure: which groups take part and in
 * what order, the card for each beat (built from the variant's own rows and
 * the anatomy tour's stops, so no figure is invented), and the maths that
 * turns a continuous scroll `beat` into per-group separation. No three.js and
 * no DOM, so it is unit-tested and the page can build the cards on the server.
 *
 * Beats (card indices):
 *   0          the opening shot (the page header over the rendered car)
 *   1          the blueprint: the drawing fades in, dimension lines drawn
 *   2 … N+1    one subsystem each, in BLUEPRINT_ORDER
 *   N+2        the whole car exploded, a label on every group
 */

/** The order the car comes apart in: outside in, then the powertrain, then the cabin. */
export const BLUEPRINT_ORDER = [
  "body",
  "wheels",
  "brakes",
  "suspension",
  "engine",
  "battery",
  "transmission",
  "exhaust",
  "interior",
  "electronics",
] as const satisfies readonly ViewerGroup[];

/**
 * The groups this car takes apart, in order. `drawn` is what the 3D car
 * actually draws (by powertrain: an EV has no engine or exhaust), so the
 * blueprint follows the same rules as the viewer.
 */
export function blueprintGroups(drawn: readonly ViewerGroup[]): ViewerGroup[] {
  return BLUEPRINT_ORDER.filter((group) => drawn.includes(group));
}

// ---------------------------------------------------------------------------
// Beats
// ---------------------------------------------------------------------------

/** Card index of the blueprint's opening (the drawing with its dimensions). */
export const BLUEPRINT_INTRO = 1;

/** Card index of the n-th group's beat. */
export const groupCard = (index: number) => BLUEPRINT_INTRO + 1 + index;

/** Card index of the finale, for a car with `count` groups. */
export const finaleCard = (count: number) => groupCard(count);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const smoothstep = (value: number) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

/**
 * Between two beats the first and last fifth of the scroll hold still (so a
 * card can be read against a settled scene) and the middle three fifths
 * move. The camera uses the same window (tour-cameras.ts cameraAt).
 */
const HOLD = 0.2;
const TRAVEL = 1 - 2 * HOLD;

/** Progress of the move from card `from` to card `from + 1`, eased, 0–1. */
function travel(beat: number, from: number): number {
  return smoothstep((beat - from - HOLD) / TRAVEL);
}

export type BlueprintFrameValues = {
  /** 0 = the rendered car, 1 = the drawing (grid, line work, ghosted shell). */
  drawing: number;
  /** Separation of each group, by position in the order: 0 together, 1 apart. */
  explode: number[];
  /** Visibility of the dimension lines, 0–1. */
  dimensions: number;
  /** Visibility of the per-group labels of the finale, 0–1. */
  labels: number;
};

/**
 * Everything the scene needs at a scroll position. Continuous in `beat` and
 * a pure function of it, so scrolling back reverses every move exactly.
 */
export function blueprintFrame(beat: number, count: number): BlueprintFrameValues {
  const drawing = travel(beat, BLUEPRINT_INTRO - 1);
  const explode = Array.from({ length: count }, (_, index) =>
    travel(beat, groupCard(index) - 1),
  );
  // Dimensions describe the assembled car: drawn with the blueprint, gone as
  // soon as the first part leaves.
  const dimensions = count > 0 ? drawing * (1 - travel(beat, BLUEPRINT_INTRO)) : drawing;
  const labels = travel(beat, finaleCard(count) - 1);
  return { drawing, explode, dimensions, labels };
}

/**
 * The card whose subject is on screen. It changes as soon as the scene starts
 * moving toward the next card — so the part being taken off is the one lit
 * — not halfway through the scroll like the nearest card does.
 */
export function focusCardAt(beat: number, count: number): number {
  return Math.min(finaleCard(count), Math.max(0, Math.ceil(beat - HOLD)));
}

export type BlueprintLook = {
  /** 0 solid bodywork, 1 ghosted shell with its panel lines. */
  ghost: number;
  /** Group drawn in gold and kept solid, if any. */
  highlight: ViewerGroup | null;
  /** How far every other group steps back (0–1). */
  restDim: number;
  /** How warm every other group's line work is (0 ink, 1 gold). */
  restEdge: number;
  /** How warm the body's panel lines are when the body is not the subject. */
  shellEdge: number;
};

/** How the car is drawn while a card is the focus. */
export function blueprintLook(
  card: number,
  groups: readonly ViewerGroup[],
): BlueprintLook {
  if (card < BLUEPRINT_INTRO)
    return { ghost: 0, highlight: null, restDim: 0, restEdge: 0, shellEdge: 0 };
  // The drawing: the shell outlined in gold, the machinery inside in ink.
  if (card === BLUEPRINT_INTRO)
    return { ghost: 1, highlight: null, restDim: 0.6, restEdge: 0, shellEdge: 1 };
  // One subsystem in gold; everything else steps back to faint ink.
  const group = groups[card - groupCard(0)];
  if (group)
    return { ghost: 1, highlight: group, restDim: 1, restEdge: 0, shellEdge: 0.1 };
  // The finale: every part apart, all of it drawn warm.
  return { ghost: 1, highlight: null, restDim: 0.45, restEdge: 0.6, shellEdge: 0.7 };
}

// ---------------------------------------------------------------------------
// The DOM overlay
// ---------------------------------------------------------------------------

/**
 * The blueprint's labels are DOM laid over the canvas (crisp text, readable
 * by a screen reader through the cards). The stage registers its elements
 * here and the scene writes their positions and opacity every frame, so no
 * React render happens while scrolling.
 */
export type BlueprintOverlay = {
  /** Measurement labels, by dimension id (length, width, …). */
  dimensions: Map<string, HTMLElement>;
  /** One label per group, for the finale and the part in motion. */
  groups: Map<ViewerGroup, HTMLElement>;
  /** Stage furniture faded in with the drawing (the screen-space grid). */
  chrome: Map<"grid", HTMLElement>;
};

export function createBlueprintOverlay(): BlueprintOverlay {
  return { dimensions: new Map(), groups: new Map(), chrome: new Map() };
}

// ---------------------------------------------------------------------------
// Cards
// ---------------------------------------------------------------------------

export type BlueprintStepKind = "intro" | "group" | "finale";

export type BlueprintStep = {
  /** "blueprint", the group name, or "exploded". */
  id: string;
  kind: BlueprintStepKind;
  /** The subsystem this beat takes off, for group beats. */
  group: ViewerGroup | null;
  /** Short name for the progress rail and the finale's labels. */
  label: string;
  title: string;
  body: string;
  stats: TourStat[];
  features: { name: string; note: string | null }[];
  components: TourComponent[];
};

/** Rail and label names, by group. */
export const BLUEPRINT_LABELS: Record<ViewerGroup, string> = {
  body: "Body shell",
  wheels: "Wheels",
  brakes: "Brakes",
  suspension: "Suspension",
  engine: "Engine",
  battery: "Battery",
  transmission: "Drivetrain",
  exhaust: "Exhaust",
  interior: "Cabin",
  electronics: "Electrical",
};

const present = <T>(values: (T | null | undefined | false)[]): T[] =>
  values.filter(
    (value): value is T => value !== null && value !== undefined && value !== false,
  );

const stat = (label: string, value: string | null | undefined): TourStat | null =>
  value ? { label, value } : null;

const mm = (value: number | null | undefined) =>
  value ? `${formatNumber(value)} mm` : null;

/** Stats from several stops, first occurrence of each label wins. */
function mergeStats(...lists: TourStat[][]): TourStat[] {
  const seen = new Set<string>();
  const out: TourStat[] = [];
  for (const entry of lists.flat()) {
    if (seen.has(entry.label)) continue;
    seen.add(entry.label);
    out.push(entry);
  }
  return out;
}

function mergeComponents(max: number, ...lists: TourComponent[][]): TourComponent[] {
  const seen = new Set<string>();
  const out: TourComponent[] = [];
  for (const entry of lists.flat()) {
    if (seen.has(entry.slug)) continue;
    seen.add(entry.slug);
    out.push(entry);
    if (out.length >= max) break;
  }
  return out;
}

const DRIVEN_WHEELS: Record<string, string> = {
  rwd: "Rear",
  fwd: "Front",
  awd: "All four",
  "4wd": "All four",
};

/**
 * One card per beat, from the variant's rows. `tour` is the anatomy tour for
 * the same variant: its stops already hold the right figures and components
 * for most subsystems, chosen by the same rules, so they are reused rather
 * than rebuilt. `groups` is the car's blueprint order (blueprintGroups).
 */
export function buildBlueprint(
  detail: VariantDetail,
  tour: readonly TourStop[],
  allParts: readonly Part[],
  groups: readonly ViewerGroup[],
): BlueprintStep[] {
  const { variant, dimensions, fuel } = detail;
  const kind = powertrainKind(variant.fuel_type);
  const index = indexParts(allParts);
  const stopOf = (id: TourStopId) => tour.find((stop) => stop.id === id);
  const featureNames = (categories: string[]) =>
    detail.features
      .filter(({ feature }) => feature.category && categories.includes(feature.category))
      .map(({ feature, detail: note }) => ({ name: feature.name, note }));
  const components = (group: ViewerGroup, slugs: string[], exclude: string[] = []) =>
    partComponents(detail, index, group, slugs, exclude);

  const design = stopOf("design");
  const steps: BlueprintStep[] = [];

  // --- The drawing ----------------------------------------------------------
  const length = dimensions?.length_mm ?? null;
  const width = dimensions?.width_mm ?? null;
  const height = dimensions?.height_mm ?? null;
  const measured = present([length, width, height]);
  steps.push({
    id: "blueprint",
    kind: "intro",
    group: null,
    label: "Blueprint",
    title:
      measured.length === 3
        ? `${measured.map((value) => formatNumber(value)).join(" × ")} mm`
        : "The blueprint",
    body: present([
      measured.length > 0
        ? "Drawn to the dimensions published for this car; a figure that is not published gets no dimension line."
        : "No dimensions are published for this car, so the drawing follows its body style's typical proportions and carries no dimension lines.",
      "Keep scrolling and it comes apart one system at a time, each along the path it would take out of the car.",
    ]).join(" "),
    stats: present([
      stat("Length", mm(length)),
      stat("Width", mm(width)),
      stat("Height", mm(height)),
      stat("Wheelbase", mm(dimensions?.wheelbase_mm)),
      stat("Ground clearance", mm(dimensions?.ground_clearance_mm)),
    ]),
    features: [],
    components: [],
  });

  // --- One beat per subsystem -------------------------------------------------
  const kerbWeight = dimensions?.kerb_weight_kg
    ? `${formatNumber(dimensions.kerb_weight_kg)} kg`
    : null;

  const groupStep = (group: ViewerGroup): BlueprintStep | null => {
    const base = {
      id: group,
      kind: "group" as const,
      group,
      label: BLUEPRINT_LABELS[group],
    };
    switch (group) {
      case "body": {
        const bodyLabel = formatEnumLabel(detail.model.body_type, "");
        return {
          ...base,
          title: bodyLabel ? `${bodyLabel} body shell` : "Body shell",
          body: design?.body ?? "",
          stats: present([
            stat("Body style", bodyLabel || null),
            stat("Kerb weight", kerbWeight),
            stat(
              "Seats",
              dimensions?.seating_capacity ? String(dimensions.seating_capacity) : null,
            ),
          ]),
          features: design?.features ?? [],
          components: design?.components ?? [],
        };
      }
      case "wheels": {
        const driven = DRIVEN_WHEELS[variant.drive_type] ?? null;
        return {
          ...base,
          title: "Wheels & tyres",
          body: "Four contact patches, each about the size of a hand, are all the car ever has to work with: every input — steering, drive and braking — reaches the road through the tyres.",
          stats: present([stat("Driven wheels", driven)]),
          features: [],
          components: components("wheels", [
            "alloy-wheel",
            "tyre",
            "wheel-hub",
            "wheel-bearing",
            "tpms-sensor",
          ]),
        };
      }
      case "brakes": {
        const stop = stopOf("brakes");
        const ceramic = stop?.title.startsWith("Carbon-ceramic") ?? false;
        return {
          ...base,
          title: ceramic ? "Carbon-ceramic brakes" : "Brakes",
          body: "A single stop is limited by the tyres' grip; repeated stops by heat, because every stop turns the car's kinetic energy into heat in the discs within seconds.",
          stats: (stop?.stats ?? []).filter((entry) => entry.label !== "Kerb weight"),
          features: stop?.features ?? [],
          components: components(
            "brakes",
            present([
              ceramic ? "carbon-ceramic-disc" : "brake-disc",
              "brake-caliper",
              "brake-pad",
              "abs-module",
            ]),
          ),
        };
      }
      case "suspension": {
        const stop = stopOf("chassis");
        return stop ? { ...base, ...pick(stop) } : null;
      }
      case "engine": {
        const stop = stopOf("engine");
        return stop ? { ...base, ...pick(stop) } : null;
      }
      case "battery": {
        const motors = stopOf("electric");
        const pack = stopOf("battery");
        if (!pack && !motors) return null;
        if (!motors && pack) return { ...base, label: "Battery", ...pick(pack) };
        const motorCount = detail.ev?.motor_count ?? null;
        const kwh = detail.ev?.battery_kwh ?? null;
        const titled = present([
          motorCount ? `${motorCount} motor${motorCount === 1 ? "" : "s"}` : null,
          kwh ? `${kwh} kWh battery` : null,
        ]);
        return {
          ...base,
          label: "Motors & battery",
          title: titled.length ? titled.join(" · ") : "Battery & electric drive",
          body: present([motors?.body, pack?.body]).join(" "),
          stats: mergeStats(motors?.stats ?? [], pack?.stats ?? []),
          features: motors?.features ?? [],
          components: mergeComponents(
            5,
            motors?.components ?? [],
            pack?.components ?? [],
          ),
        };
      }
      case "transmission": {
        const stop = stopOf("drivetrain");
        return stop ? { ...base, ...pick(stop) } : null;
      }
      case "exhaust":
        return {
          ...base,
          title: "Exhaust",
          body: "Gas leaves the cylinders through the manifold, is cleaned in the catalytic converter and quietened by the silencer before it reaches the tailpipes.",
          stats: present([
            stat("Emission standard", fuel?.emission_standard?.trim() || null),
            stat("CO₂", fuel?.co2_g_km ? `${formatNumber(fuel.co2_g_km)} g/km` : null),
          ]),
          features: [],
          components: components("exhaust", [
            "exhaust-manifold",
            "catalytic-converter",
            "exhaust-silencer",
          ]),
        };
      case "interior": {
        const stop = stopOf("interior");
        if (!stop) return null;
        return {
          ...base,
          ...pick(stop),
          // Driver assistance is shown with the electrical system.
          features: featureNames(["Interior"]),
        };
      }
      case "electronics":
        return {
          ...base,
          title: "Electrical & electronics",
          body:
            kind === "electric"
              ? "Control units, sensors and a 12-volt network run everything that is not traction — from the lights to the driver-assistance systems — while the high-voltage system drives the car."
              : "Control units, sensors and a 12-volt network run the engine, the lights and the driver-assistance systems, and the wiring harness ties them together.",
          stats: [],
          features: featureNames(["Driver Assistance"]),
          components: components(
            "electronics",
            present([
              kind !== "electric" ? "engine-control-unit" : null,
              "sensor-suite",
              "wiring-harness",
              "auxiliary-battery",
              kind === "combustion" ? "alternator" : null,
            ]),
          ),
        };
    }
  };

  for (const group of groups) {
    const step = groupStep(group);
    if (step) steps.push(step);
  }

  // --- The finale: everything apart -----------------------------------------
  const performance = stopOf("performance");
  steps.push({
    id: "exploded",
    kind: "finale",
    group: null,
    label: "Exploded",
    title: performance?.title ?? "Every system, apart",
    body: `${steps.length - 1} systems, laid out along the paths they take out of the car. Every figure the car publishes is these systems resolving against each other: power against weight, grip against drag.`,
    stats: performance?.stats ?? [],
    features: [],
    components: [],
  });

  return steps;
}

/** The card content of a tour stop. */
function pick(stop: TourStop) {
  return {
    title: stop.title,
    body: stop.body,
    stats: stop.stats,
    features: stop.features,
    components: stop.components,
  };
}

/** The groups a step list actually takes apart, in order. */
export function stepGroups(steps: readonly BlueprintStep[]): ViewerGroup[] {
  return steps.flatMap((step) => (step.group ? [step.group] : []));
}
