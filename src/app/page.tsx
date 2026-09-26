import Link from "next/link";
import { Boxes, GitCompareArrows, Rotate3d } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { CarGrid } from "@/components/cars/CarGrid";
import { HeroStory } from "@/components/3d/HeroStory";
import { getCatalogueCounts, getFeaturedCars } from "@/lib/queries/cars";
import { formatNumber } from "@/lib/format";

/**
 * Home page.
 *
 * Phase 3 builds the typographic hero and the design-system showcase. The
 * cinematic 3D car sits in the hero slot from Phase 5, and the pinned
 * ScrollTrigger sequence (Front → Engine → Interior → Brakes → Rear → Stats)
 * arrives in Phase 8.
 */

const CAPABILITIES = [
  {
    icon: Rotate3d,
    title: "Interactive 3D",
    body: "Orbit any car, then pull it apart. Every subsystem — engine, drivetrain, suspension, brakes, battery — is its own addressable group with its own specification panel.",
    href: "/cars",
    cta: "Explore cars",
  },
  {
    icon: Boxes,
    title: "Anatomy of the Machine",
    body: "Seventy components across nine systems, each with what it does, what it is made of, how it fails, and what it actually contributes to performance.",
    href: "/parts",
    cta: "Open the encyclopedia",
  },
  {
    icon: GitCompareArrows,
    title: "Honest comparison",
    body: "Put up to four cars side by side. The best figure in each row is highlighted, and anything a manufacturer does not publish is shown as a dash rather than a guess.",
    href: "/compare",
    cta: "Compare cars",
  },
] as const;

const HIERARCHY = [
  { level: "Country", body: "The engineering tradition a car comes out of." },
  { level: "Manufacturer", body: "The marque, its founding and what it specialises in." },
  { level: "Model", body: "The nameplate and its generation." },
  { level: "Variant", body: "The specific trim, engine and drivetrain combination." },
  {
    level: "Specification",
    body: "Performance, dimensions, and fuel or battery figures.",
  },
  { level: "Parts", body: "The components that produce those numbers." },
] as const;

export default async function HomePage() {
  // Live counts and cars — nothing about the catalogue is hardcoded here.
  const [counts, featured] = await Promise.all([
    getCatalogueCounts(),
    getFeaturedCars(6),
  ]);

  const catalogueScale = [
    { label: "Countries", value: formatNumber(counts.countries) },
    { label: "Manufacturers", value: formatNumber(counts.manufacturers) },
    { label: "Models", value: formatNumber(counts.models) },
    { label: "Variants", value: formatNumber(counts.variants) },
  ];

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="grain relative flex min-h-[calc(100vh-4rem)] items-center">
        {/* A single soft pool of light behind the headline, standing in for the
            cinematic key light that the 3D hero will cast from Phase 5. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute top-1/4 -left-24 size-[32rem] rounded-full bg-gold-800/20 blur-[140px]" />
          <div className="absolute right-0 bottom-0 size-[28rem] rounded-full bg-surface-4/40 blur-[160px]" />
        </div>

        <Container className="relative z-10 py-24">
          <p className="animate-rise-in text-label">Global Automotive Intelligence</p>

          <h1
            className="mt-7 animate-rise-in font-display text-4xl leading-[1.15] tracking-[0.05em] text-ink-50 sm:text-5xl lg:text-7xl"
            style={{ animationDelay: "80ms" }}
          >
            ENGINEERED
            <br />
            <span className="gold-gradient-text">WITHOUT LIMITS</span>
          </h1>

          <p
            className="mt-8 max-w-xl animate-rise-in text-base leading-relaxed text-ink-300 sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Explore the world&apos;s most remarkable automobiles.
          </p>

          <div
            className="mt-11 flex animate-rise-in flex-wrap gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <ButtonLink href="/cars" size="lg">
              Explore Cars
            </ButtonLink>
            <ButtonLink href="/manufacturers" variant="secondary" size="lg">
              Discover Manufacturers
            </ButtonLink>
          </div>

          <StatRow
            className="mt-24 max-w-4xl animate-rise-in"
            style={{ animationDelay: "320ms" }}
          >
            {catalogueScale.map((stat) => (
              <StatCard
                key={stat.label}
                label={stat.label}
                value={stat.value}
                size="sm"
                hint="Current size of the AURIX catalogue."
              />
            ))}
          </StatRow>
        </Container>
      </section>

      {/* --------------------------------------------- Scroll storytelling */}
      <HeroStory />

      {/* ------------------------------------------------------------ Featured */}
      {featured.length > 0 ? (
        <section className="border-t border-line py-24" aria-labelledby="featured">
          <Container>
            <SectionHeading
              overline="From the collection"
              title={<span id="featured">The most powerful cars in the catalogue</span>}
              description="Ordered by published output. Where a manufacturer does not publish a figure, it is shown as a dash rather than estimated."
              action={
                <ButtonLink href="/cars" variant="secondary" size="sm">
                  View all
                </ButtonLink>
              }
            />
            <CarGrid cars={featured} className="mt-12" />
          </Container>
        </section>
      ) : null}

      {/* -------------------------------------------------------- Capabilities */}
      <section className="border-t border-line py-24" aria-labelledby="capabilities">
        <Container>
          <SectionHeading
            overline="What you can do"
            title={<span id="capabilities">Three ways in</span>}
            description="The same catalogue, approached from whichever direction suits the question you are asking."
          />

          <div className="mt-12 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((capability) => {
              const Icon = capability.icon;
              return (
                <GlassCard
                  key={capability.title}
                  as={Link}
                  href={capability.href}
                  interactive
                  className="group flex flex-col rounded-none p-8"
                >
                  <Icon
                    className="size-5 shrink-0 text-gold-500"
                    strokeWidth={1.25}
                    aria-hidden="true"
                  />
                  <h3 className="mt-7 font-display text-xs tracking-[0.18em] text-ink-50 uppercase">
                    {capability.title}
                  </h3>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-400">
                    {capability.body}
                  </p>
                  <span className="mt-7 font-display text-[10px] tracking-[0.18em] text-gold-300 uppercase transition-colors group-hover:text-gold-200">
                    {capability.cta} →
                  </span>
                </GlassCard>
              );
            })}
          </div>
        </Container>
      </section>

      {/* ----------------------------------------------------------- Hierarchy */}
      <section className="border-t border-line py-24" aria-labelledby="hierarchy">
        <Container>
          <SectionHeading
            overline="How it is organised"
            title={<span id="hierarchy">From nation to nut and bolt</span>}
            description="Every car in AURIX sits at the end of a chain you can walk in either direction."
          />

          <ol className="mt-12 border-t border-line">
            {HIERARCHY.map((item, index) => (
              <li
                key={item.level}
                className="grid grid-cols-[2.5rem_1fr] gap-4 border-b border-line-subtle py-6 sm:grid-cols-[4rem_minmax(0,12rem)_1fr] sm:gap-8"
              >
                <span className="tabular font-mono text-xs text-ink-600">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="font-display text-xs tracking-[0.18em] text-ink-50 uppercase">
                  {item.level}
                </span>
                <span className="col-span-2 text-sm leading-relaxed text-ink-400 sm:col-span-1">
                  {item.body}
                </span>
              </li>
            ))}
          </ol>
        </Container>
      </section>
    </>
  );
}
