import type { MediaShot } from "@/types/domain";
import { LICENCE_OPTIONS, SHOTS } from "./labels";
import type { FieldReader } from "./validation";

/**
 * Provenance and presentation fields for photographs and 3D models. Shared
 * by the upload route and the edit action. Pure and client-safe.
 *
 * Every asset must say where it came from, under which licence, and who made
 * it; a 3D model must also say whether it is the exact vehicle or only a
 * representation, which the public viewer states next to it.
 */

export type MediaMeta = {
  alt: string;
  shot: MediaShot | null;
  source: string;
  source_url: string;
  license: string;
  author: string;
  display_order: number;
  credit: string;
};

export type ModelMeta = { is_exact_model: boolean; model_version: string | null };

export function readLicence(reader: FieldReader): string | null {
  const choice = reader.raw("license");
  if (!choice) return reader.fail("license", "Choose the licence.");
  if (choice === "other") {
    return reader.text("license_other", "Licence", { required: true, max: 120 });
  }
  if (!LICENCE_OPTIONS.some((option) => option.value === choice)) {
    return reader.fail("license", "Choose a licence from the list, or Other.");
  }
  return choice;
}

export function composeCredit(
  kind: "image" | "glb",
  meta: { author: string; source: string; license: string },
): string {
  const noun = kind === "glb" ? "3D model" : "Photo";
  return `${noun}: ${meta.author} / ${meta.source} (${meta.license})`;
}

export function readMediaMeta(
  reader: FieldReader,
  kind: "image" | "glb",
): MediaMeta | null {
  const alt = reader.text("alt", "Alt text", { required: true, max: 300, min: 3 });
  const shot = kind === "image" ? reader.choice("shot", "Shot", SHOTS) : null;
  const source = reader.text("source", "Source", { required: true, max: 300 });
  const source_url = reader.url("source_url", "Source URL", { required: true });
  const license = readLicence(reader);
  const author = reader.text("author", "Author", { required: true, max: 200 });
  const display_order =
    reader.number("display_order", "Display order", { min: 0, max: 32767 }) ?? 0;
  if (!reader.ok || !alt || !source || !source_url || !license || !author) return null;
  return {
    alt,
    shot,
    source,
    source_url,
    license,
    author,
    display_order,
    credit: composeCredit(kind, { author, source, license }),
  };
}

export function readModelMeta(reader: FieldReader): ModelMeta | null {
  const is_exact_model = reader.answer(
    "is_exact_model",
    "Say whether this is the exact vehicle or a representation.",
  );
  const model_version = reader.text("model_version", "Model version", { max: 60 });
  if (is_exact_model === null) return null;
  return { is_exact_model, model_version };
}

/** A sensible default alt text: "Porsche 911 Turbo S — three-quarter view". */
export function defaultAlt(title: string, shotLabel?: string | null): string {
  return shotLabel ? `${title} — ${shotLabel.toLowerCase()} view` : title;
}
