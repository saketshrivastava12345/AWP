/**
 * Structured data (schema.org JSON-LD).
 *
 * JSON-LD is written into the page as the text of a <script> element, and the
 * HTML parser ends that element at the first "</script" it meets, even inside
 * a JSON string. Catalogue text is admin-controlled, but a description that
 * happened to contain "</script><script>…" would still break out of the
 * element, so serialisation escapes every character that means something to
 * the HTML parser. The escapes are valid JSON, so the data is unchanged.
 *
 * Client-safe: no imports.
 */

export type JsonLd = { [key: string]: unknown };

const ESCAPES: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
};

/** JSON.stringify, made safe to place inside <script type="application/ld+json">. */
export function serializeJsonLd(data: JsonLd | readonly JsonLd[]): string {
  return JSON.stringify(data).replace(
    /[<>&\u2028\u2029]/g,
    (char) => ESCAPES[char] ?? char,
  );
}

export type BreadcrumbEntry = {
  name: string;
  /** Site-relative path, e.g. "/manufacturers/porsche". */
  path: string;
};

/** A schema.org BreadcrumbList with absolute URLs. */
export function breadcrumbJsonLd(
  items: readonly BreadcrumbEntry[],
  baseUrl: string,
): JsonLd {
  const base = baseUrl.replace(/\/+$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${base}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    })),
  };
}
