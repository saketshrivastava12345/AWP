import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { ScrambleText } from "@/components/fx/ScrambleText";
import { GlowOrbs, GridBackground, Scanlines } from "@/components/fx/Backgrounds";

/**
 * The header of the encyclopedia's index pages (brands, countries, parts,
 * about): a mono eyebrow with a lit tick, a title that decodes into place,
 * a lead, and glow orbs, a drifting grid and a scan beam behind it. Not a
 * full hero: the content below is what the page is for.
 *
 * `stats` adds a counting key-figure row under the lead (the About page
 * uses it). A string title is scrambled; any other node renders as is.
 */
export function IndexHero({
  overline,
  code,
  title,
  lead,
  stats = [],
  children,
}: {
  /** At most one eyebrow; never gold. */
  overline?: string;
  /** Decorative index after the eyebrow, e.g. "01" (aria-hidden). */
  code?: string;
  title: ReactNode;
  lead: ReactNode;
  stats?: { label: string; value: string | null; hint?: string }[];
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate overflow-hidden">
      <GlowOrbs tone="cyan" />
      <GridBackground size={56} />
      <Scanlines beam />
      <Container className="relative pt-12 pb-10 sm:pt-16 lg:pt-24 lg:pb-14">
        {overline ? (
          <p className="mb-4 flex items-center gap-3 text-eyebrow">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
            />
            <span>{overline}</span>
            {code ? (
              <span aria-hidden="true" className="hud-label text-ink-600">
                {"// "}
                {code}
              </span>
            ) : null}
          </p>
        ) : null}
        <h1 className="max-w-4xl text-h1">
          {typeof title === "string" ? <ScrambleText text={title} /> : title}
        </h1>
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
                countUp
              />
            ))}
          </StatRow>
        ) : null}
      </Container>
    </header>
  );
}
