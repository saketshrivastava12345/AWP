import { describe, expect, it } from "vitest";
import { POSTER_NOTES, heroMode, type HeroModeInput } from "./hero-mode";

const base: HeroModeInput = {
  reducedMotion: false,
  webgl: true,
  tier: "high",
  setting: "auto",
  mobile: false,
  optIn: false,
  failed: false,
};

describe("heroMode", () => {
  it("draws the scene at the device's tier", () => {
    expect(heroMode(base)).toEqual({ kind: "scene", level: "high" });
    expect(heroMode({ ...base, tier: "medium" })).toEqual({
      kind: "scene",
      level: "medium",
    });
  });

  it("never draws a canvas under reduced motion, even when opted in", () => {
    expect(heroMode({ ...base, reducedMotion: true, optIn: true })).toEqual({
      kind: "poster",
      reason: "reduced-motion",
      canOptIn: false,
    });
  });

  it("shows the still without WebGL, and does not offer the scene", () => {
    expect(heroMode({ ...base, webgl: false })).toEqual({
      kind: "poster",
      reason: "no-webgl",
      canOptIn: false,
    });
  });

  it("waits while WebGL or the tier is unknown", () => {
    expect(heroMode({ ...base, webgl: null })).toMatchObject({ reason: "pending" });
    expect(heroMode({ ...base, tier: null })).toMatchObject({ reason: "pending" });
  });

  it("an explicit quality setting does not wait for the tier", () => {
    expect(heroMode({ ...base, tier: null, setting: "medium" })).toEqual({
      kind: "scene",
      level: "medium",
    });
  });

  it("keeps a low-power device on the still but lets the visitor opt in", () => {
    expect(heroMode({ ...base, tier: "low" })).toEqual({
      kind: "poster",
      reason: "low-power",
      canOptIn: true,
    });
    expect(heroMode({ ...base, tier: "low", optIn: true })).toEqual({
      kind: "scene",
      level: "low",
    });
  });

  it("an explicit setting wins over the device tier", () => {
    expect(heroMode({ ...base, tier: "low", setting: "high" })).toEqual({
      kind: "scene",
      level: "high",
    });
    expect(heroMode({ ...base, tier: "high", setting: "low" })).toMatchObject({
      reason: "low-power",
    });
  });

  it("gives phones the lighter recipe", () => {
    expect(heroMode({ ...base, mobile: true })).toEqual({ kind: "scene", level: "low" });
  });

  it("falls back to the still after a failure, without offering a retry loop", () => {
    expect(heroMode({ ...base, failed: true, optIn: true })).toEqual({
      kind: "poster",
      reason: "failed",
      canOptIn: false,
    });
  });

  it("explains every still except the transient one", () => {
    expect(POSTER_NOTES.pending).toBeNull();
    for (const reason of ["reduced-motion", "no-webgl", "low-power", "failed"] as const) {
      expect(POSTER_NOTES[reason]).toMatch(/still drawing/i);
    }
  });
});
