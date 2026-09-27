import { describe, expect, it } from "vitest";
import {
  buildProvenance,
  hostLabel,
  provenanceStatus,
  safeExternalUrl,
  summarizeProvenance,
} from "./provenance";
import { makeDetail } from "./test-fixtures";

describe("provenanceStatus", () => {
  it("is verified only with a source and a verification date", () => {
    expect(
      provenanceStatus({
        source: "Porsche press kit",
        source_url: null,
        last_verified_at: "2026-09-12",
      }),
    ).toBe("verified");
  });

  it("is source-recorded with a source but no date", () => {
    expect(
      provenanceStatus({
        source: "Porsche press kit",
        source_url: null,
        last_verified_at: null,
      }),
    ).toBe("source-recorded");
  });

  it("counts a source URL on its own as a source", () => {
    expect(
      provenanceStatus({
        source: null,
        source_url: "https://www.porsche.com/international/models/911/",
        last_verified_at: null,
      }),
    ).toBe("source-recorded");
  });

  it("is unsourced with neither — and a date alone does not make it sourced", () => {
    expect(
      provenanceStatus({ source: null, source_url: null, last_verified_at: null }),
    ).toBe("unsourced");
    expect(
      provenanceStatus({
        source: "  ",
        source_url: null,
        last_verified_at: "2026-01-01",
      }),
    ).toBe("unsourced");
  });

  it("does not accept a non-http URL as a source", () => {
    expect(
      provenanceStatus({
        source: null,
        source_url: "javascript:alert(1)",
        last_verified_at: null,
      }),
    ).toBe("unsourced");
  });
});

describe("safeExternalUrl / hostLabel", () => {
  it("allows only http(s)", () => {
    expect(safeExternalUrl("https://example.org/a")).toBe("https://example.org/a");
    expect(safeExternalUrl("ftp://example.org")).toBeNull();
    expect(safeExternalUrl("not a url")).toBeNull();
    expect(safeExternalUrl(null)).toBeNull();
  });

  it("shortens a URL to its host", () => {
    expect(hostLabel("https://www.porsche.com/x/y")).toBe("porsche.com");
  });
});

describe("buildProvenance", () => {
  it("lists only the blocks this car has a row for", () => {
    const petrol = buildProvenance(makeDetail({ fuel: {} }));
    expect(petrol.map((entry) => entry.id)).toEqual([
      "vehicle",
      "performance",
      "dimensions",
      "engine",
      "transmission",
      "fuel",
    ]);

    const electric = buildProvenance(
      makeDetail({
        variant: { fuel_type: "electric" },
        engine: null,
        ev: { range_km: 600 },
      }),
    );
    expect(electric.map((entry) => entry.id)).toEqual([
      "vehicle",
      "performance",
      "dimensions",
      "transmission",
      "electric",
    ]);
  });

  it("reads each block's own columns and names a URL-only source by host", () => {
    const sections = buildProvenance(
      makeDetail({
        variant: { source: "Porsche published specifications" },
        performance: {
          source: "Porsche published specifications",
          source_url: "https://www.porsche.com/gt3",
          last_verified_at: "2026-09-12",
        },
        dimensions: { source: null, source_url: "https://newsroom.porsche.com/gt3" },
      }),
    );
    const byId = Object.fromEntries(sections.map((entry) => [entry.id, entry]));
    expect(byId.vehicle?.status).toBe("source-recorded");
    expect(byId.performance).toMatchObject({
      status: "verified",
      sourceUrl: "https://www.porsche.com/gt3",
      verifiedAt: "2026-09-12",
    });
    expect(byId.dimensions).toMatchObject({
      status: "source-recorded",
      source: "newsroom.porsche.com",
    });
    expect(byId.engine?.status).toBe("unsourced");

    expect(summarizeProvenance(sections)).toEqual({
      total: 5,
      verified: 1,
      sourced: 3,
      unsourced: 2,
    });
  });
});
