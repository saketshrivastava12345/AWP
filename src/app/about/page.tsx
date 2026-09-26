import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { GlassCard } from "@/components/ui/GlassCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ButtonLink } from "@/components/ui/Button";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About",
  description:
    "AURIX is a global automotive encyclopedia built as a B.Tech CSE mini project — a normalized Postgres catalogue behind an interactive 3D front end.",
};

const STACK = [
  {
    name: "Next.js 16 · React 19",
    detail:
      "App Router with server components by default. Client components are used only where something is genuinely interactive — the 3D canvas, the filters, the search overlay.",
  },
  {
    name: "TypeScript (strict)",
    detail:
      "Including noUncheckedIndexedAccess, because the entire catalogue is built around specification values that may legitimately be absent.",
  },
  {
    name: "Supabase · PostgreSQL",
    detail:
      "A normalized twenty-table schema with row level security on every table, a read-optimized catalogue view, and full-text plus trigram search indexes.",
  },
  {
    name: "React Three Fiber · Three.js",
    detail:
      "The interactive viewer, the exploded view and engineering mode. Cars are built procedurally from primitives, so every subsystem is a separately addressable group.",
  },
  {
    name: "GSAP · ScrollTrigger",
    detail:
      "Camera choreography and scroll storytelling — all of it disabled when the visitor prefers reduced motion.",
  },
  {
    name: "Tailwind CSS v4",
    detail:
      "CSS-first configuration. The whole visual system is a set of design tokens declared in one stylesheet.",
  },
] as const;

const PRINCIPLES = [
  {
    title: "Data honesty",
    body: "Every figure in this catalogue is a published manufacturer specification. Where a number is not known with confidence, the field is left empty and the interface says “Not available” — it is never estimated, converted or filled in to make a table look complete. Each specification records where it came from, and any caveat that applies to it.",
  },
  {
    title: "Separation of data and presentation",
    body: "No car data is hardcoded in a component. Everything is read from Postgres through typed query functions, which means the catalogue can grow without a single change to the interface.",
  },
  {
    title: "Accessible by construction",
    body: "Semantic markup, visible focus states, full keyboard operation including the 3D camera presets, and complete respect for reduced-motion preferences.",
  },
] as const;

export default function AboutPage() {
  return (
    <Container className="py-20">
      <p className="text-label">About the project</p>
      <h1 className="mt-5 max-w-3xl font-display text-2xl leading-[1.3] tracking-[0.06em] text-ink-50 sm:text-3xl">
        A GLOBAL ENCYCLOPEDIA OF THE AUTOMOBILE
      </h1>
      <p className="mt-6 max-w-2xl leading-relaxed text-ink-300">
        AURIX organises the car from the outside in — country, manufacturer, model,
        variant, specification, component — and lets you explore each level interactively.
        It was built as a mini project for B.Tech Computer Science and Engineering at
        Pimpri Chinchwad University.
      </p>

      <section className="mt-20" aria-labelledby="principles">
        <SectionHeading
          overline="How it is built"
          title={<span id="principles">Principles</span>}
        />
        <div className="mt-8 grid gap-px sm:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <GlassCard key={principle.title} className="rounded-none p-7">
              <h3 className="font-display text-[11px] tracking-[0.18em] text-gold-300 uppercase">
                {principle.title}
              </h3>
              <p className="mt-4 text-sm leading-relaxed text-ink-300">
                {principle.body}
              </p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mt-20 scroll-mt-24" id="stack" aria-labelledby="stack-heading">
        <SectionHeading
          overline="Technology"
          title={<span id="stack-heading">The stack</span>}
        />
        <dl className="mt-8 border-t border-line">
          {STACK.map((item) => (
            <div
              key={item.name}
              className="grid gap-2 border-b border-line-subtle py-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8"
            >
              <dt className="font-display text-[11px] tracking-[0.14em] text-ink-100 uppercase">
                {item.name}
              </dt>
              <dd className="text-sm leading-relaxed text-ink-300">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-20" aria-labelledby="disclaimer-heading">
        <h2
          id="disclaimer-heading"
          className="font-display text-sm tracking-[0.18em] text-ink-100 uppercase"
        >
          A note on specifications
        </h2>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-400">
          {siteConfig.disclaimer} Power output is recorded exactly as each manufacturer
          publishes it — metric horsepower for European makers, SAE net horsepower for
          American and Japanese ones — and every specification notes which convention it
          follows. Prices are indicative launch figures and are never converted between
          currencies.
        </p>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-400">
          All marque names, model names and specifications are the property of their
          respective manufacturers. This is a non-commercial educational project.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <ButtonLink href="/cars">Browse the collection</ButtonLink>
          <ButtonLink href="/parts" variant="secondary">
            Parts encyclopedia
          </ButtonLink>
        </div>
      </section>
    </Container>
  );
}
