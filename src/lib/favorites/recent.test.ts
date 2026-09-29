import { describe, expect, it } from "vitest";
import {
  mergeRecent,
  parseRecentList,
  parseSyncLog,
  pruneSyncLog,
  pushRecent,
  serializeRecentList,
  shouldSyncView,
  type RecentEntry,
} from "./recent";
import { MAX_RECENT } from "./constants";

const A = "0b0f6e1c-1f5a-4a39-9d0e-2b1f0a7a1111";
const B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const C = "550e8400-e29b-41d4-a716-446655440000";

function id(i: number): string {
  return `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
}

describe("pushRecent", () => {
  it("puts the latest view first", () => {
    let list: RecentEntry[] = [];
    list = pushRecent(list, A, 1);
    list = pushRecent(list, B, 2);
    list = pushRecent(list, C, 3);
    expect(list.map((entry) => entry.id)).toEqual([C, B, A]);
  });

  it("moves a repeat view to the front instead of duplicating it", () => {
    const list = pushRecent(
      [
        { id: B, at: 2 },
        { id: A, at: 1 },
      ],
      A,
      5,
    );
    expect(list).toEqual([
      { id: A, at: 5 },
      { id: B, at: 2 },
    ]);
  });

  it(`keeps at most ${MAX_RECENT}`, () => {
    let list: RecentEntry[] = [];
    for (let i = 0; i < MAX_RECENT + 5; i++) list = pushRecent(list, id(i), i + 1);
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0]?.id).toBe(id(MAX_RECENT + 4));
  });

  it("ignores an invalid id", () => {
    expect(pushRecent([{ id: A, at: 1 }], "junk", 2)).toEqual([{ id: A, at: 1 }]);
  });
});

describe("parseRecentList", () => {
  it("round-trips", () => {
    const list = [
      { id: B, at: 20 },
      { id: A, at: 10 },
    ];
    expect(parseRecentList(serializeRecentList(list))).toEqual(list);
  });

  it("accepts bare ids with no time, and drops junk and duplicates", () => {
    const raw = JSON.stringify([A, { id: B, at: 9 }, { id: "x" }, 5, { id: A, at: 3 }]);
    expect(parseRecentList(raw)).toEqual([
      { id: A, at: 0 },
      { id: B, at: 9 },
    ]);
  });

  it("survives malformed storage", () => {
    expect(parseRecentList("[")).toEqual([]);
    expect(parseRecentList("{}")).toEqual([]);
    expect(parseRecentList(null)).toEqual([]);
    expect(parseRecentList(JSON.stringify([{ id: A, at: "soon" }]))).toEqual([
      { id: A, at: 0 },
    ]);
  });
});

describe("mergeRecent", () => {
  it("orders the union most recent first and keeps each car's latest time", () => {
    const local = [
      { id: A, at: 50 },
      { id: B, at: 10 },
    ];
    const account = [
      { id: B, at: 40 },
      { id: C, at: 30 },
    ];
    expect(mergeRecent(local, account)).toEqual([
      { id: A, at: 50 },
      { id: B, at: 40 },
      { id: C, at: 30 },
    ]);
  });

  it("caps the merged list", () => {
    const a = Array.from({ length: 8 }, (_, i) => ({ id: id(i), at: 100 - i }));
    const b = Array.from({ length: 8 }, (_, i) => ({ id: id(i + 8), at: 50 - i }));
    const merged = mergeRecent(a, b, MAX_RECENT);
    expect(merged).toHaveLength(MAX_RECENT);
    expect(merged[0]?.id).toBe(id(0));
  });

  it("keeps stored order for untimed entries", () => {
    const merged = mergeRecent(
      [
        { id: A, at: 0 },
        { id: B, at: 0 },
      ],
      [{ id: C, at: 0 }],
    );
    expect(merged.map((entry) => entry.id)).toEqual([A, B, C]);
  });
});

describe("view sync throttle", () => {
  const TEN_MINUTES = 10 * 60 * 1000;

  it("sends a first view, then waits ten minutes for the same car", () => {
    expect(shouldSyncView({}, A, 1_000, TEN_MINUTES)).toBe(true);
    const log = { [A]: 1_000 };
    expect(shouldSyncView(log, A, 1_000 + TEN_MINUTES - 1, TEN_MINUTES)).toBe(false);
    expect(shouldSyncView(log, A, 1_000 + TEN_MINUTES, TEN_MINUTES)).toBe(true);
    expect(shouldSyncView(log, B, 2_000, TEN_MINUTES)).toBe(true);
  });

  it("treats a clock that went backwards as stale", () => {
    expect(shouldSyncView({ [A]: 5_000 }, A, 1_000, TEN_MINUTES)).toBe(true);
  });

  it("parses and prunes the log", () => {
    expect(parseSyncLog("nope")).toEqual({});
    expect(parseSyncLog("[1]")).toEqual({});
    expect(parseSyncLog(JSON.stringify({ [A]: 5, junk: 3, [B]: "x" }))).toEqual({
      [A]: 5,
    });
    expect(
      pruneSyncLog({ [A]: 0, [B]: TEN_MINUTES }, TEN_MINUTES + 1, TEN_MINUTES),
    ).toEqual({
      [B]: TEN_MINUTES,
    });
  });
});
