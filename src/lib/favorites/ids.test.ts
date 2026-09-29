import { describe, expect, it } from "vitest";
import {
  addId,
  chunk,
  isUuid,
  mergeIdLists,
  normalizeId,
  parseIdList,
  parseIdsParam,
  removeId,
  sameIds,
  sanitizeIds,
  serializeIdList,
  withoutIds,
} from "./ids";
import { MAX_GUEST_FAVORITES } from "./constants";

const A = "0b0f6e1c-1f5a-4a39-9d0e-2b1f0a7a1111";
const B = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const C = "550e8400-e29b-41d4-a716-446655440000";

/** n distinct valid uuids. */
function ids(n: number): string[] {
  return Array.from(
    { length: n },
    (_, i) => `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`,
  );
}

describe("isUuid / normalizeId", () => {
  it("accepts canonical uuids in either case", () => {
    expect(isUuid(A)).toBe(true);
    expect(isUuid(A.toUpperCase())).toBe(true);
    expect(normalizeId(` ${A.toUpperCase()} `)).toBe(A);
  });

  it("rejects everything else", () => {
    for (const value of [
      "",
      "not-a-uuid",
      `${A}x`,
      A.replace(/-/g, ""),
      "../../etc/passwd",
      42,
      null,
      undefined,
      {},
    ]) {
      expect(isUuid(value)).toBe(false);
      expect(normalizeId(value)).toBeNull();
    }
  });
});

describe("parseIdList", () => {
  it("reads a stored list", () => {
    expect(parseIdList(JSON.stringify([A, B]))).toEqual([A, B]);
  });

  it("survives malformed or hostile storage", () => {
    expect(parseIdList(null)).toEqual([]);
    expect(parseIdList("")).toEqual([]);
    expect(parseIdList("{not json")).toEqual([]);
    expect(parseIdList('"a string"')).toEqual([]);
    expect(parseIdList('{"0":"x"}')).toEqual([]);
    expect(parseIdList("null")).toEqual([]);
  });

  it("drops invalid entries and duplicates, keeping order", () => {
    const raw = JSON.stringify([B, "junk", A, 7, B, null, A.toUpperCase(), C]);
    expect(parseIdList(raw)).toEqual([B, A, C]);
  });

  it(`caps at ${MAX_GUEST_FAVORITES}`, () => {
    const many = ids(MAX_GUEST_FAVORITES + 25);
    const parsed = parseIdList(JSON.stringify(many));
    expect(parsed).toHaveLength(MAX_GUEST_FAVORITES);
    expect(parsed[0]).toBe(many[0]);
  });

  it("round-trips through serializeIdList", () => {
    expect(parseIdList(serializeIdList([C, A]))).toEqual([C, A]);
  });
});

describe("addId / removeId", () => {
  it("adds newest first", () => {
    expect(addId([A], B)).toEqual({ ids: [B, A], added: true, full: false });
  });

  it("is idempotent", () => {
    expect(addId([A, B], A.toUpperCase())).toEqual({
      ids: [A, B],
      added: false,
      full: false,
    });
  });

  it("refuses when full instead of dropping the oldest", () => {
    const full = ids(3);
    const result = addId(full, A, 3);
    expect(result).toEqual({ ids: full, added: false, full: true });
  });

  it("ignores an invalid id", () => {
    expect(addId([A], "nope")).toEqual({ ids: [A], added: false, full: false });
  });

  it("removes, and removing an absent id is harmless", () => {
    expect(removeId([A, B, C], B)).toEqual([A, C]);
    expect(removeId([A, C], B)).toEqual([A, C]);
    expect(removeId([A], "junk")).toEqual([A]);
  });
});

describe("mergeIdLists", () => {
  it("keeps the primary order, then the new ones from secondary", () => {
    expect(mergeIdLists([B, A], [C, A])).toEqual([B, A, C]);
  });

  it("caps and cleans", () => {
    expect(mergeIdLists([A, "junk"], [B, C], 2)).toEqual([A, B]);
  });
});

describe("parseIdsParam", () => {
  it("parses a comma list, validated and capped", () => {
    expect(parseIdsParam(`${A},junk,${B},${A}`, 50)).toEqual([A, B]);
    expect(parseIdsParam(ids(60).join(","), 50)).toHaveLength(50);
    expect(parseIdsParam(null, 50)).toEqual([]);
    expect(parseIdsParam("", 50)).toEqual([]);
  });
});

describe("small helpers", () => {
  it("withoutIds, chunk and sameIds", () => {
    expect(withoutIds([A, B, C], [B])).toEqual([A, C]);
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
    expect(sameIds([A, B], [A, B])).toBe(true);
    expect(sameIds([A, B], [B, A])).toBe(false);
  });

  it("sanitizeIds handles non-arrays and a zero cap", () => {
    expect(sanitizeIds("x")).toEqual([]);
    expect(sanitizeIds([A], 0)).toEqual([]);
  });
});
