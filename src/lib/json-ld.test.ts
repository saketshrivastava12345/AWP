import { describe, expect, it } from "vitest";
import { breadcrumbJsonLd, serializeJsonLd } from "./json-ld";

describe("serializeJsonLd", () => {
  it("cannot be closed early by text containing </script>", () => {
    const out = serializeJsonLd({ description: "</script><script>alert(1)</script>" });
    expect(out).not.toMatch(/<\/script/i);
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
  });

  it("round-trips to the same data", () => {
    const data = {
      name: "Mahindra & Mahindra",
      description: "a < b > c \u2028 line",
      nested: [{ value: 1 }],
    };
    expect(JSON.parse(serializeJsonLd(data))).toEqual(data);
  });

  it("escapes the line separators that are illegal in older script parsers", () => {
    expect(serializeJsonLd({ text: "a\u2028b\u2029c" })).toContain("\\u2028");
    expect(serializeJsonLd({ text: "a\u2028b\u2029c" })).toContain("\\u2029");
  });
});

describe("breadcrumbJsonLd", () => {
  it("numbers the trail and makes every URL absolute", () => {
    const list = breadcrumbJsonLd(
      [
        { name: "AURIX", path: "/" },
        { name: "Manufacturers", path: "/manufacturers" },
        { name: "Porsche", path: "manufacturers/porsche" },
      ],
      "https://aurix.example/",
    );
    expect(list["@type"]).toBe("BreadcrumbList");
    expect(list.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "AURIX", item: "https://aurix.example/" },
      {
        "@type": "ListItem",
        position: 2,
        name: "Manufacturers",
        item: "https://aurix.example/manufacturers",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Porsche",
        item: "https://aurix.example/manufacturers/porsche",
      },
    ]);
  });
});
