import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { firstSentence } from "@/components/parts/parts-helpers";
import { SEGMENT_LABELS } from "./brand";
import type { Manufacturer } from "@/types/domain";

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** What a brand card shows; the directory and the country page both map to it. */
export type ManufacturerCardData = Pick<
  Manufacturer,
  "slug" | "name" | "founded_year" | "headquarters" | "segment" | "description"
> & {
  country?: { name: string } | null;
  model_count: number;
  variant_count: number;
  /** The models' names, when the card should list them. */
  modelNames?: readonly string[];
};

/**
 * A brand as a card: name, a meta line (segment, founding year, headquarters,
 * and the country unless the card already sits under a country heading), the
 * first sentence of its history, and what the catalogue holds for it.
 *
 * The whole card is one link. No monogram: the maker has no recorded logo,
 * and a letter tile read as a placeholder avatar.
 */
export function ManufacturerCard({
  maker,
  showCountry = true,
  headingLevel = "h3",
  className,
}: {
  maker: ManufacturerCardData;
  /** Off when the card sits under a country heading that already says it. */
  showCountry?: boolean;
  headingLevel?: "h3" | "h4";
  className?: string;
}) {
  const Heading = headingLevel;
  const counts =
    maker.model_count > 0
      ? `${plural(maker.model_count, "model", "models")} · ${plural(
          maker.variant_count,
          "variant",
          "variants",
        )}`
      : "No published cars yet";
  const meta = [
    SEGMENT_LABELS[maker.segment],
    showCountry ? maker.country?.name : null,
    maker.founded_year ? `Founded ${maker.founded_year}` : null,
    maker.headquarters,
  ].filter(Boolean);
  const summary = firstSentence(maker.description, 200);

  return (
    <Link
      href={`/manufacturers/${maker.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-card bg-surface-1 p-6 sm:p-7",
        "transition-colors duration-(--duration-base) ease-standard hover:bg-surface-2",
        className,
      )}
    >
      <Heading className="text-h3">{maker.name}</Heading>
      {meta.length > 0 ? (
        <p className="mt-2 text-body-s text-ink-400">{meta.join(" · ")}</p>
      ) : null}

      {summary ? (
        <p className="mt-5 line-clamp-3 text-body-s text-ink-300">{summary}</p>
      ) : null}

      {maker.modelNames && maker.modelNames.length > 0 ? (
        <p className="mt-4 text-body-s text-ink-200">
          <span className="sr-only">Models: </span>
          {maker.modelNames.join(" · ")}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-4 pt-6">
        <p className="text-caption">{counts}</p>
        <span className="inline-flex min-h-11 items-center gap-2 font-display text-[15px] font-medium text-ink-100 transition-colors duration-(--duration-fast) group-hover:text-ink-50">
          View brand
          <ArrowRight
            aria-hidden="true"
            className="size-[18px] text-ink-400 transition-[translate,color] duration-(--duration-base) ease-standard group-hover:translate-x-1 group-hover:text-ink-50 motion-reduce:translate-x-0"
          />
        </span>
      </div>
    </Link>
  );
}
