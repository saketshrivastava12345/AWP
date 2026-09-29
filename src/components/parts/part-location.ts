import { carSilhouette, type Silhouette } from "@/components/cars/car-silhouette";
import { FALLBACK_SIZE, STYLES, pickStyle } from "@/components/3d/car-styles";
import type { ViewerGroup } from "@/types/domain";

/**
 * Geometry for the "typical location" figure on part and category pages: a
 * side elevation of a generic saloon (drawn from the same body profiles as
 * the 3D car) with the zone where a system usually sits highlighted.
 *
 * A part in the encyclopedia is not tied to one car, so this can only ever be
 * the TYPICAL location, and the figure says so. Where the answer genuinely
 * varies (the engine can be at the front, in the middle or at the back) the
 * note under the figure says that too, instead of implying one answer.
 *
 * Pure: no React, no three.js. Coordinates are in the silhouette's own SVG
 * units, x growing from the tail (0) to the nose, y from the roof down.
 */

export type ZoneShape =
  /** A block of the car, clipped to its outline. */
  | { type: "rect"; x: number; y: number; width: number; height: number }
  /** A circle at a wheel (tyre, disc). */
  | { type: "circle"; cx: number; cy: number; r: number }
  /** A drawn line (spring coils, the wiring loom). Not filled. */
  | { type: "line"; d: string; dashed?: boolean }
  /** The body outline itself. */
  | { type: "outline" };

export type LocationZone = {
  group: ViewerGroup;
  /** Shapes clipped to the body outline, so they read as "inside the car". */
  inside: ZoneShape[];
  /** Shapes drawn over the wheels, unclipped. */
  over: ZoneShape[];
};

export type LocationFigure = {
  silhouette: Silhouette;
  width: number;
  height: number;
  /** x of the front axle and rear axle, for the orientation labels. */
  frontAxleX: number;
  rearAxleX: number;
  zones: LocationZone[];
};

/** What the highlighted zone means, per system, in plain words. */
export const ZONE_NOTES: Record<ViewerGroup, string> = {
  body: "The outer shell: panels, glass, bumpers and aerodynamic surfaces.",
  engine:
    "Drawn in the front bay, the most common layout. Mid- and rear-engined cars carry the engine behind the cabin instead.",
  exhaust: "From the engine, along the underside of the car, to the tailpipes.",
  transmission:
    "Between the engine or motors and the driven wheels. Where it sits depends on the drive layout.",
  suspension: "At each wheel, between the hub and the body.",
  brakes: "Inside each wheel, clamping a disc that turns with it.",
  wheels: "At the four corners of the car.",
  interior: "The cabin, between the front and rear bulkheads.",
  electronics:
    "Throughout the car. The main control units usually sit behind the dashboard and in the engine bay.",
  battery:
    "In the floor between the axles, where most electric cars carry the traction battery. Motors sit at the driven axles.",
};

const parseViewBox = (viewBox: string) => {
  const [, , width = 0, height = 0] = viewBox.split(/\s+/).map(Number);
  return { width, height };
};

/** A coil spring drawn as a zig-zag, from the hub up into the wheel arch. */
function springPath(cx: number, bottom: number, top: number, half: number): string {
  const turns = 5;
  const step = (bottom - top) / (turns * 2);
  let d = `M${cx} ${bottom}`;
  for (let i = 1; i <= turns * 2; i += 1) {
    d += `L${(cx + (i % 2 === 1 ? half : -half)).toFixed(1)} ${(bottom - step * i).toFixed(1)}`;
  }
  return `${d}L${cx} ${top.toFixed(1)}`;
}

/**
 * The figure for one or more systems. Electric drive gets the electric
 * saloon's profile (no grille, a lower nose); everything else the combustion
 * saloon's.
 */
export function locationFigure(groups: readonly ViewerGroup[]): LocationFigure {
  const electric = groups.length > 0 && groups.every((group) => group === "battery");
  const powertrain = electric ? "electric" : "combustion";
  const silhouette = carSilhouette("sedan", powertrain);
  const { width: W, height: H } = parseViewBox(silhouette.viewBox);

  const style = STYLES[pickStyle("sedan", null, powertrain)];
  const unitsPerMetre = W / FALLBACK_SIZE.sedan.length;
  const floorY = H - style.groundClearance * unitsPerMetre;
  const cowlX = style.cowl * W;
  const deckX = style.deck * W;

  const [a, b] = silhouette.wheels;
  const front =
    a && b ? (a.cx > b.cx ? a : b) : (a ?? { cx: W * 0.8, cy: H * 0.77, r: H * 0.22 });
  const rear =
    a && b ? (a.cx > b.cx ? b : a) : { cx: W * 0.22, cy: front.cy, r: front.r };
  const wheels = [front, rear];

  const zoneFor = (group: ViewerGroup): LocationZone => {
    switch (group) {
      case "body":
        return { group, inside: [{ type: "outline" }], over: [] };
      case "engine":
        return {
          group,
          inside: [{ type: "rect", x: cowlX, y: 0, width: W - cowlX, height: H }],
          over: [],
        };
      case "exhaust": {
        // The pipe along the underside, and the silencer box in the rear
        // overhang where it usually hangs.
        const band = H * 0.075;
        const box = H * 0.15;
        return {
          group,
          inside: [
            {
              type: "rect",
              x: 0,
              y: floorY - band,
              width: front.cx - front.r * 1.2,
              height: band,
            },
            {
              type: "rect",
              x: W * 0.03,
              y: floorY - box,
              width: rear.cx - rear.r * 1.25 - W * 0.03,
              height: box,
            },
          ],
          over: [],
        };
      }
      case "transmission":
        return {
          group,
          inside: [
            {
              type: "rect",
              x: rear.cx,
              y: front.cy - front.r * 0.32,
              width: front.cx - rear.cx,
              height: front.r * 0.64,
            },
          ],
          over: [],
        };
      case "suspension":
        return {
          group,
          inside: [],
          over: wheels.map((wheel) => ({
            type: "line" as const,
            d: springPath(
              wheel.cx,
              wheel.cy - wheel.r * 0.15,
              wheel.cy - wheel.r * 1.45,
              wheel.r * 0.3,
            ),
          })),
        };
      case "brakes":
        return {
          group,
          inside: [],
          over: wheels.map((wheel) => ({
            type: "circle" as const,
            cx: wheel.cx,
            cy: wheel.cy,
            r: wheel.r * 0.6,
          })),
        };
      case "wheels":
        return {
          group,
          inside: [],
          over: wheels.map((wheel) => ({
            type: "circle" as const,
            cx: wheel.cx,
            cy: wheel.cy,
            r: wheel.r,
          })),
        };
      case "interior":
        return {
          group,
          inside: [
            { type: "rect", x: deckX, y: 0, width: cowlX - deckX, height: floorY },
          ],
          over: [],
        };
      case "electronics":
        return {
          group,
          inside: [
            {
              type: "rect",
              x: cowlX - W * 0.05,
              y: H * 0.3,
              width: W * 0.09,
              height: H * 0.3,
            },
            {
              type: "line",
              d: `M${(W * 0.03).toFixed(1)} ${(H * 0.52).toFixed(1)}H${(W * 0.97).toFixed(1)}`,
              dashed: true,
            },
          ],
          over: [],
        };
      case "battery": {
        const slab = H * 0.12;
        const start = rear.cx + rear.r * 1.2;
        return {
          group,
          inside: [
            {
              type: "rect",
              x: start,
              y: floorY - slab,
              width: front.cx - front.r * 1.2 - start,
              height: slab,
            },
          ],
          over: [],
        };
      }
    }
  };

  const unique = [...new Set(groups)];
  return {
    silhouette,
    width: W,
    height: H,
    frontAxleX: front.cx,
    rearAxleX: rear.cx,
    zones: unique.map(zoneFor),
  };
}
