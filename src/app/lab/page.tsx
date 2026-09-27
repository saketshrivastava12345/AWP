import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GridBackground, HudFrame, Reveal, Scanlines, ScrambleText } from "@/components/fx";
import { siteConfig } from "@/lib/site-config";
import { AmountDemo } from "./AmountDemo";
import { CaretDemo } from "./CaretDemo";

const DESCRIPTION =
  "Two interface experiments behind AURIX: an amount input whose figure shrinks to fit, and a text input with a caret that glides.";

export const metadata: Metadata = {
  title: "Interface lab",
  description: DESCRIPTION,
  alternates: { canonical: `${siteConfig.url}/lab` },
  robots: { index: false, follow: false },
};

const NOTES = [
  {
    code: "01",
    title: "Measure, then scale",
    body: "The amount is measured on an offscreen canvas in the input's own font at the largest size. The font-size is set to whatever fits the box, never below the floor, and the change is a CSS transition rather than a reflow per keystroke. Grouping comes from Intl.NumberFormat for the locale, and the caret is put back after the same digit it was on.",
  },
  {
    code: "02",
    title: "A spring, not a tween",
    body: "The caret bar is positioned by measuring the text before the cursor, then driven by a damped spring stepped every animation frame: mass, stiffness and damping, integrated in fixed sub-steps so a long frame cannot make it explode. It settles in about a quarter of a second, blinks at 1 Hz once idle, and hides while a range is selected.",
  },
  {
    code: "03",
    title: "Honest fallbacks",
    body: "The form receives the raw number in a hidden field, never the grouped text. Without JavaScript a plain input of the same name takes over, so the value still posts. Under prefers-reduced-motion both controls drop their motion: the font-size snaps and the browser's native caret is used.",
  },
] as const;

export default function LabPage() {
  return (
    <div className="flex flex-col">
      <section
        data-spotlight
        className="relative isolate overflow-hidden border-b border-line-subtle"
      >
        <GridBackground variant="floor" />
        <Scanlines />
        <Container as="header" className="relative pt-14 pb-12 sm:pt-20 lg:pt-24 lg:pb-16">
          <p className="mb-4 flex items-center gap-3 text-eyebrow">
            <span
              aria-hidden="true"
              className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
            />
            <span>Components</span>
            <span aria-hidden="true" className="hud-label text-ink-600">
              {"// LAB"}
            </span>
          </p>
          <h1 className="max-w-4xl text-h1 gradient-text">
            <ScrambleText text="Interface lab" />
          </h1>
          <p className="mt-6 max-w-[60ch] text-lead">
            Two input controls built for the redesign, shown on their own with nothing
            behind them: no car data, no database, just the interaction. Type into them.
          </p>
        </Container>
      </section>

      <Container as="section" aria-labelledby="lab-amount" className="py-14 lg:py-20">
        <Reveal variant="rise">
          <SectionHeading
            id="lab-amount"
            overline="Amount entry"
            code="01"
            title="A figure that shrinks to fit"
            description="Type a twelve-digit amount. The number stays on one line and the box keeps its shape; the text gets smaller instead."
          />
        </Reveal>
        <Reveal variant="rise" delay={120} className="mt-8 lg:mt-10">
          <HudFrame as="div" label="INPUT // AMOUNT" code="01">
            <AmountDemo />
          </HudFrame>
        </Reveal>
        <p className="mt-5 max-w-[70ch] text-body-s text-ink-400">
          This is the control the{" "}
          <Link href="/admin" className="fx-link text-ink-100">
            admin price form
          </Link>{" "}
          uses for the listed and on-road prices. What it submits is the raw number, so
          the server validates exactly what it did before.
        </p>
      </Container>

      <Container
        as="section"
        aria-labelledby="lab-caret"
        className="border-t border-line-subtle py-14 lg:py-20"
      >
        <Reveal variant="rise">
          <SectionHeading
            id="lab-caret"
            overline="Text entry"
            code="02"
            title="A caret that glides"
            description="The same input twice. On the left the caret is a bar that moves to the cursor with a spring; on the right it is the browser's own."
          />
        </Reveal>
        <Reveal variant="rise" delay={120} className="mt-8 lg:mt-10">
          <HudFrame as="div" label="INPUT // CARET" code="02">
            <CaretDemo />
          </HudFrame>
        </Reveal>
      </Container>

      <Container
        as="section"
        aria-labelledby="lab-notes"
        className="border-t border-line-subtle py-14 lg:py-20"
      >
        <Reveal variant="rise">
          <SectionHeading
            id="lab-notes"
            overline="How it works"
            code="03"
            title="Under the glass"
          />
        </Reveal>
        <Reveal as="ul" stagger className="mt-8 grid gap-5 md:grid-cols-3 lg:mt-10">
          {NOTES.map((note) => (
            <HudFrame as="li" key={note.code} code={note.code} className="h-full">
              <h3 className="text-h4">{note.title}</h3>
              <p className="mt-3 text-body-s text-ink-300">{note.body}</p>
            </HudFrame>
          ))}
        </Reveal>
      </Container>
    </div>
  );
}
