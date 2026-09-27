import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { GENERIC_BUILD } from "@/lib/car-build";
import { formatNumber } from "@/lib/format";
import type { HeroCar, HomeCounts } from "@/lib/queries/home";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InfoHint } from "@/components/ui/Tooltip";
import { HeroStory } from "@/components/3d/HeroStory";
import { beatNumber, type HeroBeat } from "./hero-beats";
import { footprintLabel } from "./home-data";
import { HeroPoster } from "./HeroPoster";
import { HeroStageStatus } from "./HeroStageStatus";

/**
 * The opening screen and the scroll story behind it.
 *
 * Everything readable here is server-rendered: the headline is the page's
 * largest paint and appears before any 3D code has loaded; the story cards
 * are plain HTML scrolling over the sticky stage.
 */

const HERO_ID = "hero";
const beatAnchor = (beat: HeroBeat) => `anatomy-${beat.id}`;

function Subline({ counts }: { counts: HomeCounts }) {
  const { variants, manufacturers, countries } = counts;
  if (variants !== null && manufacturers !== null && countries !== null && variants > 0) {
    return (
      <>
        {formatNumber(variants)} cars from {formatNumber(manufacturers)} manufacturers in{" "}
        {formatNumber(countries)} countries, specified from country to component — and
        marked “Not available” wherever a maker does not publish a figure.
      </>
    );
  }
  return (
    <>
      Cars specified from country to component — and marked “Not available” wherever a
      maker does not publish a figure.
    </>
  );
}

function OnStage({ car }: { car: HeroCar | null }) {
  if (!car) {
    return (
      <div className="flex items-center gap-2">
        <p className="font-mono text-micro tracking-hud text-ink-400 uppercase">
          Generic coupé · 3D representation
        </p>
        <InfoHint label="About the car on stage" side="top">
          No featured car could be read from the catalogue, so the stage shows a generic
          coupé drawn to typical proportions. It is not any particular car.
        </InfoHint>
      </div>
    );
  }
  const footprint = footprintLabel(car.dimensions, (value) => formatNumber(value));
  return (
    <div className="min-w-0">
      <p className="text-label text-nano">On stage</p>
      <div className="mt-2 flex items-center gap-2">
        <Link
          href={car.href}
          className="truncate font-display text-xs tracking-[0.08em] text-ink-50 uppercase transition-colors hover:text-gold-300"
        >
          {car.name}
        </Link>
        <InfoHint label="About the car on stage" side="top">
          {car.complete
            ? "The most powerful featured car whose length, width, height and wheelbase are all published. "
            : "The most powerful featured car. Not all of its dimensions are published, so the missing ones follow its body style's typical proportions. "}
          The 3D car is a representation generated from those figures and its drivetrain
          layout — not a likeness, and not a licensed model.
        </InfoHint>
      </div>
      {footprint ? (
        <p className="mt-1 font-mono text-micro tracking-[0.08em] text-ink-400">
          {footprint}
          <span className="text-ink-500"> · L × W × H, as published</span>
        </p>
      ) : null}
    </div>
  );
}

function BeatCard({
  beat,
  index,
  total,
  car,
}: {
  beat: HeroBeat;
  index: number;
  total: number;
  car: HeroCar;
}) {
  const last = index === total;
  return (
    <article className="w-full max-w-md border border-line bg-void/80 p-5 backdrop-blur-md sm:p-7">
      <p className="text-label text-gold-400">
        <span className="tabular">{beatNumber(index, total)}</span> — {beat.label}
      </p>
      <h3 className="mt-3 font-display text-lg leading-snug tracking-[0.04em] text-ink-50 sm:text-2xl">
        {beat.title}
      </h3>
      <p className="mt-3 text-[13px] leading-relaxed text-ink-300 max-sm:line-clamp-4 sm:text-sm">
        {beat.body}
      </p>
      {beat.stats.length > 0 ? (
        <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-3.5 border-t border-line-subtle pt-4">
          {beat.stats.map((stat) => (
            <div key={stat.label} className="min-w-0">
              <dt className="text-label text-nano">{stat.label}</dt>
              <dd className="tabular mt-1 truncate font-mono text-[13px] text-ink-50">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {last ? (
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 border-t border-line-subtle pt-5">
          <Link
            href={car.href}
            className="inline-flex min-h-11 items-center gap-2 font-display text-micro tracking-button text-gold-300 uppercase transition-colors hover:text-gold-200"
          >
            The full anatomy
            <ArrowRight className="size-3.5" aria-hidden="true" />
            <span className="sr-only">of the {car.name}</span>
          </Link>
        </div>
      ) : null}
    </article>
  );
}

export function HomeHero({ car, counts }: { car: HeroCar | null; counts: HomeCounts }) {
  const beats = car?.beats ?? [];
  const total = beats.length;
  const railLabels = [
    { id: HERO_ID, label: "Overview" },
    ...beats.map((beat) => ({ id: beatAnchor(beat), label: beat.label })),
  ];
  const build = car?.build ?? GENERIC_BUILD;

  return (
    <HeroStory
      build={build}
      beats={beats.map((beat) => beat.id)}
      railLabels={railLabels}
      poster={<HeroPoster build={build} />}
    >
      {/* ---------------------------------------------------------- Hero */}
      <section
        id={HERO_ID}
        data-hero-beat=""
        aria-labelledby="hero-heading"
        className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col pt-[5svh] pb-6 sm:pt-[7svh] lg:justify-center lg:pt-10 lg:pb-16"
      >
        <Container>
          <div className="max-w-[40rem] lg:max-w-[50%]">
            <p className="animate-rise-in text-label">Global automotive intelligence</p>
            {/* Not animated: the headline is the page's largest paint and
                must not wait on an entrance animation. */}
            <h1
              id="hero-heading"
              className="mt-5 font-display text-[min(7vw,2.25rem)] leading-[1.14] tracking-[0.04em] text-ink-50 md:text-[min(5.4vw,3rem)] lg:text-[min(3.25vw,3rem)]"
            >
              <span className="block">THE WORLD OF</span>
              <span className="block">AUTOMOTIVE</span>
              <span className="block gold-gradient-text">ENGINEERING.</span>
            </h1>
            <p
              className="mt-6 max-w-lg animate-rise-in text-sm leading-relaxed text-ink-300 sm:text-base"
              style={{ animationDelay: "120ms" }}
            >
              <Subline counts={counts} />
            </p>

            <div
              className="mt-8 flex animate-rise-in flex-col gap-3 sm:flex-row sm:flex-wrap"
              style={{ animationDelay: "200ms" }}
            >
              {car ? (
                <ButtonLink
                  href={`${car.href}#explore-3d`}
                  size="lg"
                  className="max-sm:h-12"
                >
                  Explore 3D<span className="sr-only">: the {car.name}</span>
                </ButtonLink>
              ) : null}
              <ButtonLink
                href="/cars"
                variant={car ? "secondary" : "primary"}
                size="lg"
                className="max-sm:h-12 max-sm:px-5"
              >
                Browse the collection
              </ButtonLink>
            </div>

            {/* Wide screens: the caption belongs to the text column, the car
                stands to its right. */}
            <div
              className="mt-10 hidden animate-rise-in border-t border-line-subtle pt-5 lg:block"
              style={{ animationDelay: "280ms" }}
            >
              <OnStage car={car} />
              <HeroStageStatus className="mt-4" />
            </div>

            {total > 0 ? (
              <a
                href={`#${beatAnchor(beats[0] as HeroBeat)}`}
                className="mt-8 hidden min-h-11 items-center gap-3 text-label transition-colors hover:text-gold-300 lg:inline-flex"
              >
                <span className="flex size-8 items-center justify-center rounded-full border border-line-strong">
                  <ArrowDown
                    className="size-3.5 motion-safe:animate-bounce"
                    aria-hidden="true"
                  />
                </span>
                Scroll through the anatomy
              </a>
            ) : null}
          </div>
        </Container>

        {/* Narrower screens: the car stands under the headline (the stage
            leaves this space clear), captioned beneath it like a museum label. */}
        <Container className="mt-auto pt-[clamp(9rem,24svh,19rem)] lg:hidden">
          <div className="flex flex-col gap-4">
            <OnStage car={car} />
            <HeroStageStatus />
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------------- Story */}
      {car && total > 0 ? (
        <section aria-labelledby="story-heading">
          <h2 id="story-heading" className="sr-only">
            Anatomy of the {car.name}
          </h2>
          {beats.map((beat, index) => (
            <div
              key={beat.id}
              id={beatAnchor(beat)}
              data-hero-beat=""
              className="flex min-h-[88svh] scroll-mt-16 items-end pt-24 pb-10 md:items-center md:pb-0"
            >
              <Container>
                <BeatCard beat={beat} index={index + 1} total={total} car={car} />
              </Container>
            </div>
          ))}
        </section>
      ) : null}
    </HeroStory>
  );
}
