import Link from "next/link";
import { ArrowUpRight, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Part, ViewerGroup } from "@/types/domain";
import { Badge } from "@/components/ui/Badge";
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
 *   inspectable   the subsystems the car's 3D view draws; "View in 3D" is
 *                 offered only for those (omit to offer it for every group)
 *   headingLevel  default 3
 *
 * "View in 3D" is a plain link to #explore-3d carrying data-inspect with the
 * part's viewer group; the page wires that to open the subsystem. A part
 * without a viewer group — or whose group this car's 3D view does not draw
 * (an engine whose position is not recorded) — gets no such link.
 */
export function PartsShowcase({
  parts,
  generalParts = [],
  limitGeneral = 6,
  inspectable,
  headingLevel = 3,
  className,
}: {
  parts: readonly { part: Part; detail: string | null }[];
  generalParts?: readonly Part[];
  limitGeneral?: number;
  inspectable?: readonly ViewerGroup[];
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

  const canInspect = (part: Part) =>
    part.viewer_group !== null &&
    (inspectable === undefined || inspectable.includes(part.viewer_group));

  const headingId = "parts-showcase-heading";
  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        title="Engineering components"
        note={`${parts.length} catalogued · ${general.length} typical`}
        description={
          <>
            <span className="text-ink-100">Catalogued</span> components are recorded
            against this exact variant. <span className="text-ink-100">Typical</span>{" "}
            components are the ones its recorded layout implies — true of any car built
            this way, not a claim about this car&apos;s specific parts.
          </>
        }
      />

      <ul className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {parts.map(({ part, detail }) => (
          <PartCard
            key={part.id}
            part={part}
            note={detail}
            catalogued
            inspect={canInspect(part)}
          />
        ))}
        {general.map((part) => (
          <PartCard
            key={part.id}
            part={part}
            note={null}
            catalogued={false}
            inspect={canInspect(part)}
          />
        ))}
      </ul>
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
  inspect,
}: {
  part: Part;
  note: string | null;
  catalogued: boolean;
  /** Offer "View in 3D" (the car's 3D view draws this part's group). */
  inspect: boolean;
}) {
  const summary =
    note?.trim() || firstSentence(part.function) || firstSentence(part.description);
  return (
    <li className="group/part relative flex flex-col rounded-card bg-surface-1 px-5 pt-5 pb-3 transition-colors duration-(--duration-fast) hover:bg-surface-2 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-caption">
          {part.viewer_group ? GROUP_LABELS[part.viewer_group] : "Component"}
        </p>
        {catalogued ? <Badge tone="positive">Catalogued</Badge> : <Badge>Typical</Badge>}
      </div>

      <h4 className="mt-3 text-h4">
        <Link
          href={`/parts/${part.slug}`}
          className="before:absolute before:inset-0 before:rounded-card"
        >
          {part.name}
        </Link>
      </h4>
      {summary ? (
        <p className={cn("mt-2 text-body-s", note ? "text-ink-200" : "text-ink-400")}>
          {note ? <span className="sr-only">On this car: </span> : null}
          {summary}
        </p>
      ) : null}

      <div className="relative z-10 mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="inline-flex items-center gap-1 text-caption transition-colors group-hover/part:text-ink-100">
          Encyclopedia
          <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </span>
        {inspect && part.viewer_group ? (
          <a
            href="#explore-3d"
            data-inspect={part.viewer_group}
            className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-body-s text-ink-200 transition-colors hover:text-ink-50"
          >
            <Box className="size-4" aria-hidden="true" />
            View in 3D
            <span className="sr-only">: {GROUP_LABELS[part.viewer_group]} system</span>
          </a>
        ) : null}
      </div>
    </li>
  );
}
