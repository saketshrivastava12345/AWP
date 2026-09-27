import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { StatCard, StatRow } from "@/components/ui/StatCard";

/**
 * The header of the encyclopedia's index pages (brands, countries, parts,
 * about): an optional eyebrow, a sentence-case title and a lead, on the plain
 * ground. Not a hero: the content below is what the page is for.
 *
 * `stats` adds a key-figure row under the lead (the About page uses it).
 */
export function IndexHero({
  overline,
  title,
  lead,
  stats = [],
  children,
}: {
  /** At most one eyebrow; never gold. */
  overline?: string;
  title: ReactNode;
  lead: ReactNode;
  stats?: { label: string; value: string | null; hint?: string }[];
  children?: ReactNode;
}) {
  return (
    <Container as="header" className="pt-12 pb-10 sm:pt-16 lg:pt-24 lg:pb-14">
      {overline ? <p className="mb-4 text-eyebrow">{overline}</p> : null}
      <h1 className="max-w-4xl text-h1">{title}</h1>
      <div className="mt-6 max-w-[60ch] text-lead">{lead}</div>
      {children}
      {stats.length > 0 ? (
        <StatRow className="mt-12 lg:mt-16">
          {stats.map((stat) => (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
            />
          ))}
        </StatRow>
      ) : null}
    </Container>
  );
}
