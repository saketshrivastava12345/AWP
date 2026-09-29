import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Reveal } from "@/components/fx/Reveal";
import { cn } from "@/lib/utils";
import { usageLabel } from "./parts-helpers";

export type PartCardData = {
  slug: string;
  name: string;
  /** One line on what the part does. */
  summary: string | null;
  categoryName?: string | null;
  /** The 3D system it belongs to (a viewer group label). */
  systemLabel?: string | null;
  /** Published cars that record the part; nothing is shown when zero. */
  usageCount?: number;
};

/**
 * A component in the encyclopedia as a compact HUD row: a mono index (a
 * CSS counter, so it is decoration the list numbers itself), its name,
 * what it does in one line, a quiet meta line (category or 3D system, when
 * the surrounding list does not already say it) and, when any catalogued
 * car records it, how many do. The whole row is one link; on hover a cyan
 * wash sweeps in from the left and the chevron lights. Lists draw the
 * hairlines between rows (see PartList). Server-safe; also rendered by the
 * client-side explorer.
 */
export function PartCard({
  part,
  className,
}: {
  part: PartCardData;
  className?: string;
}) {
  const usage = usageLabel(part.usageCount ?? 0);
  const meta = [part.categoryName, part.systemLabel ? `${part.systemLabel} system` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/parts/${part.slug}`}
      className={cn(
        "group relative flex h-full min-h-20 items-center gap-4 py-5 pl-3 sm:pl-4",
        "before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-cyan-300 before:opacity-0 before:shadow-[0_0_8px_var(--color-cyan-400)] before:transition-opacity before:duration-(--duration-fast) before:content-['']",
        "hover:before:opacity-100",
        "after:pointer-events-none after:absolute after:inset-0 after:bg-linear-to-r after:from-cyan-400/8 after:to-transparent after:opacity-0 after:transition-opacity after:duration-(--duration-base) after:content-['']",
        "hover:after:opacity-100",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="hidden w-7 shrink-0 font-mono text-[11px] tracking-hud text-cyan-300/70 tabular-nums before:content-[counter(part,decimal-leading-zero)] sm:block"
      />
      <div className="min-w-0 flex-1">
        <h3 className="text-h4 hyphens-auto transition-colors duration-(--duration-fast) group-hover:text-cyan-100">
          {part.name}
        </h3>
        {part.summary ? (
          <p className="mt-1 line-clamp-2 text-body-s text-ink-300 lg:line-clamp-1">
            {part.summary}
          </p>
        ) : null}
        {meta || usage ? (
          <p
            className={cn(
              "mt-1.5 font-mono text-[11px] tracking-hud text-ink-400 uppercase",
              !meta && "sm:hidden",
            )}
          >
            {meta ? (
              <span>
                {part.systemLabel ? <span className="sr-only">3D system: </span> : null}
                {meta}
              </span>
            ) : null}
            {meta && usage ? (
              <span aria-hidden="true" className="sm:hidden">
                {" · "}
              </span>
            ) : null}
            {usage ? <span className="sm:hidden">{usage}</span> : null}
          </p>
        ) : null}
      </div>
      {usage ? (
        <span className="hidden shrink-0 font-mono text-[11px] tracking-hud text-cyan-200/80 uppercase sm:block">
          {usage}
        </span>
      ) : null}
      <ChevronRight
        className="size-4 shrink-0 text-cyan-400/60 transition-[translate,color] duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-cyan-200"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Rows of PartCards with hairlines between them: one column on phones, two
 * from `lg`. Each item keeps its own bottom rule so the columns line up.
 * The rows rise into place one after another; the list numbers them with a
 * CSS counter.
 */
export function PartList({
  parts,
  className,
}: {
  parts: readonly (PartCardData & { key?: string })[];
  className?: string;
}) {
  return (
    <Reveal
      as="ul"
      stagger={50}
      className={cn(
        "grid border-t border-line-subtle [counter-reset:part] lg:grid-cols-2 lg:gap-x-12",
        className,
      )}
    >
      {parts.map((part) => (
        <li
          key={part.key ?? part.slug}
          className="border-b border-line-subtle [counter-increment:part]"
        >
          <PartCard part={part} />
        </li>
      ))}
    </Reveal>
  );
}
