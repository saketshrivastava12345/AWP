import { describe, expect, it } from "vitest";
import type { TourStop, TourStopId } from "@/lib/anatomy-tour";
import { MAX_BEAT_STATS, beatAt, beatNumber, pickHeroBeats } from "./hero-beats";

function stop(id: TourStopId, stats = 2): TourStop {
  return {
    id,
    group: "body",
    label: id[0]?.toUpperCase() + id.slice(1),
    title: `${id} title`,
    body: `${id} body`,
    stats: Array.from({ length: stats }, (_, index) => ({
      label: `${id} ${index}`,
      value: String(index),
    })),
    features: [],
    components: [],
    callouts: [],
  };
}

const combustion = [
  "design",
  "engine",
  "drivetrain",
  "chassis",
  "brakes",
  "interior",
  "performance",
].map((id) => stop(id as TourStopId));
const electric = [
  "design",
  "electric",
  "battery",
  "drivetrain",
  "chassis",
  "brakes",
  "performance",
].map((id) => stop(id as TourStopId));

describe("pickHeroBeats", () => {
  it("tells design, engine, brakes and performance for a combustion car", () => {
    expect(
      pickHeroBeats(combustion, { engineDrawn: true }).map((beat) => beat.id),
    ).toEqual(["design", "engine", "brakes", "performance"]);
  });

  it("looks at the motors of an electric car", () => {
    expect(
      pickHeroBeats(electric, { engineDrawn: false }).map((beat) => beat.id),
    ).toEqual(["design", "electric", "brakes", "performance"]);
  });

  it("skips the engine beat when the engine is not drawn (position unrecorded)", () => {
    expect(
      pickHeroBeats(combustion, { engineDrawn: false }).map((beat) => beat.id),
    ).toEqual(["design", "brakes", "performance"]);
  });

  it("carries the tour's own copy and at most MAX_BEAT_STATS figures", () => {
    const [design] = pickHeroBeats([stop("design", 7)], { engineDrawn: true });
    expect(design).toMatchObject({ title: "design title", body: "design body" });
    expect(design?.stats).toHaveLength(MAX_BEAT_STATS);
  });

  it("returns no beats for an empty tour", () => {
    expect(pickHeroBeats([], { engineDrawn: true })).toEqual([]);
  });
});

describe("beatAt", () => {
  const centers = [100, 300, 500];

  it("is 0 before the first block and the last index after the last", () => {
    expect(beatAt(0, centers)).toBe(0);
    expect(beatAt(900, centers)).toBe(2);
  });

  it("interpolates between block centres", () => {
    expect(beatAt(100, centers)).toBe(0);
    expect(beatAt(200, centers)).toBeCloseTo(0.5);
    expect(beatAt(450, centers)).toBeCloseTo(1.75);
  });

  it("handles no blocks", () => {
    expect(beatAt(123, [])).toBe(0);
  });
});

describe("beatNumber", () => {
  it("pads both numbers", () => {
    expect(beatNumber(2, 4)).toBe("02 / 04");
  });
});
