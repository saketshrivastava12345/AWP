import Link from "next/link";
import { GENERIC_BUILD } from "@/lib/car-build";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { HeroCar, HomeCounts } from "@/lib/queries/home";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { InfoHint } from "@/components/ui/Tooltip";
import { CountUp, Reveal, ScrambleText } from "@/components/fx";
import { HeroStory } from "@/components/3d/HeroStory";
import { beatNumber, type HeroBeat } from "./hero-beats";
import { footprintLabel } from "./home-data";
import { HeroBackdrop, HeroSceneOverlay } from "./HeroBackdrop";
import { HeroPoster } from "./HeroPoster";
import { HeroStageStatus } from "./HeroStageStatus";

/**
 * The opening screen and the anatomy story behind it.
 *
 * Everything readable here is server-rendered: the headline is the page's
 * largest paint and appears before any 3D code has loaded (it then "decodes"
 * into place over itself — the real text is in the HTML throughout), and the
 * story is plain HTML in normal flow over HeroStory's sticky stage.
 *
 * The story has two layouts, chosen in CSS from the stage's own
 * `data-hero-stage` attribute (HeroStory owns that decision):
 *
 *   scene   ("loading" / "ready") — each beat keeps most of a screen of
 *           scroll, so the camera has room to fly between shots, and its
 *           text sits beside (or, on phones, under) the car;
 *   still   (every other state: reduced motion, no WebGL, a low-power
 *           device, a failure, or not decided yet) — there is nothing to fly
 *           to, so the beats become an ordinary list on an opaque ground that
 *           slides up over the drawing. No tall empty gaps between cards.
 */

const HERO_ID = "hero";
const STORY_ID = "anatomy";
const beatAnchor = (beat: HeroBeat) => `anatomy-${beat.id}`;

/*
 * Scene-layout overrides, each a literal class (Tailwind reads them from the
 * source). They apply only while the stage says a 3D scene is on its way or
 * drawn; `group/story` is set on HeroStory's wrapper below.
 */
const SCENE = {
  section:
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:bg-transparent",
  intro:
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:max-w-md " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:pb-0",
  beat:
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:flex " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:min-h-[88svh] " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:items-end " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:pt-24 " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:pb-10 " +
    "md:group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:items-center " +
    "md:group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:pb-0",
  article:
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:block " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:max-w-md " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:border-t-0 " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:rounded-card " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:hud-panel " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:p-5 " +
    "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:backdrop-blur-md " +
    "md:group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:p-6",
  stats: "group-has-[[data-hero-stage=ready],[data-hero-stage=loading]]/story:mt-6",
} as const;

function Lead({ counts }: { counts: HomeCounts }) {
  const { variants, manufacturers, countries } = counts;
  const figure = "font-hud text-[0.95em] text-ink-50";
  if (variants !== null && manufacturers !== null && countries !== null && variants > 0) {
    return (
      <>
        <CountUp value={formatNumber(variants)} className={figure} /> cars from{" "}
        <CountUp value={formatNumber(manufacturers)} className={figure} />{" "}
        {manufacturers === 1 ? "brand" : "brands"} in{" "}
        <CountUp value={formatNumber(countries)} className={figure} />{" "}
        {countries === 1 ? "country" : "countries"} — every figure published, every gap
        marked.
      </>
    );
  }
  return <>Cars from around the world — every figure published, every gap marked.</>;
}

/** One quiet line naming what stands on the stage, and how it was drawn. */
function StageCaption({ car }: { car: HeroCar | null }) {
  if (!car) {
    return (
      <div className="flex items-center gap-1.5 text-caption lg:justify-end">
        <p>Generic coupé · a representation</p>
        <InfoHint label="About the car on stage" side="top">
          No featured car could be read from the catalogue, so the stage shows a generic
          coupé drawn to typical proportions. It is not any particular car.
        </InfoHint>
      </div>
    );
  }
  const footprint = footprintLabel(car.dimensions, (value) => formatNumber(value));
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-caption lg:justify-end">
      <p className="min-w-0">
        <Link
          href={car.href}
          className="fx-link text-ink-100 transition-colors hover:text-cyan-200"
        >
          {car.name}
        </Link>
        <span>
          {" "}
          ·{" "}
          {car.complete
            ? "drawn to published dimensions"
            : "drawn from published figures"}
        </span>
      </p>
      <InfoHint label="About the car on stage" side="top">
        {car.complete
          ? "The most powerful featured car whose length, width, height and wheelbase are all published. "
          : "The most powerful featured car. Not all of its dimensions are published, so the missing ones follow its body style's typical proportions. "}
        {footprint ? `Length × width × height: ${footprint}, as published. ` : null}
        The 3D car is a representation generated from those figures and its drivetrain
        layout — not a likeness, and not a licensed model.
      </InfoHint>
    </div>
  );
}

function Beat({
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
  const last = index === total - 1;
  return (
    <Reveal
      as="article"
      variant="rise"
      className={cn(
        "grid gap-8 border-t border-line-subtle pt-10 lg:grid-cols-12 lg:gap-12 lg:pt-12",
        SCENE.article,
      )}
    >
      <div className="min-w-0 lg:col-span-7">
        <p className="flex items-center gap-3 text-eyebrow">
          <span aria-hidden="true" className="hud-label text-ink-600">
            {beatNumber(index + 1, total)}
          </span>
          <span className="min-w-0">{beat.label}</span>
        </p>
        <h3 className="mt-3 text-h3">{beat.title}</h3>
        <p className="mt-4 max-w-[60ch] text-body">{beat.body}</p>
        {last ? (
          <ButtonLink href={car.href} variant="link" className="mt-4">
            The full anatomy
            <span className="sr-only"> of the {car.name}</span>
          </ButtonLink>
        ) : null}
      </div>
      {beat.stats.length > 0 ? (
        <dl
          className={cn(
            "grid grid-cols-2 gap-x-6 gap-y-5 self-start lg:col-span-5 lg:pt-8",
            SCENE.stats,
          )}
        >
          {beat.stats.map((stat) => (
            // Value above label (a key figure); the DOM keeps dt before dd.
            <div
              key={stat.label}
              className="flex min-w-0 flex-col-reverse justify-end gap-1.5 border-t border-line-subtle pt-3 before:order-last before:block before:h-0.5 before:w-5 before:bg-cyan-400 before:shadow-[0_0_8px_var(--color-cyan-400)] before:content-['']"
            >
              <dt className="text-hud">{stat.label}</dt>
              <dd className="text-figure text-ink-50 glow-text">
                <CountUp value={stat.value} />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
    </Reveal>
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
  const hasStory = car !== null && total > 0;

  return (
    <HeroStory
      className="group/story"
      build={build}
      beats={beats.map((beat) => beat.id)}
      railLabels={railLabels}
      poster={<HeroPoster build={build} />}
      backdrop={<HeroBackdrop />}
      sceneOverlay={<HeroSceneOverlay />}
    >
      {/* ---------------------------------------------------------- Hero */}
      <section
        id={HERO_ID}
        data-hero-beat=""
        aria-labelledby="hero-heading"
        className="flex min-h-[calc(100svh-4rem)] scroll-mt-16 flex-col"
      >
        {/* Phones: headline at the top, the car below it (the stage frames
            it there), the caption at the foot. Wide screens: the car stands
            to the right; headline bottom-left, caption bottom-right. */}
        <Container className="flex flex-1 flex-col pt-8 pb-5 sm:pt-12 lg:flex-row lg:items-end lg:justify-between lg:gap-12 lg:pt-24 lg:pb-12">
          <div className="max-w-xl lg:max-w-[38rem]">
            <p
              aria-hidden="true"
              className="flex animate-rise-in items-center gap-3 hud-label"
            >
              <span className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]" />
              <span className="min-w-0 truncate">
                SYS.01 // Global automotive intelligence
              </span>
            </p>
            {/* The headline is the page's largest paint: the real text is in
                the HTML from the first byte and only decodes over itself. */}
            <h1 id="hero-heading" className="mt-5 text-display-l">
              <ScrambleText
                text="The world of automotive engineering."
                // The gradient is clipped to the span's box, which the tight display
                // line-height makes shallower than Michroma's descenders: pad the box
                // (and take the padding back in margin) so every tail is painted.
                className="-my-[0.14em] gradient-text py-[0.14em]"
              />
            </h1>
            <p
              className="mt-5 max-w-[46ch] animate-rise-in text-lead sm:mt-6"
              style={{ animationDelay: "120ms" }}
            >
              <Lead counts={counts} />
            </p>
            <div
              className="mt-8 flex animate-rise-in flex-col gap-3 sm:flex-row sm:flex-wrap"
              style={{ animationDelay: "200ms" }}
            >
              <ButtonLink href="/cars" size="lg" magnetic className="max-sm:h-12">
                <ScrambleText text="Explore the collection" trigger="hover" />
              </ButtonLink>
              {hasStory ? (
                <ButtonLink
                  href={`#${STORY_ID}`}
                  variant="secondary"
                  size="lg"
                  magnetic
                  className="max-sm:h-12"
                >
                  <ScrambleText text="Take one apart in 3D" trigger="hover" />
                </ButtonLink>
              ) : null}
            </div>
            {hasStory ? (
              <p
                aria-hidden="true"
                className="mt-10 hidden animate-rise-in items-center gap-3 hud-label lg:flex"
                style={{ animationDelay: "400ms" }}
              >
                <span className="h-8 w-px animate-pulse-glow bg-linear-to-b from-cyan-400 to-transparent" />
                Scroll to take it apart
              </p>
            ) : null}
          </div>

          <div
            className="mt-auto flex animate-rise-in flex-col gap-1.5 pt-8 lg:mt-0 lg:max-w-md lg:shrink-0 lg:items-end lg:pt-0"
            style={{ animationDelay: "280ms" }}
          >
            <p aria-hidden="true" className="hud-label lg:text-right">
              Stage // Representation
            </p>
            <StageCaption car={car} />
            <HeroStageStatus className="lg:justify-end" />
          </div>
        </Container>
      </section>

      {/* --------------------------------------------------------- Story */}
      {hasStory ? (
        <section
          aria-labelledby="story-heading"
          className={cn("bg-void pb-16 lg:pb-24", SCENE.section)}
        >
          <Container id={STORY_ID} className="scroll-mt-16 pt-16 lg:pt-24">
            <Reveal variant="rise" className={cn("max-w-2xl pb-6", SCENE.intro)}>
              <p aria-hidden="true" className="flex items-center gap-3 hud-label">
                <span className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]" />
                SEQ.02 // Anatomy
              </p>
              <h2 id="story-heading" className="mt-4 text-h2">
                <ScrambleText text={`Anatomy of the ${car.name}`} />
              </h2>
              <p className="mt-4 text-lead">
                {total === 1 ? "One stop" : `${formatNumber(total)} stops`} through the
                car. Every figure is its published one.
              </p>
            </Reveal>
          </Container>
          {beats.map((beat, index) => (
            <div
              key={beat.id}
              id={beatAnchor(beat)}
              data-hero-beat=""
              className={cn("scroll-mt-16 py-6 lg:py-8", SCENE.beat)}
            >
              <Container>
                <Beat beat={beat} index={index} total={total} car={car} />
              </Container>
            </div>
          ))}
        </section>
      ) : null}
    </HeroStory>
  );
}
