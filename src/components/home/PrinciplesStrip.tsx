import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";

/**
 * The data-honesty rules in one line each; the full statements are on
 * /about#principles.
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
    <section aria-labelledby="principles-strip-heading" className="py-16 lg:py-24">
      <Container>
        <SectionHeading
          id="principles-strip-heading"
          title="Trust over completeness"
          actionHref="/about#principles"
          actionLabel="Read the principles"
        />
        <ul className="mt-10 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-10">
          {PRINCIPLES.map((principle) => (
            <li key={principle.title} className="border-t border-line-subtle pt-5">
              <h3 className="text-h4">{principle.title}</h3>
              <p className="mt-2 text-body-s text-ink-400">{principle.body}</p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
