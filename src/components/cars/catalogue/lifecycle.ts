import type { BadgeTone } from "@/components/ui/Badge";
import { STATUS_LABELS } from "@/lib/facets";
import type { VehicleStatus } from "@/types/domain";

export type Lifecycle = {
  label: string;
  tone: BadgeTone;
  /** True when inferred from production years rather than recorded from a source. */
  derived: boolean;
  /** Plain-language explanation for assistive technology and tooltips. */
  detail: string;
};

const STATUS_TONES: Record<VehicleStatus, BadgeTone> = {
  available: "positive",
  upcoming: "gold",
  limited: "gold",
  discontinued: "neutral",
  concept: "neutral",
  sold_out: "neutral",
};

/**
 * The lifecycle badge for a variant.
 *
 * A recorded status always wins. Without one, the only thing the data can
 * honestly say is that production ended: a year_end before the current year
 * means the variant is no longer built, so it reads "Discontinued" — marked as
 * derived, and never offered as a filter value (filters use the recorded
 * column only). Anything else stays unlabelled rather than guessed.
 *
 * `currentYear` is passed in rather than read here: reading the clock during
 * a prerender is an error under Cache Components, so callers take it from the
 * cached `catalogueYear()`.
 */
export function lifecycleOf(
  status: VehicleStatus | null | undefined,
  yearEnd: number | null | undefined,
  currentYear: number | undefined,
): Lifecycle | null {
  if (status) {
    return {
      label: STATUS_LABELS[status],
      tone: STATUS_TONES[status],
      derived: false,
      detail: `Status: ${STATUS_LABELS[status]}`,
    };
  }
  if (
    currentYear !== undefined &&
    yearEnd !== null &&
    yearEnd !== undefined &&
    yearEnd < currentYear
  ) {
    return {
      label: "Discontinued",
      tone: "neutral",
      derived: true,
      detail: `Production ended in ${yearEnd}`,
    };
  }
  return null;
}
