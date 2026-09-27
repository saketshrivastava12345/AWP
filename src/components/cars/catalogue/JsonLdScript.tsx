import { serializeJsonLd, type JsonLd } from "@/lib/json-ld";

/** Structured data, serialised so catalogue text can never close the script element. */
export function JsonLdScript({ data }: { data: JsonLd | readonly JsonLd[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
