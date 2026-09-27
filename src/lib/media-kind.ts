/**
 * Photographs and AI-generated illustrations are different kinds of evidence,
 * and the site must never let a visitor mistake one for the other.
 *
 * An illustration is recorded in `car_media` like any image, with its licence
 * set to `AI_ILLUSTRATION_LICENSE`; the committed ones also live under
 * `/images/cars/ai/`. Either marker makes it an illustration, so a card that
 * only knows the URL (the catalogue view carries no licence) labels it too.
 *
 * Pure: shared by server components, client components and tests.
 */

export const AI_ILLUSTRATION_LICENSE = "AI-generated illustration";

/** The short on-image label, and the sentence for credits and alt text. */
export const AI_ILLUSTRATION_BADGE = "AI illustration";
export const AI_ILLUSTRATION_NOTE = "AI-generated illustration, not a photograph";

const AI_LICENSE = /\bai[- ]generated\b/i;
const AI_PATH = /\/images\/cars\/ai\//i;

export function isAiIllustrationUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && AI_PATH.test(url);
}

export function isAiIllustration(media: {
  url?: string | null;
  license?: string | null;
}): boolean {
  return (
    (typeof media.license === "string" && AI_LICENSE.test(media.license)) ||
    isAiIllustrationUrl(media.url)
  );
}
