import { describe, expect, it } from "vitest";
import { availableHotspots } from "./viewer-hotspots";

const ids = (build: Parameters<typeof availableHotspots>[0]) =>
  availableHotspots(build).map((hotspot) => hotspot.id);

describe("availableHotspots", () => {
  it("gives a petrol car an engine and exhaust but no battery or charging port", () => {
    const petrol = ids({
      powertrain: "combustion",
      enginePosition: "rear",
      plugIn: false,
    });
    expect(petrol).toEqual(
      expect.arrayContaining(["engine", "exhaust", "brakes", "wheels", "headlights"]),
    );
    expect(petrol).not.toContain("battery");
    expect(petrol).not.toContain("charging");
  });

  it("gives an EV a battery and charging port and no engine or exhaust", () => {
    const ev = ids({ powertrain: "electric", enginePosition: null, plugIn: true });
    expect(ev).toEqual(
      expect.arrayContaining(["battery", "charging", "suspension", "aero"]),
    );
    expect(ev).not.toContain("engine");
    expect(ev).not.toContain("exhaust");
  });

  it("only gives a hybrid a charging port when it plugs in", () => {
    expect(ids({ powertrain: "hybrid", enginePosition: "mid", plugIn: true })).toContain(
      "charging",
    );
    expect(
      ids({ powertrain: "hybrid", enginePosition: "front", plugIn: false }),
    ).not.toContain("charging");
  });

  it("hides the engine marker when no engine is drawn", () => {
    expect(
      ids({ powertrain: "combustion", enginePosition: null, plugIn: false }),
    ).not.toContain("engine");
  });
});
