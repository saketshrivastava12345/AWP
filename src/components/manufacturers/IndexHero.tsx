import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { StatCard, StatRow } from "@/components/ui/StatCard";

/**
 * The header shared by the encyclopedia's index pages (manufacturers,
 * countries, parts): an overline, a wide display title, a lead and a row of
 * live catalogue figures, over a faint engineering grid.
 */
export function IndexHero({
  overline,
  title,
  lead,
  stats = [],
  children,
}: {
  overline: string;
  title: ReactNode;
  lead: ReactNode;
  stats?: { label: string; value: string | null; hint?: string }[];
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden border-b border-line">
      <div aria-hidden="true" className="absolute inset-0 -z-10 tech-grid opacity-80" />
      <div
        aria-hidden="true"
        className="absolute -top-56 left-1/2 -z-10 h-[28rem] w-[60rem] max-w-none -translate-x-1/2 rounded-full bg-gold-700/10 blur-[140px]"
      />
      <Container className="py-14 sm:py-20">
        <p className="text-hud text-gold-400">{overline}</p>
        <h1 className="mt-5 max-w-4xl font-display text-[clamp(1.75rem,5.6vw,3.5rem)] leading-[1.12] tracking-[0.05em] text-ink-50">
          {title}
        </h1>
        <div className="mt-6 max-w-2xl text-base leading-relaxed text-ink-300">
          {lead}
        </div>
        {children}
        {stats.length > 0 ? (
          <StatRow
            className={
              stats.length === 3 ? "mt-10 max-w-2xl lg:grid-cols-3" : "mt-10 max-w-3xl"
            }
          >
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                hint={stat.hint}
                size="sm"
              />
            ))}
          </StatRow>
        ) : null}
      </Container>
    </section>
  );
}
