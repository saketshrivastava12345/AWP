import Link from "next/link";
import { ArrowLeftRight, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { compareHref, toCompareSlug } from "@/lib/compare-slug";
import type { CatalogCardRow } from "@/lib/queries/catalog-columns";
import { DetailHeading } from "./DetailHeading";

/**
 * "Compare with": this car side by side with its nearest relatives, or with
 * any car the reader picks. Every link opens the compare page with the cars
 * in its URL — nothing is stored.
 *
 * Props:
 *   self      the car's own compare slug ("porsche/911/gt3") and name
 *   rivals    candidates in order (the related vehicles); the first few are offered
 *   limit     how many to offer (default 3)
 */
export function CompareWith({
  self,
  rivals,
  limit = 3,
  headingLevel = 3,
  className,
}: {
  self: { slug: string; name: string };
  rivals: readonly CatalogCardRow[];
  limit?: number;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const offered = rivals
    .map((car) => ({
      slug: toCompareSlug(car),
      name: carDisplayName(car.manufacturer_name, car.model_name, car.variant_name),
    }))
    .filter(
      (rival): rival is { slug: string; name: string } =>
        rival.slug !== null && rival.slug !== self.slug,
    )
    .slice(0, limit);
  const headingId = "compare-with-heading";

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        eyebrow="Compare"
        title="Compare with"
        description={`Put the ${self.name} side by side with another car — every published figure, row by row, with nothing converted or estimated.`}
      />

      <ul className="mt-6 grid gap-px overflow-hidden rounded-xs border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {offered.map((rival) => (
          <li key={rival.slug} className="bg-void">
            <Link
              href={compareHref([self.slug, rival.slug])}
              className="group/compare flex h-full min-h-20 flex-col justify-between gap-3 px-5 py-4 transition-colors duration-(--duration-fast) hover:bg-surface-1"
            >
              <span className="text-hud text-ink-500">vs</span>
              <span className="flex items-center justify-between gap-3 text-sm leading-snug text-ink-100 group-hover/compare:text-gold-200">
                <span className="min-w-0">
                  <span className="sr-only">Compare the {self.name} with the </span>
                  {rival.name}
                </span>
                <ArrowLeftRight
                  className="size-3.5 shrink-0 text-ink-500 group-hover/compare:text-gold-300"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </li>
        ))}
        <li className="bg-void">
          <Link
            href={compareHref([self.slug])}
            className="group/compare flex h-full min-h-20 flex-col justify-between gap-3 px-5 py-4 transition-colors duration-(--duration-fast) hover:bg-surface-1"
          >
            <span className="text-hud text-gold-400">Any car</span>
            <span className="flex items-center justify-between gap-3 text-sm leading-snug text-ink-100 group-hover/compare:text-gold-200">
              <span>Choose from the catalogue</span>
              <ArrowRight
                className="size-3.5 shrink-0 text-ink-500 group-hover/compare:text-gold-300"
                aria-hidden="true"
              />
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
