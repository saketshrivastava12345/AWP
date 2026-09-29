import { describe, expect, it } from "vitest";
import { framesTooSlow } from "./fx-lite";

const frames = (count: number, ms: number) => Array.from({ length: count }, () => ms);

describe("framesTooSlow", () => {
  it("accepts a steady 60 fps", () => {
    expect(framesTooSlow(frames(120, 16.7))).toBe(false);
  });

  it("accepts a steady 120 fps", () => {
    expect(framesTooSlow(frames(240, 8.3))).toBe(false);
  });

  it("forgives a few long frames (a chunk parsing in the background)", () => {
    expect(framesTooSlow([...frames(110, 16.7), ...frames(8, 120)])).toBe(false);
  });

  it("flags a device that renders at rest under ~36 fps", () => {
    expect(framesTooSlow(frames(60, 33.4))).toBe(true);
  });

  it("flags one frame in five over 50 ms, even with a fast median", () => {
    expect(framesTooSlow([...frames(80, 16.7), ...frames(20, 66.7)])).toBe(true);
  });

  it("gives no verdict on a sample cut short", () => {
    expect(framesTooSlow([])).toBe(false);
    expect(framesTooSlow(frames(5, 200))).toBe(false);
  });
});
