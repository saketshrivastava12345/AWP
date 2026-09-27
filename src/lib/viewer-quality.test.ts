import { describe, expect, it } from "vitest";
import {
  QUALITY_PROFILES,
  adaptQuality,
  effectiveLevel,
  initialAdaptive,
  parseQualitySetting,
  selectQuality,
  stepQuality,
  type DeviceSignals,
} from "./viewer-quality";

const desktop: DeviceSignals = {
  coarsePointer: false,
  screenMin: 1080,
  deviceMemory: 8,
  cores: 12,
  renderer: null,
  saveData: false,
};

describe("selectQuality", () => {
  it("drops software renderers to LOW whatever else the device reports", () => {
    const swiftshader =
      "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)";
    expect(selectQuality({ ...desktop, renderer: swiftshader }).level).toBe("low");
    expect(
      selectQuality({ ...desktop, renderer: "llvmpipe (LLVM 15.0.7, 256 bits)" }).level,
    ).toBe("low");
    expect(
      selectQuality({ ...desktop, renderer: "Microsoft Basic Render Driver" }).level,
    ).toBe("low");
  });

  it("gives dedicated GPUs and Apple Silicon HIGH", () => {
    expect(
      selectQuality({
        ...desktop,
        renderer:
          "ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      }).level,
    ).toBe("high");
    expect(
      selectQuality({
        ...desktop,
        renderer: "ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11)",
      }).level,
    ).toBe("high");
    expect(
      selectQuality({
        ...desktop,
        renderer:
          "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)",
      }).level,
    ).toBe("high");
  });

  it("gives integrated GPUs MEDIUM", () => {
    expect(
      selectQuality({
        ...desktop,
        renderer:
          "ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)",
      }).level,
    ).toBe("medium");
    expect(
      selectQuality({
        ...desktop,
        renderer: "ANGLE (AMD, AMD Radeon(TM) Graphics Direct3D11)",
      }).level,
    ).toBe("medium");
  });

  it("is conservative on phones and gives tablets MEDIUM", () => {
    const phone: DeviceSignals = {
      ...desktop,
      coarsePointer: true,
      screenMin: 390,
      deviceMemory: 4,
      cores: 8,
      renderer: "Adreno (TM) 650",
    };
    expect(selectQuality(phone).level).toBe("low");
    expect(selectQuality({ ...phone, deviceMemory: 8 }).level).toBe("medium");
    expect(selectQuality({ ...phone, screenMin: 820 }).level).toBe("medium");
  });

  it("respects low memory, few cores and data saver", () => {
    expect(selectQuality({ ...desktop, deviceMemory: 2 }).level).toBe("low");
    expect(selectQuality({ ...desktop, cores: 2 }).level).toBe("low");
    expect(selectQuality({ ...desktop, saveData: true }).level).toBe("low");
  });

  it("uses cores to tell a Mac from an iPhone behind Safari's masked renderer", () => {
    expect(selectQuality({ ...desktop, renderer: "Apple GPU", cores: 10 }).level).toBe(
      "high",
    );
    expect(selectQuality({ ...desktop, renderer: "Apple GPU", cores: 4 }).level).toBe(
      "medium",
    );
  });

  it("falls back on CPU and memory when the GPU is unknown", () => {
    expect(selectQuality({ ...desktop, renderer: null }).level).toBe("high");
    expect(selectQuality({ ...desktop, renderer: null, cores: 4 }).level).toBe("medium");
  });
});

describe("quality levels", () => {
  it("steps within bounds", () => {
    expect(stepQuality("high", "down")).toBe("medium");
    expect(stepQuality("low", "down")).toBe("low");
    expect(stepQuality("low", "up")).toBe("medium");
    expect(stepQuality("high", "up")).toBe("high");
  });

  it("orders the profiles from most to least expensive", () => {
    const { high, medium, low } = QUALITY_PROFILES;
    expect(high.dpr[1]).toBeGreaterThan(medium.dpr[1]);
    expect(medium.dpr[1]).toBeGreaterThan(low.dpr[1]);
    expect(high.shadowMapSize).toBeGreaterThan(medium.shadowMapSize);
    expect(low.shadows).toBe(false);
    expect(low.reflector).toBe(false);
    expect(low.lowDetail).toBe(true);
    expect(low.glassTransmission).toBe(false);
    expect(high.envResolution).toBeGreaterThan(low.envResolution);
  });

  it("parses stored settings defensively", () => {
    expect(parseQualitySetting("high")).toBe("high");
    expect(parseQualitySetting("ultra")).toBe("auto");
    expect(parseQualitySetting(null)).toBe("auto");
  });
});

describe("adaptQuality", () => {
  it("steps down on decline and recovers once", () => {
    let state = initialAdaptive("high");
    state = adaptQuality(state, "decline");
    expect(state.level).toBe("medium");
    state = adaptQuality(state, "incline");
    expect(state.level).toBe("high");
    // Already recovered what was lost: no further climb.
    state = adaptQuality(state, "incline");
    expect(state.level).toBe("high");
  });

  it("never climbs above the device's own level", () => {
    const state = adaptQuality(initialAdaptive("medium"), "incline");
    expect(state.level).toBe("medium");
  });

  it("stops recovering after flip-flopping", () => {
    let state = initialAdaptive("high");
    state = adaptQuality(state, "decline"); // medium
    state = adaptQuality(state, "incline"); // high
    state = adaptQuality(state, "decline"); // medium, second decline
    state = adaptQuality(state, "incline");
    expect(state.level).toBe("medium");
    state = adaptQuality(state, "decline");
    expect(state.level).toBe("low");
    expect(adaptQuality(state, "decline")).toBe(state);
  });

  it("uses the explicit setting unless it is AUTO", () => {
    const adaptive = initialAdaptive("low");
    expect(effectiveLevel("high", adaptive)).toBe("high");
    expect(effectiveLevel("auto", adaptive)).toBe("low");
    expect(effectiveLevel("auto", null)).toBe("medium");
  });
});
