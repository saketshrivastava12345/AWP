import type { CarBuild } from "@/lib/car-build";
import type { WheelFinish, WheelStyle } from "@/lib/viewer-paint";
import { STYLES, isBodyType, pickStyle, type BodyStyle } from "./car-styles";

/**
 * The wheels a body style is drawn with before the visitor changes them.
 * Shared by the 3D car and the configurator, so the panel's initial choice is
 * always the one on screen. No three.js import.
 */

/** Performance and electric-saloon styles wear dark rims; the rest bright alloys. */
const DARK_WHEELS: ReadonlySet<BodyStyle> = new Set([
  "supercar",
  "sports-rear",
  "gt",
  "electric-sedan",
]);

export function bodyStyleOf(
  build: Pick<CarBuild, "bodyType" | "enginePosition" | "powertrain">,
): BodyStyle {
  return pickStyle(
    isBodyType(build.bodyType) ? build.bodyType : "coupe",
    build.enginePosition,
    build.powertrain,
  );
}

export function wheelDefaults(style: BodyStyle): {
  style: WheelStyle;
  finish: WheelFinish;
} {
  return {
    style: STYLES[style].spokes,
    finish: DARK_WHEELS.has(style) ? "dark" : "bright",
  };
}
