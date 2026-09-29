import type { TourStop } from "@/lib/anatomy-tour";

/**
 * The home page story, as data: a few beats chosen from the featured car's
 * anatomy tour (src/lib/anatomy-tour.ts), so every figure on a card is that
 * car's own catalogue row and every sentence is the tour's general
 * engineering copy — nothing is written for the home page that the car's own
 * page would not also say.
 *
 * Pure and client-safe: the story component and the 3D scene share the beat
 * ids, and the scroll mapping is unit-tested.
 */

/** Beats the scene knows how to frame, in the order they can appear. */
export const HERO_BEAT_IDS = [
  "design",
  "engine",
  "electric",
  "brakes",
  "performance",
] as const;

export type HeroBeatId = (typeof HERO_BEAT_IDS)[number];

export type HeroBeat = {
  id: HeroBeatId;
  /** Short name for the progress rail, e.g. "Engine". */
  label: string;
  title: string;
  body: string;
  /** Published figures only; a missing figure is left out, never shown as a gap. */
  stats: { label: string; value: string }[];
};

/** Figures per card: enough to be specific, few enough to read over a moving car. */
export const MAX_BEAT_STATS = 4;

/**
 * Choose the story's beats from a car's tour: its design, its power source,
 * its brakes, and the performance they add up to.
 *
 * The power-source beat looks inside the car at the engine or the motors. An
 * engine whose position is not recorded is not drawn by the 3D car (placing
 * one would be a guess), so its beat is skipped rather than pointing the
 * camera at an empty bay; the car's own page still describes it.
 */
export function pickHeroBeats(
  stops: readonly TourStop[],
  { engineDrawn }: { engineDrawn: boolean },
): HeroBeat[] {
  const byId = new Map(stops.map((stop) => [stop.id, stop]));
  const wanted: HeroBeatId[] = [
    "design",
    engineDrawn && byId.has("engine") ? "engine" : "electric",
    "brakes",
    "performance",
  ];

  const beats: HeroBeat[] = [];
  for (const id of wanted) {
    const stop = byId.get(id);
    if (!stop) continue;
    beats.push({
      id,
      label: stop.label,
      title: stop.title,
      body: stop.body,
      stats: stop.stats.slice(0, MAX_BEAT_STATS),
    });
  }
  return beats;
}

/**
 * The scroll position as a continuous beat: 0 at the middle of the first
 * block, 1 at the middle of the second, 1.5 halfway between the second and
 * third. `probe` is the viewport's middle and `centers` each block's middle,
 * both in the same coordinates (top of the story).
 */
export function beatAt(probe: number, centers: readonly number[]): number {
  const count = centers.length;
  if (count === 0) return 0;
  const first = centers[0] ?? 0;
  const last = centers[count - 1] ?? first;
  if (probe <= first) return 0;
  if (probe >= last) return count - 1;
  for (let index = 0; index < count - 1; index += 1) {
    const from = centers[index] ?? 0;
    const to = centers[index + 1] ?? from;
    if (probe < to) return index + Math.max(0, (probe - from) / Math.max(1, to - from));
  }
  return count - 1;
}

/** "02 / 05" — the card's position in the story, the hero being 00. */
export function beatNumber(index: number, total: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(index)} / ${pad(total)}`;
}
