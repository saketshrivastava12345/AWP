import Link from "next/link";
import { ChevronRight } from "lucide-react";
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
 * A component in the encyclopedia as a compact row: its name, what it does in
 * one line, a quiet meta line (category or 3D system, when the surrounding
 * list does not already say it) and, when any catalogued car records it, how
 * many do. The whole row is one link. Lists draw the hairlines between rows
 * (see PartList). Server-safe; also rendered by the client-side explorer.
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
        "group flex h-full min-h-20 items-center gap-4 py-5",
        "transition-colors duration-(--duration-fast)",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-h4 hyphens-auto transition-colors duration-(--duration-fast) group-hover:text-ink-200">
          {part.name}
        </h3>
        {part.summary ? (
          <p className="mt-1 line-clamp-2 text-body-s text-ink-300 lg:line-clamp-1">
            {part.summary}
          </p>
        ) : null}
        {meta || usage ? (
          <p className={cn("mt-1.5 text-caption", !meta && "sm:hidden")}>
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
        <span className="hidden shrink-0 text-caption sm:block">{usage}</span>
      ) : null}
      <ChevronRight
        className="size-4 shrink-0 text-ink-500 transition-[translate,color] duration-(--duration-base) group-hover:translate-x-0.5 group-hover:text-ink-50"
        aria-hidden="true"
      />
    </Link>
  );
}

/**
 * Rows of PartCards with hairlines between them: one column on phones, two
 * from `lg`. Each item keeps its own bottom rule so the columns line up.
 */
export function PartList({
  parts,
  className,
}: {
  parts: readonly (PartCardData & { key?: string })[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid border-t border-line-subtle lg:grid-cols-2 lg:gap-x-12",
        className,
      )}
    >
      {parts.map((part) => (
        <li key={part.key ?? part.slug} className="border-b border-line-subtle">
          <PartCard part={part} />
        </li>
      ))}
    </ul>
  );
}
