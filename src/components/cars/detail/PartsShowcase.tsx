import Link from "next/link";
import { ArrowUpRight, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Part, ViewerGroup } from "@/types/domain";
import { DetailHeading } from "./DetailHeading";

/**
 * The components behind this car, each linking to its encyclopedia entry.
 *
 * Props:
 *   parts         the variant's catalogued parts (VariantDetail.parts), shown
 *                 first with the note recorded for this car
 *   generalParts  general components the car's systems imply (the anatomy
 *                 tour's picks for this layout), shown after and labelled as
 *                 typical of the layout rather than catalogued for the car
 *   limitGeneral  cap on general components (default 6)
 *   headingLevel  default 3
 *
 * "View in 3D" is a plain link to #explore-3d carrying data-inspect with the
 * part's viewer group; the page wires that to open the subsystem. A part
 * without a viewer group gets no such link.
 */
export function PartsShowcase({
  parts,
  generalParts = [],
  limitGeneral = 6,
  headingLevel = 3,
  className,
}: {
  parts: readonly { part: Part; detail: string | null }[];
  generalParts?: readonly Part[];
  limitGeneral?: number;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const own = new Set(parts.map(({ part }) => part.slug));
  const general = generalParts
    .filter(
      (part, index, list) =>
        !own.has(part.slug) && list.findIndex((p) => p.slug === part.slug) === index,
    )
    .slice(0, limitGeneral);
  if (parts.length === 0 && general.length === 0) return null;

  const headingId = "parts-showcase-heading";
  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        eyebrow="Components"
        title="Engineering components"
        meta={`${parts.length} catalogued · ${general.length} typical`}
      />

      {/* Each card draws its own hairline box, overlapped by a pixel, so a
          short last row simply ends. */}
      <ul className="mt-6 grid pt-px pl-px sm:grid-cols-2 xl:grid-cols-3">
        {parts.map(({ part, detail }) => (
          <PartCard key={part.id} part={part} note={detail} catalogued />
        ))}
        {general.map((part) => (
          <PartCard key={part.id} part={part} note={null} catalogued={false} />
        ))}
      </ul>

      <p className="mt-4 text-xs leading-relaxed text-ink-500">
        <span className="text-ink-300">Catalogued</span> components are recorded against
        this exact variant. <span className="text-ink-300">Typical</span> components are
        the ones its recorded layout implies — true of any car built this way, not a claim
        about this car&apos;s specific parts.
      </p>
    </section>
  );
}

const GROUP_LABELS: Record<ViewerGroup, string> = {
  body: "Body",
  engine: "Engine",
  transmission: "Transmission",
  suspension: "Suspension",
  brakes: "Brakes",
  wheels: "Wheels",
  interior: "Interior",
  electronics: "Electronics",
  battery: "Battery & motors",
  exhaust: "Exhaust",
};

function firstSentence(text: string | null | undefined): string | null {
  if (!text?.trim()) return null;
  const match = /^.*?[.!?](\s|$)/.exec(text.trim());
  return (match ? match[0] : text).trim();
}

function PartCard({
  part,
  note,
  catalogued,
}: {
  part: Part;
  note: string | null;
  catalogued: boolean;
}) {
  const summary =
    note?.trim() || firstSentence(part.function) || firstSentence(part.description);
  return (
    <li className="group/part relative -mt-px -ml-px flex flex-col border border-line bg-surface-1/60 px-5 pt-5 pb-4 transition-colors duration-(--duration-fast) hover:bg-surface-2/70">
      <div className="flex items-center justify-between gap-3">
        <p className="text-hud text-ink-500">
          {part.viewer_group ? GROUP_LABELS[part.viewer_group] : "Component"}
        </p>
        <span
          className={cn(
            "rounded-xs border px-1.5 py-0.5 font-mono text-nano tracking-hud uppercase",
            catalogued ? "border-gold-700 text-gold-300" : "border-line text-ink-500",
          )}
        >
          {catalogued ? "Catalogued" : "Typical"}
        </span>
      </div>

      <h4 className="mt-3 text-[15px] leading-snug font-medium text-ink-50">
        <Link href={`/parts/${part.slug}`} className="before:absolute before:inset-0">
          {part.name}
        </Link>
      </h4>
      {summary ? (
        <p
          className={cn(
            "mt-2 text-sm leading-relaxed",
            note ? "text-ink-200" : "text-ink-400",
          )}
        >
          {note ? <span className="sr-only">On this car: </span> : null}
          {summary}
        </p>
      ) : null}

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="inline-flex items-center gap-1 font-display text-[9px] tracking-[0.18em] text-ink-400 uppercase transition-colors group-hover/part:text-gold-300">
          Encyclopedia
          <ArrowUpRight className="size-3" aria-hidden="true" />
        </span>
        {part.viewer_group ? (
          <a
            href="#explore-3d"
            data-inspect={part.viewer_group}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xs px-2 font-display text-[9px] tracking-[0.18em] text-ink-300 uppercase transition-colors hover:text-gold-300 sm:min-h-9"
          >
            <Box className="size-3" aria-hidden="true" />
            View in 3D
            <span className="sr-only">: {GROUP_LABELS[part.viewer_group]} system</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}
