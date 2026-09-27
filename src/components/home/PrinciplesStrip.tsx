import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";

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
    <section
      aria-labelledby="principles-strip-heading"
      className="border-t border-line bg-surface-1/40 py-16 sm:py-20"
    >
      <Container>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-label">How AURIX works</p>
            <h2
              id="principles-strip-heading"
              className="mt-3 font-display text-lg tracking-[0.06em] text-ink-50 sm:text-xl"
            >
              Trust over completeness
            </h2>
          </div>
          <Link
            href="/about#principles"
            className="inline-flex min-h-11 items-center gap-2 font-display text-micro tracking-button text-gold-300 uppercase transition-colors hover:text-gold-200"
          >
            Read the principles
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
        <ol className="mt-8 grid border-t border-l border-line sm:grid-cols-2 lg:grid-cols-4">
          {PRINCIPLES.map((principle, index) => (
            <li
              key={principle.title}
              className="border-r border-b border-line p-5 sm:p-6"
            >
              <p className="tabular font-mono text-micro text-gold-500">
                {String(index + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-[11px] tracking-hud text-ink-50 uppercase">
                {principle.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-400">
                {principle.body}
              </p>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
