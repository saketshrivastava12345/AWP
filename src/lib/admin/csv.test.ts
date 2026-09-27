import { describe, expect, it } from "vitest";
import {
  PRICE_CSV_COLUMNS,
  parseCsv,
  priceCsvTemplate,
  validatePriceCsv,
  type CsvLookups,
} from "./csv";

describe("parseCsv", () => {
  it("handles quotes, embedded commas, newlines and doubled quotes", () => {
    expect(parseCsv('a,b,c\r\n1,"two, 2","say ""hi"""\n"multi\nline",,x\n')).toEqual([
      ["a", "b", "c"],
      ["1", "two, 2", 'say "hi"'],
      ["multi\nline", "", "x"],
    ]);
  });

  it("refuses an unclosed quote instead of swallowing the rest of the file", () => {
    expect(() =>
      parseCsv(
        'variant,notes\nporsche/911/turbo-s,"Launch price\nporsche/911/gt3,ok\nporsche/911/carrera,ok\n',
      ),
    ).toThrow(/Unclosed quote starting on line 2/);
  });

  it("strips a BOM and ignores blank lines", () => {
    expect(parseCsv("﻿a,b\n\n1,2\n  \n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });
});

describe("priceCsvTemplate", () => {
  it("is the header row only, with no sample data", () => {
    const template = priceCsvTemplate();
    expect(parseCsv(template)).toEqual([[...PRICE_CSV_COLUMNS]]);
  });
});

const lookups: CsvLookups = {
  today: "2026-09-27",
  variants: new Map([
    ["porsche/911/turbo-s", { id: "v1", label: "Porsche 911 Turbo S" }],
  ]),
  countries: new Map([
    [
      "india",
      {
        id: "c-in",
        name: "India",
        currency: "INR",
        regions: new Map([
          [
            "maharashtra",
            {
              id: "r-mh",
              name: "Maharashtra",
              cities: new Map([["mumbai", { id: "ci-mum", name: "Mumbai" }]]),
            },
          ],
        ]),
      },
    ],
  ]),
};

const header =
  "variant,market,price_type,currency,ex_showroom_price,rto_tax,insurance_estimate,on_road_price,effective_from,source,source_url,last_verified_at,is_verified";

describe("validatePriceCsv", () => {
  it("imports nothing when a quote is never closed", () => {
    const csv = `${header}\nporsche/911/turbo-s,india,ex_showroom,INR,"1000\nporsche/911/turbo-s,india,ex_showroom,INR,2000`;
    const result = validatePriceCsv(csv, lookups);
    expect(result.headerErrors).toEqual([
      "Unclosed quote starting on line 2. Nothing was imported.",
    ]);
    expect(result.validCount).toBe(0);
    expect(result.rows).toEqual([]);
  });

  it("resolves paths and validates each row with the form's rules", () => {
    const csv = [
      header,
      'porsche/911/turbo-s,india/maharashtra/mumbai,ex_showroom,,"3,08,00,000",4000000,900000,,2026-09-01,Dealer list,https://example.com/p,2026-09-20,true',
      "porsche/911/turbo-s,india,on_road,INR,,,,,2026-09-01,Dealer,https://example.com/p,2026-09-20,false",
      "porsche/911/gt3,india/goa,ex_showroom,INR,1000,,,,2026-09-01,x,ftp://bad,2026-09-20,maybe",
    ].join("\n");

    const result = validatePriceCsv(csv, lookups);
    expect(result.headerErrors).toEqual([]);
    expect(result.validCount).toBe(1);

    const [first, second, third] = result.rows;
    expect(first).toMatchObject({
      line: 2,
      variantId: "v1",
      countryId: "c-in",
      regionId: "r-mh",
      cityId: "ci-mum",
      marketLabel: "Mumbai, Maharashtra, India",
      errors: [],
    });
    // Blank currency takes the market's own currency.
    expect(first?.fields).toMatchObject({
      currency: "INR",
      ex_showroom_price: 30_800_000,
      rto_tax: 4_000_000,
      is_verified: true,
    });

    expect(second?.fields).toBeNull();
    expect(second?.errors.join(" ")).toMatch(/published on-road total/);

    expect(third?.errors.join(" ")).toMatch(/No vehicle at “porsche\/911\/gt3”/);
    expect(third?.errors.join(" ")).toMatch(/No state “goa” in India/);
    expect(third?.errors.join(" ")).toMatch(/is_verified must be true or false/);
    expect(third?.errors.join(" ")).toMatch(/http:\/\/ or https:\/\//);
  });

  it("flags duplicate rows inside the file", () => {
    const row =
      "porsche/911/turbo-s,india,ex_showroom,INR,30000000,,,,2026-09-01,Dealer,https://example.com/p,2026-09-20,false";
    const result = validatePriceCsv([header, row, row].join("\n"), lookups);
    expect(result.validCount).toBe(1);
    expect(result.rows[1]?.errors[0]).toMatch(/Duplicates line 2/);
  });

  it("reports header problems before looking at rows", () => {
    expect(validatePriceCsv("", lookups).headerErrors).toEqual(["The file is empty."]);
    const missing = validatePriceCsv("variant,market,colour\nx,y,z", lookups);
    expect(missing.headerErrors.join(" ")).toMatch(
      /Missing required column\(s\): price_type/,
    );
    expect(missing.headerErrors.join(" ")).toMatch(/Unknown column\(s\): colour/);
    expect(validatePriceCsv(header, lookups).headerErrors.join(" ")).toMatch(/no prices/);
  });

  it("refuses future verification and backwards periods", () => {
    const csv = [
      "variant,market,price_type,ex_showroom_price,effective_from,effective_to,source,source_url,last_verified_at",
      "porsche/911/turbo-s,india,ex_showroom,1,2026-09-01,2026-08-01,S,https://e.com,2026-10-01",
    ].join("\n");
    const errors = validatePriceCsv(csv, lookups).rows[0]?.errors.join(" ") ?? "";
    expect(errors).toMatch(/cannot be before/);
    expect(errors).toMatch(/cannot be after 2026-09-27/);
  });
});
