import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "./supabase-url";

const ORIGIN = "https://cxuastpoixbhpmsmxqcj.supabase.co";

describe("normalizeSupabaseUrl", () => {
  it("leaves a correct project URL alone", () => {
    expect(normalizeSupabaseUrl(ORIGIN)).toEqual({ url: ORIGIN, changed: false });
    expect(normalizeSupabaseUrl("http://127.0.0.1:54321")).toEqual({
      url: "http://127.0.0.1:54321",
      changed: false,
    });
  });

  it("drops a pasted REST or other API endpoint suffix", () => {
    for (const suffix of ["/rest/v1", "/rest/v1/", "/auth/v1", "/storage/v1/object"]) {
      expect(normalizeSupabaseUrl(`${ORIGIN}${suffix}`)).toEqual({
        url: ORIGIN,
        changed: true,
      });
    }
  });

  it("trims whitespace and a trailing slash", () => {
    expect(normalizeSupabaseUrl(`  ${ORIGIN}/ `)).toEqual({ url: ORIGIN, changed: true });
  });

  it("turns a dashboard project link into the API URL", () => {
    expect(
      normalizeSupabaseUrl(
        "https://supabase.com/dashboard/project/cxuastpoixbhpmsmxqcj/settings/api",
      ),
    ).toEqual({ url: ORIGIN, changed: true });
  });

  it("keeps an unrecognised path and anything unparsable", () => {
    expect(normalizeSupabaseUrl("https://example.org/supabase").url).toBe(
      "https://example.org/supabase",
    );
    expect(normalizeSupabaseUrl("not a url")).toEqual({
      url: "not a url",
      changed: false,
    });
  });
});
