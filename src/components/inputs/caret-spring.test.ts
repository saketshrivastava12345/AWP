import { describe, expect, it } from "vitest";
import {
  CARET_SPRING,
  criticalDamping,
  isSettled,
  simulate,
  stepSpring,
  type SpringConfig,
} from "./caret-spring";

describe("stepSpring", () => {
  it("moves towards the target and settles on it", () => {
    const { settledMs, positions } = simulate(0, 100, CARET_SPRING);
    expect(positions.at(-1)).toBeCloseTo(100, 0);
    expect(settledMs).toBeLessThan(600);
    // The first frame already moves in the right direction.
    expect(positions[0]).toBeGreaterThan(0);
  });

  it("settles from either side and from a standing start", () => {
    expect(simulate(100, 0, CARET_SPRING).positions.at(-1)).toBeCloseTo(0, 0);
    expect(simulate(40, 40, CARET_SPRING).settledMs).toBeLessThanOrEqual(1000 / 60);
  });

  it("is a no-op for a zero, negative or non-finite step", () => {
    const state = { position: 3, velocity: 7 };
    expect(stepSpring(state, 50, CARET_SPRING, 0)).toBe(state);
    expect(stepSpring(state, 50, CARET_SPRING, -16)).toBe(state);
    expect(stepSpring(state, 50, CARET_SPRING, Number.NaN)).toBe(state);
  });

  it("does not mutate the state it is given", () => {
    const state = { position: 0, velocity: 0 };
    stepSpring(state, 50, CARET_SPRING, 16);
    expect(state).toEqual({ position: 0, velocity: 0 });
  });

  it("stays stable across a very long frame (a tab returning from the background)", () => {
    const state = stepSpring({ position: 0, velocity: 0 }, 100, CARET_SPRING, 800);
    expect(Number.isFinite(state.position)).toBe(true);
    expect(state.position).toBeCloseTo(100, 0);
    expect(Math.abs(state.velocity)).toBeLessThan(1);
  });

  it("gives the same answer whether a frame is delivered whole or in pieces", () => {
    const whole = stepSpring({ position: 0, velocity: 0 }, 100, CARET_SPRING, 32);
    let pieces = { position: 0, velocity: 0 };
    for (let i = 0; i < 8; i += 1) pieces = stepSpring(pieces, 100, CARET_SPRING, 4);
    expect(pieces.position).toBeCloseTo(whole.position, 1);
  });
});

describe("damping", () => {
  const base = { mass: 1, stiffness: 520 };

  it("overshoots when under-damped and not when critically damped", () => {
    const under: SpringConfig = { ...base, damping: criticalDamping(base) * 0.4 };
    const critical: SpringConfig = { ...base, damping: criticalDamping(base) };
    expect(simulate(0, 100, under).overshoot).toBeGreaterThan(5);
    expect(simulate(0, 100, critical).overshoot).toBeLessThan(0.5);
  });

  it("the caret spring overshoots only by a whisker", () => {
    const { overshoot } = simulate(0, 200, CARET_SPRING);
    expect(overshoot).toBeGreaterThan(0);
    expect(overshoot).toBeLessThan(8);
  });

  it("a heavier spring takes longer to settle", () => {
    const heavy: SpringConfig = { ...CARET_SPRING, mass: 4 };
    expect(simulate(0, 100, heavy).settledMs).toBeGreaterThan(
      simulate(0, 100, CARET_SPRING).settledMs,
    );
  });
});

describe("isSettled", () => {
  it("needs both a small distance and a small velocity", () => {
    expect(isSettled({ position: 100.01, velocity: 0.1 }, 100)).toBe(true);
    expect(isSettled({ position: 100.01, velocity: 40 }, 100)).toBe(false);
    expect(isSettled({ position: 90, velocity: 0 }, 100)).toBe(false);
  });
});
