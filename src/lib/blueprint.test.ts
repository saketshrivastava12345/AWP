import { describe, expect, it } from "vitest";
import type { ViewerGroup } from "@/types/domain";
import { buildAnatomyTour } from "./anatomy-tour";
import {
  BLUEPRINT_INTRO,
  BLUEPRINT_ORDER,
  blueprintFrame,
  blueprintGroups,
  blueprintLook,
  buildBlueprint,
  finaleCard,
  focusCardAt,
  groupCard,
  stepGroups,
} from "./blueprint";
import { ENCYCLOPEDIA, makeDetail, part } from "@/test/variant-fixture";

const PARTS = [
  ...ENCYCLOPEDIA,
  part("alloy-wheel", "wheels"),
  part("wheel-hub", "wheels"),
  part("abs-module", "brakes"),
  part("exhaust-manifold", "exhaust"),
  part("catalytic-converter", "exhaust"),
  part("exhaust-silencer", "exhaust"),
  part("engine-control-unit", "electronics"),
  part("sensor-suite", "electronics"),
  part("wiring-harness", "electronics"),
  part("alternator", "electronics"),
];

/** What the 3D car draws, by powertrain (viewer-config drawnGroups). */
const COMBUSTION: ViewerGroup[] = [
  "body",
  "transmission",
  "suspension",
  "brakes",
  "wheels",
  "interior",
  "electronics",
  "engine",
  "exhaust",
];
const ELECTRIC: ViewerGroup[] = [
  "body",
  "transmission",
  "suspension",
  "brakes",
  "wheels",
  "interior",
  "electronics",
  "battery",
];
const HYBRID: ViewerGroup[] = [...COMBUSTION, "battery"];

function blueprintFor(
  overrides: Parameters<typeof makeDetail>[0],
  drawn: ViewerGroup[],
) {
  const detail = makeDetail(overrides);
  const tour = buildAnatomyTour(detail, PARTS);
  return buildBlueprint(detail, tour, PARTS, blueprintGroups(drawn));
}

describe("blueprint order", () => {
  it("comes apart outside in: shell, wheels, brakes, suspension, then the powertrain", () => {
    expect(blueprintGroups(COMBUSTION)).toEqual([
      "body",
      "wheels",
      "brakes",
      "suspension",
      "engine",
      "transmission",
      "exhaust",
      "interior",
      "electronics",
    ]);
  });

  it("an EV takes off motors and battery, and has no engine or exhaust", () => {
    const order = blueprintGroups(ELECTRIC);
    expect(order).toContain("battery");
    expect(order).not.toContain("engine");
    expect(order).not.toContain("exhaust");
    expect(order.indexOf("battery")).toBeLessThan(order.indexOf("transmission"));
  });

  it("a hybrid has both, engine before battery", () => {
    const order = blueprintGroups(HYBRID);
    expect(order.indexOf("engine")).toBeLessThan(order.indexOf("battery"));
    expect(order).toContain("exhaust");
  });

  it("never invents a group the car does not draw", () => {
    // An engine whose position is not recorded is not drawn, so not taken off.
    const withoutEngine = COMBUSTION.filter((group) => group !== "engine");
    expect(blueprintGroups(withoutEngine)).not.toContain("engine");
    for (const group of blueprintGroups(withoutEngine))
      expect(BLUEPRINT_ORDER).toContain(group);
  });
});

describe("beats", () => {
  const count = 9;

  it("numbers the cards: opening, drawing, one per group, finale", () => {
    expect(BLUEPRINT_INTRO).toBe(1);
    expect(groupCard(0)).toBe(2);
    expect(finaleCard(count)).toBe(count + 2);
  });

  it("starts as the rendered car, assembled", () => {
    const frame = blueprintFrame(0, count);
    expect(frame.drawing).toBe(0);
    expect(frame.explode.every((value) => value === 0)).toBe(true);
    expect(frame.labels).toBe(0);
  });

  it("the drawing card is the blueprint, still assembled, with its dimensions", () => {
    const frame = blueprintFrame(BLUEPRINT_INTRO, count);
    expect(frame.drawing).toBe(1);
    expect(frame.dimensions).toBe(1);
    expect(frame.explode.every((value) => value === 0)).toBe(true);
  });

  it("takes exactly one more group off per card", () => {
    for (let index = 0; index < count; index += 1) {
      const frame = blueprintFrame(groupCard(index), count);
      frame.explode.forEach((value, group) => {
        expect(value).toBe(group <= index ? 1 : 0);
      });
    }
  });

  it("moves only one group at a time between cards", () => {
    for (let beat = 0; beat <= finaleCard(count); beat += 0.05) {
      const moving = blueprintFrame(beat, count).explode.filter(
        (value) => value > 0 && value < 1,
      );
      expect(moving.length).toBeLessThanOrEqual(1);
    }
  });

  it("drops the dimension lines once the car starts to come apart", () => {
    expect(blueprintFrame(groupCard(0), count).dimensions).toBe(0);
  });

  it("labels every group only at the finale", () => {
    expect(blueprintFrame(finaleCard(count) - 1, count).labels).toBe(0);
    expect(blueprintFrame(finaleCard(count), count).labels).toBe(1);
  });

  it("is a pure function of the beat, so scrolling back reassembles exactly", () => {
    const forward = blueprintFrame(4.37, count);
    blueprintFrame(finaleCard(count), count);
    expect(blueprintFrame(4.37, count)).toEqual(forward);
    expect(blueprintFrame(0.1, count).explode.every((value) => value === 0)).toBe(true);
  });

  it("holds still at each card and is continuous between them", () => {
    const at = (beat: number) => blueprintFrame(beat, count).explode[2] ?? 0;
    expect(at(groupCard(2) - 1 + 0.1)).toBe(0);
    expect(at(groupCard(2) - 0.1)).toBe(1);
    for (let beat = 2; beat < 5; beat += 0.01)
      expect(Math.abs(at(beat + 0.01) - at(beat))).toBeLessThan(0.05);
  });

  it("focuses the part being taken off as soon as it starts to move", () => {
    const card = groupCard(3);
    // Still on the previous card, but the next group has started to move.
    expect(focusCardAt(card - 0.7, count)).toBe(card);
    expect(focusCardAt(card, count)).toBe(card);
    expect(focusCardAt(card + 0.15, count)).toBe(card);
    expect(focusCardAt(0, count)).toBe(0);
    expect(focusCardAt(99, count)).toBe(finaleCard(count));
  });
});

describe("look", () => {
  const groups = blueprintGroups(COMBUSTION);

  it("the opening is the solid car", () => {
    expect(blueprintLook(0, groups)).toMatchObject({ ghost: 0, highlight: null });
  });

  it("a group card lights that group and dims the rest", () => {
    expect(blueprintLook(groupCard(4), groups)).toMatchObject({
      ghost: 1,
      highlight: "engine",
      restDim: 1,
    });
  });

  it("the drawing and the finale light nothing in particular", () => {
    expect(blueprintLook(BLUEPRINT_INTRO, groups).highlight).toBeNull();
    expect(blueprintLook(finaleCard(groups.length), groups).highlight).toBeNull();
  });
});

describe("buildBlueprint", () => {
  it("has a drawing card, one card per group in order, and a finale", () => {
    const steps = blueprintFor({}, COMBUSTION);
    expect(steps[0]?.kind).toBe("intro");
    expect(steps.at(-1)?.kind).toBe("finale");
    expect(stepGroups(steps)).toEqual(blueprintGroups(COMBUSTION));
  });

  it("the drawing lists only published dimensions", () => {
    const steps = blueprintFor(
      { dimensions: { wheelbase_mm: null, ground_clearance_mm: null } },
      COMBUSTION,
    );
    const labels = steps[0]?.stats.map((stat) => stat.label);
    expect(labels).toEqual(["Length", "Width", "Height"]);
    expect(steps[0]?.title).toBe("4,573 × 1,852 × 1,279 mm");
  });

  it("does not claim dimensions a car does not publish", () => {
    const steps = blueprintFor({ dimensions: null }, COMBUSTION);
    expect(steps[0]?.stats).toEqual([]);
    expect(steps[0]?.title).toBe("The blueprint");
  });

  it("the engine card carries the engine's own figures", () => {
    const steps = blueprintFor({}, COMBUSTION);
    const engine = steps.find((step) => step.group === "engine");
    expect(engine?.title).toBe("4.0-litre Flat-6");
    expect(engine?.stats).toContainEqual({ label: "Displacement", value: "3,996 cc" });
    expect(engine?.stats).toContainEqual({ label: "Layout", value: "Flat-6" });
  });

  it("an EV gets one motors-and-battery card from both tour stops", () => {
    const steps = blueprintFor(
      {
        fuel: "electric",
        position: null,
        engine: null,
        transmission: { type: "single_speed", gears: 1, name: "Single-speed" },
        ev: { motor_count: 3, battery_kwh: null, range_km: 600, range_standard: "wltp" },
      },
      ELECTRIC,
    );
    expect(steps.some((step) => step.group === "engine")).toBe(false);
    expect(steps.some((step) => step.group === "exhaust")).toBe(false);
    const battery = steps.find((step) => step.group === "battery");
    // Capacity is not published: the title says only what is known.
    expect(battery?.title).toBe("3 motors");
    expect(battery?.stats.map((stat) => stat.label)).toEqual(
      expect.arrayContaining(["Motors", "Range"]),
    );
    expect(battery?.stats.some((stat) => stat.label === "Capacity")).toBe(false);
  });

  it("components link to parts of the right group, variant's own first", () => {
    const steps = blueprintFor(
      {
        parts: [
          {
            part: part("exhaust-silencer", "exhaust"),
            detail: "Titanium silencer.",
          },
        ],
      },
      COMBUSTION,
    );
    const exhaust = steps.find((step) => step.group === "exhaust");
    expect(exhaust?.components[0]).toMatchObject({
      slug: "exhaust-silencer",
      note: "Titanium silencer.",
    });
    const brakes = steps.find((step) => step.group === "brakes");
    expect(brakes?.components.map((component) => component.slug)).not.toContain("tyre");
    const wheels = steps.find((step) => step.group === "wheels");
    expect(wheels?.components.map((component) => component.slug)).toContain("tyre");
  });

  it("omits figures that are not published rather than filling them", () => {
    const steps = blueprintFor({}, COMBUSTION);
    // The fixture has no fuel row: the exhaust card has no emissions figures.
    expect(steps.find((step) => step.group === "exhaust")?.stats).toEqual([]);
    for (const step of steps)
      for (const stat of step.stats) expect(stat.value).not.toMatch(/null|undefined|NaN/);
  });

  it("the finale counts the systems it shows", () => {
    const steps = blueprintFor({}, COMBUSTION);
    expect(steps.at(-1)?.body).toMatch(/^9 systems/);
  });
});
