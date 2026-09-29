import { describe, expect, it } from "vitest";
import { explainFetchFailure, isPlaceholderHost } from "./diagnose";

function fetchFailed(code: string, message = code): Error {
  // Node's undici wraps the socket error as the cause of "fetch failed".
  return new TypeError("fetch failed", {
    cause: Object.assign(new Error(message), { code }),
  });
}

describe("isPlaceholderHost", () => {
  it("recognises the .env.example hosts", () => {
    expect(isPlaceholderHost("your-project-ref.supabase.co")).toBe(true);
    expect(isPlaceholderHost("xxxxxxxx.supabase.co")).toBe(true);
    expect(isPlaceholderHost("abcdefghijkl.supabase.co")).toBe(false);
    expect(isPlaceholderHost("127.0.0.1:54321")).toBe(false);
  });
});

describe("explainFetchFailure", () => {
  it("reads the system code from the cause chain", () => {
    const failure = explainFetchFailure(
      fetchFailed("ENOTFOUND", "getaddrinfo ENOTFOUND x"),
      "x.supabase.co",
    );
    expect(failure.code).toBe("ENOTFOUND");
    expect(failure.summary).toContain("could not be looked up");
    expect(failure.fix).toContain("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("names the example host before anything else", () => {
    const failure = explainFetchFailure(
      fetchFailed("ENOTFOUND"),
      "your-project-ref.supabase.co",
    );
    expect(failure.summary).toContain(".env.example");
  });

  it("distinguishes refused, timed out, unreachable, certificate and reset", () => {
    expect(explainFetchFailure(fetchFailed("ECONNREFUSED"), "h").summary).toContain(
      "refused",
    );
    expect(
      explainFetchFailure(fetchFailed("UND_ERR_CONNECT_TIMEOUT"), "h").summary,
    ).toContain("timed out");
    expect(explainFetchFailure(fetchFailed("ENETUNREACH"), "h").fix).toContain(
      "ipv4first",
    );
    expect(
      explainFetchFailure(fetchFailed("UNABLE_TO_VERIFY_LEAF_SIGNATURE"), "h").fix,
    ).toContain("NODE_EXTRA_CA_CERTS");
    expect(explainFetchFailure(fetchFailed("ECONNRESET"), "h").summary).toContain(
      "cut off",
    );
  });

  it("falls back to the doctor for anything else", () => {
    const failure = explainFetchFailure(new TypeError("fetch failed"), "h");
    expect(failure.code).toBeNull();
    expect(failure.fix).toContain("npm run doctor");
  });
});
