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
 * A brand as a HUD card: name, a mono meta line (segment, founding year,
 * headquarters, and the country unless the card already sits under a
 * country heading), the first sentence of its history, and what the
 * catalogue holds for it as two lit figures.
 *
 * The whole card is one link, lifting with a cyan edge and a spotlight
 * following the pointer (`fx-card` + `data-spotlight`, driven by the FX
 * runtime — hence `suppressHydrationWarning`, since the runtime may write
 * `--mx/--my` before a streamed boundary hydrates). No monogram: the maker
 * has no recorded logo, and a letter tile read as a placeholder avatar.
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
      data-spotlight=""
      suppressHydrationWarning
      className={cn(
        "group/card relative flex h-full flex-col rounded-card border border-line bg-surface-1/85 p-6 fx-card sm:p-7",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="hud-brackets -m-px [--hud-l:12px] opacity-45 transition-opacity duration-(--duration-base) group-hover/card:opacity-100"
      />
      <Heading className="text-h3 transition-colors duration-(--duration-fast) group-hover/card:text-cyan-100">
        {maker.name}
      </Heading>
      {meta.length > 0 ? (
        <p className="mt-2 font-mono text-[11px] tracking-hud text-ink-400 uppercase">
          {meta.join(" · ")}
        </p>
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

      <div className="mt-auto flex items-end justify-between gap-4 pt-6">
        {maker.model_count > 0 ? (
          <dl className="flex gap-6">
            <div className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
                Models
              </dt>
              <dd className="font-hud text-base text-ink-50 tabular-nums glow-text">
                {maker.model_count}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-1">
              <dt className="font-mono text-[10px] tracking-hud text-ink-400 uppercase">
                Variants
              </dt>
              <dd className="font-hud text-base text-ink-50 tabular-nums glow-text">
                {maker.variant_count}
              </dd>
            </div>
            <span className="sr-only">
              {plural(maker.model_count, "model", "models")},{" "}
              {plural(maker.variant_count, "variant", "variants")}
            </span>
          </dl>
        ) : (
          <p className="text-caption">No published cars yet</p>
        )}
        <span className="inline-flex min-h-11 items-center gap-2 font-mono text-[11px] tracking-hud text-ink-200 uppercase transition-colors duration-(--duration-fast) group-hover/card:text-cyan-100">
          View brand
          <ArrowRight
            aria-hidden="true"
            className="size-4 text-cyan-300 transition-[translate,color] duration-(--duration-base) ease-standard group-hover/card:translate-x-1 motion-reduce:translate-x-0"
          />
        </span>
      </div>
    </Link>
  );
}
