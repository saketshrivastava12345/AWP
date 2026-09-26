import {
  FALLBACK_SIZE,
  STYLES,
  falloff,
  isBodyType,
  monotone,
  pickStyle,
  smooth,
} from "@/components/3d/car-styles";
import type { EnginePosition, PowertrainKind } from "@/types/domain";

/**
 * A side-elevation silhouette of a body style, as SVG path data.
 *
 * Drawn from the same profiles as the 3D car, so the placeholder a card shows
 * when there is no photograph is recognisably the same kind of car the viewer
 * builds. It is a body-style drawing, not a likeness of the specific model,
 * and the card says so.
 */

export type Silhouette = {
  viewBox: string;
  /** Closed outline of the body, arches included. */
  body: string;
  /** The glasshouse, as one inset shape. */
  glass: string;
  wheels: { cx: number; cy: number; r: number }[];
};

const SAMPLES = 90;
const SCALE = 100; // SVG units per metre

export function carSilhouette(
  bodyType: string | null,
  powertrain: PowertrainKind,
  enginePosition: EnginePosition | null = null,
): Silhouette {
  const type = isBodyType(bodyType) ? bodyType : "coupe";
  const def = STYLES[pickStyle(type, enginePosition, powertrain)];
  const { length: L, height: H, wheelbase } = FALLBACK_SIZE[type];
  const R = Math.min(def.wheelRadius, H * 0.285);
  const arch = R * 1.12;
  const gc = def.groundClearance;
  const noseZ = L / 2;
  const frontAxle = noseZ - (L - wheelbase) * def.frontOverhang;
  const rearAxle = frontAxle - wheelbase;

  const belt = monotone(def.belt);
  const roof = monotone([
    [def.deck, belt(def.deck)],
    ...def.roof,
    [def.cowl, belt(def.cowl)],
  ]);

  const zOf = (u: number) => -L / 2 + u * L;
  /** Side-view rounding of the tips, as in the 3D body. */
  const cap = (u: number, y: number) => {
    const s = Math.max(
      (u - (1 - def.capFront)) / def.capFront,
      (def.capRear - u) / def.capRear,
    );
    if (s <= 0) return y;
    const tip = (u > 0.5 ? def.nose : def.tail) * H;
    return tip + (y - tip) * falloff(s, def.capExp);
  };

  const top = (u: number) => {
    const y = u > def.deck && u < def.cowl ? Math.max(belt(u), roof(u)) * H : belt(u) * H;
    return cap(u, y);
  };

  const bottom = (u: number) => {
    const z = zOf(u);
    let y = gc;
    const frontStart = frontAxle + arch;
    const rearStart = rearAxle - arch;
    if (z > frontStart)
      y += def.chin * H * smooth((z - frontStart) / (noseZ - frontStart));
    else if (z < rearStart)
      y += def.tailLift * H * smooth((rearStart - z) / (rearStart + L / 2));
    for (const axle of [frontAxle, rearAxle]) {
      const dz = z - axle;
      if (Math.abs(dz) < arch) y = Math.max(y, R + Math.sqrt(arch * arch - dz * dz));
    }
    return cap(u, y);
  };

  const x = (u: number) => (u * L * SCALE).toFixed(1);
  const y = (height: number) => ((H - height) * SCALE).toFixed(1);

  // Stations, with extra ones at the arch edges so the openings stay crisp.
  const us = new Set<number>();
  for (let i = 0; i <= SAMPLES; i += 1)
    us.add(0.5 - 0.5 * Math.cos((Math.PI * i) / SAMPLES));
  for (const axle of [frontAxle, rearAxle]) {
    for (let k = 0; k <= 16; k += 1) {
      const z = axle - arch * Math.cos((Math.PI * k) / 16) * 0.999;
      us.add((z + L / 2) / L);
    }
    us.add((axle - arch - 0.002 + L / 2) / L);
    us.add((axle + arch + 0.002 + L / 2) / L);
  }
  const stations = [...us].filter((u) => u >= 0 && u <= 1).sort((a, b) => a - b);

  const upper = stations.map((u) => `${x(u)} ${y(top(u))}`);
  const lower = [...stations].reverse().map((u) => `${x(u)} ${y(bottom(u))}`);
  const body = `M ${upper.join(" L ")} L ${lower.join(" L ")} Z`;

  // Glasshouse inset: a little below the roof line, a little above the belt.
  const glassFrom = def.glassRear[0];
  const glassTo = def.cowl - 0.012;
  const glassStations = stations.filter((u) => u >= glassFrom && u <= glassTo);
  const glassTop = glassStations.map((u) => {
    const lift = (Math.max(belt(u), roof(u)) - belt(u)) * H;
    return `${x(u)} ${y(belt(u) * H + Math.max(0, lift - 0.045))}`;
  });
  const glassBottom = [...glassStations]
    .reverse()
    .map((u) => `${x(u)} ${y(belt(u) * H + 0.02)}`);
  const glass =
    glassStations.length > 1
      ? `M ${glassTop.join(" L ")} L ${glassBottom.join(" L ")} Z`
      : "";

  return {
    viewBox: `0 0 ${(L * SCALE).toFixed(0)} ${(H * SCALE).toFixed(0)}`,
    body,
    glass,
    wheels: [frontAxle, rearAxle].map((axle) => ({
      cx: Number(((axle + L / 2) * SCALE).toFixed(1)),
      cy: Number(((H - R) * SCALE).toFixed(1)),
      r: Number((R * SCALE * 0.96).toFixed(1)),
    })),
  };
}
