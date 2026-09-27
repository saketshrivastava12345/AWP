import { describe, expect, it } from "vitest";
import { formatCount, parseCount } from "./count-format";

describe("parseCount", () => {
  it("keeps the caller's string as the resting value", () => {
    const spec = parseCount("1,020 hp");
    expect(spec).toMatchObject({
      target: 1020,
      decimals: 0,
      suffix: " hp",
      final: "1,020 hp",
    });
  });

  it("reads decimals and a prefix", () => {
    expect(parseCount("~3.2 s")).toMatchObject({ target: 3.2, decimals: 1, prefix: "~" });
  });

  it("detects Indian digit grouping", () => {
    const spec = parseCount("₹ 1,23,45,678");
    expect(spec?.grouping).toBe("indian");
    expect(spec?.target).toBe(12345678);
    expect(formatCount(12345678, 0, "indian")).toBe("1,23,45,678");
  });

  it("returns null when there is nothing to count", () => {
    expect(parseCount("Not available")).toBeNull();
    expect(parseCount(Number.NaN)).toBeNull();
  });

  it("formats numbers deterministically", () => {
    expect(parseCount(510)?.final).toBe("510");
    expect(parseCount(12500)?.final).toBe("12,500");
    expect(parseCount(3.25)?.final).toBe("3.25");
    expect(parseCount(3, 1)?.final).toBe("3.0");
  });

  it("formats intermediate values in the same shape", () => {
    expect(formatCount(1234.567, 1, "western")).toBe("1,234.6");
    expect(formatCount(999, 0, "western")).toBe("999");
  });
});
