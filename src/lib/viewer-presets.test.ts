import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRESET,
  PRESET_GHOST,
  PRESET_IDS,
  availablePresets,
  isPresetId,
  presetAvailability,
} from "./viewer-presets";

describe("availablePresets", () => {
  it("offers ENGINE only when an engine is drawn and BATTERY only with a battery", () => {
    const petrol = availablePresets(
      presetAvailability({ powertrain: "combustion", enginePosition: "rear" }),
    );
    expect(petrol).toContain("engine");
    expect(petrol).not.toContain("battery");

    const ev = availablePresets(
      presetAvailability({ powertrain: "electric", enginePosition: null }),
    );
    expect(ev).not.toContain("engine");
    expect(ev).toContain("battery");

    const hybrid = availablePresets(
      presetAvailability({ powertrain: "hybrid", enginePosition: "mid" }),
    );
    expect(hybrid).toContain("engine");
    expect(hybrid).toContain("battery");
  });

  it("drops ENGINE when the engine position is not recorded", () => {
    const unknown = availablePresets(
      presetAvailability({ powertrain: "combustion", enginePosition: null }),
    );
    expect(unknown).not.toContain("engine");
  });

  it("always offers the exterior and cabin views, in toolbar order", () => {
    const all = availablePresets({ hasEngine: true, hasBattery: true });
    expect(all).toEqual([...PRESET_IDS]);
    const none = availablePresets({ hasEngine: false, hasBattery: false });
    expect(none).toEqual([
      "front34",
      "side",
      "rear34",
      "top",
      "low",
      "interior",
      "engineering",
    ]);
    expect(none).toContain(DEFAULT_PRESET);
  });

  it("ghosts the body only for views that look inside", () => {
    expect(PRESET_GHOST.front34).toBe(0);
    expect(PRESET_GHOST.engine).toBe(1);
    expect(PRESET_GHOST.interior).toBeGreaterThan(0);
    expect(isPresetId("engine")).toBe(true);
    expect(isPresetId("orbit")).toBe(false);
  });
});
