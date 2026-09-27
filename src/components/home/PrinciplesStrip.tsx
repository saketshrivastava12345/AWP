import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GridBackground, Reveal } from "@/components/fx";

/**
 * The data-honesty rules in one line each; the full statements are on
 * /about#principles. Four numbered HUD entries under a luminous rule,
 * revealed one after another.
 */

const PRINCIPLES = [
  {
    title: "Published figures only",
    body: "Every number comes from the maker or its homologation test, and records where it came from.",
  },
  {
    title: "Empty means unknown",
    body: "A figure nobody publishes stays empty and says “Not available” — never an estimate.",
  },
  {
    title: "No currency conversion",
    body: "A price keeps the currency, type, market and date it was published with.",
  },
  {
    title: "Representations say so",
    body: "A 3D car built from published dimensions is labelled a representation, not a likeness.",
  },
] as const;

export function PrinciplesStrip() {
  return (
    <section
      aria-labelledby="principles-strip-heading"
      className="relative isolate py-16 lg:py-24"
    >
      <GridBackground size={48} />
      <Container className="relative">
        <Reveal variant="rise">
          <SectionHeading
            id="principles-strip-heading"
            overline="Principles"
            code="08"
            scramble
            title="Trust over completeness"
            actionHref="/about#principles"
            actionLabel="Read the principles"
          />
        </Reveal>
        <Reveal
          as="ul"
          stagger
          className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10"
        >
          {PRINCIPLES.map((principle, index) => (
            <li key={principle.title} className="relative pt-5">
              <div aria-hidden="true" className="absolute inset-x-0 top-0 hud-rule" />
              <p aria-hidden="true" className="hud-label">
                {`0${index + 1} // rule`}
              </p>
              <h3 className="mt-3 text-h4">{principle.title}</h3>
              <p className="mt-2 text-body-s text-ink-400">{principle.body}</p>
            </li>
          ))}
        </Reveal>
      </Container>
    </section>
  );
}
