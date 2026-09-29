import { describe, expect, it } from "vitest";
import { buildAnatomyTour, type TourStop } from "./anatomy-tour";

import { ENCYCLOPEDIA, bySlug, makeDetail } from "@/test/variant-fixture";

const ids = (stops: TourStop[]) => stops.map((stop) => stop.id);
const stop = (stops: TourStop[], id: TourStop["id"]) =>
  stops.find((entry) => entry.id === id)!;
const slugs = (entry: TourStop) => entry.components.map((component) => component.slug);

// ---------------------------------------------------------------------------

describe("buildAnatomyTour", () => {
  describe("stops follow the powertrain, like the spec sections do", () => {
    it("a combustion car tours its engine and has no battery stop", () => {
      const tour = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(ids(tour)).toEqual([
        "design",
        "engine",
        "drivetrain",
        "chassis",
        "brakes",
        "interior",
        "performance",
      ]);
    });

    it("an electric car has motors and a battery, and never an engine", () => {
      const tour = buildAnatomyTour(
        makeDetail({
          fuel: "electric",
          position: null,
          ev: { battery_kwh: 100, motor_count: 3 },
        }),
        ENCYCLOPEDIA,
      );
      expect(ids(tour)).not.toContain("engine");
      expect(ids(tour)).toContain("electric");
      expect(ids(tour)).toContain("battery");
      expect(stop(tour, "electric").title).toBe("3 electric motors");
      expect(stop(tour, "battery").title).toBe("100 kWh battery");
    });

    it("keeps an electric car's motor parts on the motors stop, not the battery", () => {
      const tour = buildAnatomyTour(
        makeDetail({
          fuel: "electric",
          position: null,
          ev: { motor_count: 3 },
          parts: [
            { part: bySlug("electric-traction-motor"), detail: "Carbon-sleeved rotors." },
          ],
        }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(tour, "electric"))[0]).toBe("electric-traction-motor");
      expect(slugs(stop(tour, "battery"))).not.toContain("electric-traction-motor");
      expect(slugs(stop(tour, "electric"))).not.toContain("traction-battery-pack");
    });

    it("a plug-in hybrid has an engine and a battery, but no separate motor stop", () => {
      const tour = buildAnatomyTour(
        makeDetail({ fuel: "phev", ev: { motor_count: 1 } }),
        ENCYCLOPEDIA,
      );
      expect(ids(tour)).toContain("engine");
      expect(ids(tour)).toContain("battery");
      expect(ids(tour)).not.toContain("electric");
      expect(slugs(stop(tour, "battery"))).toContain("on-board-charger");
    });

    it("a self-charging hybrid has no on-board charger to list", () => {
      const tour = buildAnatomyTour(makeDetail({ fuel: "hybrid" }), ENCYCLOPEDIA);
      expect(slugs(stop(tour, "battery"))).not.toContain("on-board-charger");
    });
  });

  describe("data honesty", () => {
    it("lists only figures that exist", () => {
      const tour = buildAnatomyTour(
        makeDetail({ performance: { top_speed_kmh: null, zero_to_100_s: null } }),
        ENCYCLOPEDIA,
      );
      const labels = stop(tour, "performance").stats.map((entry) => entry.label);
      expect(labels).not.toContain("Top speed");
      expect(labels).not.toContain("0–100 km/h");
      expect(labels).toContain("Power");
      for (const entry of tour) {
        for (const { value } of entry.stats)
          expect(value).not.toMatch(/null|undefined|NaN/);
      }
    });

    it("omits power-to-weight when the maker publishes no kerb weight", () => {
      const tour = buildAnatomyTour(
        makeDetail({ dimensions: { kerb_weight_kg: null } }),
        ENCYCLOPEDIA,
      );
      const labels = stop(tour, "performance").stats.map((entry) => entry.label);
      expect(labels).not.toContain("Power-to-weight");
    });

    it("never lists a turbocharger on a naturally aspirated engine", () => {
      const tour = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(slugs(stop(tour, "engine"))).not.toContain("turbocharger");
    });

    it("lists a turbocharger and intercooler on a twin-turbo engine", () => {
      const tour = buildAnatomyTour(
        makeDetail({ engine: { aspiration: "twin_turbo" } }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(tour, "engine"))).toEqual(
        expect.arrayContaining(["turbocharger", "intercooler"]),
      );
      expect(slugs(stop(tour, "engine"))).not.toContain("supercharger");
    });

    it("only shows carbon-ceramic brakes when they are catalogued", () => {
      const steel = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(slugs(stop(steel, "brakes"))).toContain("brake-disc");
      expect(slugs(stop(steel, "brakes"))).not.toContain("carbon-ceramic-disc");

      const ceramic = buildAnatomyTour(
        makeDetail({
          features: [{ slug: "carbon-ceramic-brakes", category: "Braking" }],
        }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(ceramic, "brakes"))).toContain("carbon-ceramic-disc");
      expect(stop(ceramic, "brakes").title).toBe("Carbon-ceramic brakes");
    });

    it("swaps coil springs for air springs only with catalogued air suspension", () => {
      const coil = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(slugs(stop(coil, "chassis"))).toContain("coil-spring");

      const air = buildAnatomyTour(
        makeDetail({ features: [{ slug: "air-suspension", category: "Chassis" }] }),
        ENCYCLOPEDIA,
      );
      expect(slugs(stop(air, "chassis"))).toContain("air-spring");
      expect(slugs(stop(air, "chassis"))).not.toContain("coil-spring");
    });

    it("says nothing about where the engine sits when that is not recorded", () => {
      const known = stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "engine");
      expect(known.body).toMatch(/behind the rear axle/);

      const unknown = stop(
        buildAnatomyTour(makeDetail({ position: null }), ENCYCLOPEDIA),
        "engine",
      );
      expect(unknown.body).not.toMatch(/axle|cabin/);
      expect(unknown.stats.map((entry) => entry.label)).not.toContain("Position");
    });
  });

  describe("variant-specific notes", () => {
    it("puts this car's catalogued parts first, with their notes", () => {
      const tour = buildAnatomyTour(
        makeDetail({
          parts: [
            {
              part: bySlug("double-wishbone"),
              detail:
                "Double-wishbone front suspension adapted from the 911 RSR race car.",
            },
          ],
        }),
        ENCYCLOPEDIA,
      );
      const first = stop(tour, "chassis").components[0];
      expect(first?.slug).toBe("double-wishbone");
      expect(first?.note).toMatch(/RSR/);
    });

    it("keeps each stop to a readable handful of components", () => {
      const tour = buildAnatomyTour(
        makeDetail({ engine: { aspiration: "twincharged" } }),
        ENCYCLOPEDIA,
      );
      for (const entry of tour) expect(entry.components.length).toBeLessThanOrEqual(4);
    });

    it("summarises each component in one sentence", () => {
      const tour = buildAnatomyTour(makeDetail(), ENCYCLOPEDIA);
      expect(stop(tour, "engine").components[0]?.summary).toMatch(
        /^What [a-z-]+ does\.$/,
      );
    });
  });

  describe("titles read naturally", () => {
    it("names the engine by size and layout", () => {
      expect(stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "engine").title).toBe(
        "4.0-litre Flat-6",
      );
    });

    it("names the gearbox and drive", () => {
      expect(stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "drivetrain").title).toBe(
        "7-speed dual-clutch · RWD",
      );
      const ev = buildAnatomyTour(
        makeDetail({
          fuel: "electric",
          drive: "awd",
          transmission: { type: "single_speed", gears: 1, name: "Single-speed" },
          ev: { motor_count: 2 },
        }),
        ENCYCLOPEDIA,
      );
      expect(stop(ev, "drivetrain").title).toBe("Single-speed · AWD");
    });

    it("leads the finale with 0–100 when it is published", () => {
      expect(
        stop(buildAnatomyTour(makeDetail(), ENCYCLOPEDIA), "performance").title,
      ).toBe("0–100 km/h in 3.4 s");
      const noSprint = buildAnatomyTour(
        makeDetail({ performance: { zero_to_100_s: null } }),
        ENCYCLOPEDIA,
      );
      expect(stop(noSprint, "performance").title).toBe("510 hp");
    });
  });
});
