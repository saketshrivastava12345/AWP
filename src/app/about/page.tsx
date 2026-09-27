import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { IndexHero } from "@/components/manufacturers/IndexHero";
import { getCatalogueCounts } from "@/lib/queries/cars";
import { listMediaCredits, type MediaCreditEntry } from "@/lib/queries/credits";
import {
  PRICE_TYPE_LABELS,
  PRICE_TYPE_NOTES,
  STALE_AFTER_DAYS,
} from "@/lib/pricing/engine";
import {
  PROVENANCE_DESCRIPTIONS,
  PROVENANCE_LABELS,
  type ProvenanceStatus,
} from "@/lib/detail/provenance";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

const DESCRIPTION =
  "How AURIX works: its data-honesty principles, where the figures and prices come from, credits for every photograph, and the technology behind it.";

export const metadata: Metadata = {
  title: "About",
  description: DESCRIPTION,
  alternates: { canonical: `${siteConfig.url}/about` },
  openGraph: {
    title: "About AURIX",
    description: DESCRIPTION,
    type: "website",
    url: `${siteConfig.url}/about`,
  },
};

const SECTIONS = [
  { id: "principles", label: "Principles" },
  { id: "data", label: "Data & sources" },
  { id: "credits", label: "Credits" },
  { id: "stack", label: "Technology" },
] as const;

const PRINCIPLES = [
  {
    title: "Data honesty",
    body: "Every figure is published by the manufacturer, or by the test it was homologated under, and records where it came from. When a figure is not known with confidence the field stays empty and the interface says “Not available”, or shows “—” in dense comparison tables.",
  },
  {
    title: "No invented figures",
    body: "Nothing is estimated, interpolated or back-calculated to make a table look complete. A figure published in another form is left out rather than converted: litres per 100 km are not turned into kilometres per litre, and a dry weight is never presented as a kerb weight.",
  },
  {
    title: "No currency conversion",
    body: "A price is shown in the currency it was published in. There are no exchange rates anywhere in AURIX, so prices in different currencies are never ranked, summed or compared as if they were the same number.",
  },
  {
    title: "Sourced, dated prices only",
    body: `A price appears only with its type, its market, its source and the date it was last checked, and one not re-checked within ${STALE_AFTER_DAYS} days is flagged as possibly out of date. The on-road total AURIX adds up from published components is labelled “${PRICE_TYPE_LABELS.calculated}”, never presented as a quotation.`,
  },
  {
    title: "Exact model or representation",
    body: "When a car has a 3D model of that exact vehicle, the viewer says so. Otherwise it shows a representation: the body style’s profile scaled to the car’s published dimensions, with the engine, motors and battery placed from its specification. It is labelled as a representation and never passed off as the car itself.",
  },
] as const;

const PRICE_TYPES = [
  "manufacturer_list",
  "dealer_list",
  "ex_showroom",
  "on_road",
  "estimated_on_road",
  "calculated",
] as const;

/** The pricing UI's note says "the components above"; out of that context: */
const CALCULATED_NOTE =
  "The sum of a price's published components (the listed price plus registration, road tax, insurance and other charges), added up by AURIX and labelled as a calculation. Not a quotation.";

const PROVENANCE_ORDER: readonly ProvenanceStatus[] = [
  "verified",
  "source-recorded",
  "unsourced",
];

const PROVENANCE_TONE: Record<ProvenanceStatus, string> = {
  verified: "bg-signal-positive",
  "source-recorded": "bg-gold-500",
  unsourced: "bg-ink-600",
};

const CONVENTIONS = [
  {
    term: "Power",
    detail:
      "Stored exactly as published: metric PS for European makers, SAE net hp for American and Japanese ones. The two differ by about 1.4%, and every figure records which convention it follows.",
  },
  {
    term: "Weight",
    detail:
      "Kerb weight only. Makers that publish a dry weight have it recorded in the notes, and figures derived from weight, such as power-to-weight, are left empty rather than computed from it.",
  },
  {
    term: "Range and efficiency",
    detail:
      "Always stored with the test standard it was measured under (WLTP, EPA, ARAI, NEDC or CLTC). Figures from different standards are never presented as comparable.",
  },
  {
    term: "Photographs",
    detail:
      "From Wikimedia Commons under free licences, each checked by eye before use. A car without a verified photograph shows a body-style drawing, labelled as a drawing.",
  },
] as const;

const STACK = [
  {
    name: "Next.js 16 · React 19",
    detail:
      "App Router with Cache Components: catalogue pages are served from a prerendered static shell, with per-visitor parts such as the account menu streamed in. Server components by default; client code only where something is genuinely interactive.",
  },
  {
    name: "TypeScript, strict",
    detail:
      "Including noUncheckedIndexedAccess, because the whole catalogue is built around values that may legitimately be absent.",
  },
  {
    name: "Supabase · PostgreSQL",
    detail:
      "A normalised schema with row-level security on every table, a security-invoker catalogue view so drafts can never leak through it, full-text and typo-tolerant trigram search, and prices stored as sourced, dated observations.",
  },
  {
    name: "Three.js · React Three Fiber",
    detail:
      "The 3D viewer. The body is a lofted parametric surface drawn from each car’s published dimensions, and the engine, motors, battery and running gear are laid out from its specification, so every subsystem can be inspected or pulled apart.",
  },
  {
    name: "GSAP · ScrollTrigger",
    detail:
      "Camera choreography and the scroll-driven anatomy tour, all of it switched off when the visitor prefers reduced motion.",
  },
  {
    name: "Tailwind CSS v4",
    detail:
      "CSS-first configuration: the entire visual system is a set of design tokens declared in one stylesheet.",
  },
  {
    name: "Vitest",
    detail:
      "Unit tests for the pure logic behind the interface: the search parser, pricing, the anatomy tour, and the map and part-location geometry.",
  },
] as const;

const OTHER_CREDITS = [
  {
    term: "World map",
    detail: (
      <>
        Land outlines from{" "}
        <ExternalLink href="https://www.naturalearthdata.com/">
          Natural Earth
        </ExternalLink>{" "}
        1:110m (public domain), via the{" "}
        <ExternalLink href="https://github.com/topojson/world-atlas">
          world-atlas
        </ExternalLink>{" "}
        TopoJSON package (ISC licence), rasterised into the dot grid at build time.
      </>
    ),
  },
  {
    term: "Typefaces",
    detail:
      "Michroma, Inter and JetBrains Mono, each under the SIL Open Font License, served through next/font.",
  },
  {
    term: "Icons",
    detail: (
      <>
        <ExternalLink href="https://lucide.dev/">Lucide</ExternalLink> (ISC licence).
      </>
    ),
  },
] as const;

function ExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-baseline gap-0.5 text-gold-300 underline decoration-gold-800 underline-offset-4 transition-colors duration-(--duration-fast) hover:text-gold-200 hover:decoration-gold-500",
        className,
      )}
    >
      {children}
      <ArrowUpRight className="size-3 self-center" aria-hidden="true" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function SectionTitle({
  id,
  index,
  title,
}: {
  id: string;
  index: number;
  title: string;
}) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line pb-4">
      <span className="tabular font-mono text-xs text-gold-500">
        {String(index).padStart(2, "0")}
      </span>
      <h2
        id={id}
        className="font-display text-lg tracking-[0.06em] text-ink-50 sm:text-xl"
      >
        {title}
      </h2>
    </div>
  );
}

/** One credit as table cells that stack into labelled lines on small screens. */
function CreditCells({
  entry,
  showFidelity,
}: {
  entry: MediaCreditEntry;
  showFidelity: boolean;
}) {
  const credit = entry.credit;
  const cell =
    "block py-1 align-top md:table-cell md:border-b md:border-line-subtle md:py-4 md:pr-6 " +
    "before:mr-2 before:font-display before:text-[9px] before:tracking-hud before:text-ink-500 before:uppercase before:content-[attr(data-label)] md:before:content-none";

  return (
    <>
      <td className={cn(cell, "pt-4 md:pt-4")} data-label="Car">
        <Link
          href={entry.carHref}
          className="text-ink-100 transition-colors duration-(--duration-fast) hover:text-gold-300"
        >
          {entry.carName}
        </Link>
      </td>
      <td className={cell} data-label={showFidelity ? "Author" : "Photographer"}>
        <span className="text-ink-300">
          {credit?.author ?? credit?.text ?? "Not recorded"}
        </span>
      </td>
      <td className={cell} data-label="Licence">
        {credit?.license ? (
          credit.licenseUrl ? (
            <ExternalLink href={credit.licenseUrl}>{credit.license}</ExternalLink>
          ) : (
            <span className="text-ink-300">{credit.license}</span>
          )
        ) : (
          <span className="text-ink-500">Not recorded</span>
        )}
      </td>
      <td className={cn(cell, !showFidelity && "pb-4")} data-label="Source">
        {credit?.sourceUrl ? (
          <ExternalLink href={credit.sourceUrl}>
            {credit.sourceName ?? "Source"}
          </ExternalLink>
        ) : (
          <span className="text-ink-300">{credit?.sourceName ?? "Not recorded"}</span>
        )}
      </td>
      {showFidelity ? (
        <td className={cn(cell, "pb-4")} data-label="Fidelity">
          <span className="text-ink-300">
            {entry.isExactModel === true
              ? "Exact model"
              : entry.isExactModel === false
                ? "Representation"
                : "Not recorded"}
          </span>
        </td>
      ) : null}
    </>
  );
}

function CreditTable({
  entries,
  caption,
  showFidelity = false,
}: {
  entries: MediaCreditEntry[];
  caption: string;
  showFidelity?: boolean;
}) {
  return (
    <table className="mt-6 w-full border-t border-line text-left text-sm">
      <caption className="sr-only">{caption}</caption>
      <thead className="sr-only md:not-sr-only">
        <tr>
          {["Car", showFidelity ? "Author" : "Photographer", "Licence", "Source"]
            .concat(showFidelity ? ["Fidelity"] : [])
            .map((heading) => (
              <th
                key={heading}
                scope="col"
                className="border-b border-line py-3 pr-6 font-display text-[10px] font-normal tracking-hud text-ink-400 uppercase"
              >
                {heading}
              </th>
            ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={entry.id}
            className="block border-b border-line-subtle md:table-row md:border-0"
          >
            <CreditCells entry={entry} showFidelity={showFidelity} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function AboutPage() {
  const [counts, credits] = await Promise.all([getCatalogueCounts(), listMediaCredits()]);
  const photos = credits.filter((entry) => entry.type === "image");
  const models = credits.filter((entry) => entry.type === "glb");
  const hasCounts = counts.variants > 0 || counts.manufacturers > 0;

  return (
    <>
      <IndexHero
        overline="About the project"
        title={
          <>
            A GLOBAL ENCYCLOPEDIA <br className="hidden sm:block" />
            OF THE AUTOMOBILE
          </>
        }
        lead={
          <>
            <p>
              AURIX organises the car from the outside in: country, manufacturer, model,
              variant, specification and component, each explorable in depth and in 3D.
            </p>
            <p className="mt-4 text-sm text-ink-400">
              Built as a mini project for B.Tech Computer Science and Engineering at
              Pimpri Chinchwad University.
            </p>
          </>
        }
        stats={
          hasCounts
            ? [
                { label: "Countries", value: formatNumber(counts.countries) },
                { label: "Marques", value: formatNumber(counts.manufacturers) },
                {
                  label: "Variants",
                  value: formatNumber(counts.variants),
                  hint: "Published variants in the catalogue.",
                },
                { label: "Components", value: formatNumber(counts.parts) },
              ]
            : []
        }
      />

      <Container className="py-14 sm:py-20">
        <div className="grid gap-12 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-16">
          <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
            <p className="text-label">On this page</p>
            <ol className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:gap-0 lg:border-l lg:border-line">
              {SECTIONS.map((section, index) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="inline-flex min-h-10 items-center gap-2.5 border border-line px-3 text-sm text-ink-300 transition-colors duration-(--duration-fast) hover:border-gold-800 hover:text-gold-200 lg:-ml-px lg:min-h-11 lg:border-0 lg:border-l lg:border-transparent lg:pl-4 lg:hover:border-gold-500"
                  >
                    <span className="tabular font-mono text-[11px] text-ink-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="min-w-0 space-y-24">
            {/* ------------------------------------------------ Principles */}
            <section id="principles" aria-labelledby="principles-heading">
              <SectionTitle id="principles-heading" index={1} title="Principles" />
              <p className="mt-6 max-w-2xl leading-relaxed text-ink-300">
                A car encyclopedia is only useful if it can be trusted, so these rules win
                over completeness every time.
              </p>
              <ol className="mt-8 grid gap-4 md:grid-cols-2">
                {PRINCIPLES.map((principle, index) => (
                  <li
                    key={principle.title}
                    className={cn(
                      "edge-light relative border border-line bg-surface-1/70 p-6 sm:p-7",
                      index === PRINCIPLES.length - 1 && "md:col-span-2",
                    )}
                  >
                    <p className="tabular font-mono text-[11px] text-gold-500">
                      {String(index + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 font-display text-xs tracking-hud text-ink-50 uppercase">
                      {principle.title}
                    </h3>
                    <p className="mt-4 text-sm leading-relaxed text-ink-300">
                      {principle.body}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            {/* ---------------------------------------------------- Data */}
            <section id="data" aria-labelledby="data-heading">
              <SectionTitle id="data-heading" index={2} title="Data & sources" />

              <div className="mt-8 grid gap-10 lg:grid-cols-2">
                <div>
                  <h3 className="text-label">Where figures come from</h3>
                  <div className="mt-4 space-y-4 text-sm leading-relaxed text-ink-300">
                    <p>
                      Specifications are taken from what manufacturers publish: technical
                      specification sheets, press kits and official configurators. Range
                      and efficiency come from the homologation test the car was certified
                      under.
                    </p>
                    <p>
                      The catalogue is curated by hand in PostgreSQL, where constraints
                      enforce the rules above: a price cannot be saved without a source
                      link, and a 3D model cannot be added without saying whether it is
                      the exact vehicle.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-label">Provenance and verification</h3>
                  <p className="mt-4 text-sm leading-relaxed text-ink-300">
                    Every specification table records its source, a link to it and the
                    date it was last verified. Each block of a car&apos;s page shows its
                    status:
                  </p>
                  <dl className="mt-5 space-y-3">
                    {PROVENANCE_ORDER.map((status) => (
                      <div key={status} className="flex gap-3">
                        <dt className="flex w-36 shrink-0 items-center gap-2 text-sm text-ink-100">
                          <span
                            aria-hidden="true"
                            className={cn("size-2 rounded-full", PROVENANCE_TONE[status])}
                          />
                          {PROVENANCE_LABELS[status]}
                        </dt>
                        <dd className="text-sm leading-relaxed text-ink-400">
                          {PROVENANCE_DESCRIPTIONS[status]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>

              <div className="mt-12">
                <h3 className="text-label">How prices are sourced</h3>
                <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-300">
                  Every price is a dated observation with a source link, scoped to a
                  market (a country, a state or a city, since on-road charges differ), and
                  history is kept rather than overwritten. What a figure is matters as
                  much as the number, so each one carries its type:
                </p>
                <dl className="mt-6 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
                  {PRICE_TYPES.map((type) => (
                    <div key={type} className="bg-surface-1 p-5">
                      <dt className="font-display text-[11px] tracking-hud text-ink-50 uppercase">
                        {PRICE_TYPE_LABELS[type]}
                      </dt>
                      <dd className="mt-2.5 text-sm leading-relaxed text-ink-400">
                        {type === "calculated" ? CALCULATED_NOTE : PRICE_TYPE_NOTES[type]}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs leading-relaxed text-ink-500">
                  A price not re-verified within {STALE_AFTER_DAYS} days is marked as
                  possibly out of date. Prices are never converted between currencies.
                </p>
              </div>

              <div className="mt-12">
                <h3 className="text-label">Conventions</h3>
                <dl className="mt-4 border-t border-line">
                  {CONVENTIONS.map((item) => (
                    <div
                      key={item.term}
                      className="grid gap-2 border-b border-line-subtle py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8"
                    >
                      <dt className="font-display text-[11px] tracking-hud text-ink-100 uppercase">
                        {item.term}
                      </dt>
                      <dd className="text-sm leading-relaxed text-ink-300">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* ------------------------------------------------- Credits */}
            <section id="credits" aria-labelledby="credits-heading">
              <SectionTitle id="credits-heading" index={3} title="Credits" />

              <div className="mt-8">
                <h3 className="text-label">
                  Photographs{" "}
                  <span className="tabular font-mono text-ink-500">{photos.length}</span>
                </h3>
                {photos.length > 0 ? (
                  <>
                    <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-300">
                      Car photographs are published under free licences; Creative Commons
                      licences require attribution, which is given here for every one of
                      them and beside each photograph on its car&apos;s page.
                    </p>
                    <CreditTable entries={photos} caption="Photograph credits" />
                  </>
                ) : (
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-400">
                    No photographs are in use right now, so there is nothing to credit.
                    Cars are shown with body-style drawings instead.
                  </p>
                )}
              </div>

              <div className="mt-12">
                <h3 className="text-label">
                  3D models{" "}
                  <span className="tabular font-mono text-ink-500">{models.length}</span>
                </h3>
                {models.length > 0 ? (
                  <CreditTable entries={models} caption="3D model credits" showFidelity />
                ) : (
                  <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-400">
                    No third-party 3D models are in use. Every car in the viewer is
                    AURIX&apos;s own representation, built from its published dimensions
                    and specification, so there is no one else to credit.
                  </p>
                )}
              </div>

              <div className="mt-12">
                <h3 className="text-label">Map, type and icons</h3>
                <dl className="mt-4 border-t border-line">
                  {OTHER_CREDITS.map((item) => (
                    <div
                      key={item.term}
                      className="grid gap-2 border-b border-line-subtle py-5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-8"
                    >
                      <dt className="font-display text-[11px] tracking-hud text-ink-100 uppercase">
                        {item.term}
                      </dt>
                      <dd className="text-sm leading-relaxed text-ink-300">
                        {item.detail}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>

            {/* --------------------------------------------------- Stack */}
            <section id="stack" aria-labelledby="stack-heading">
              <SectionTitle id="stack-heading" index={4} title="Technology" />
              <dl className="mt-8 border-t border-line">
                {STACK.map((item) => (
                  <div
                    key={item.name}
                    className="grid gap-2 border-b border-line-subtle py-6 sm:grid-cols-[minmax(0,14rem)_1fr] sm:gap-8"
                  >
                    <dt className="font-display text-[11px] tracking-hud text-ink-100 uppercase">
                      {item.name}
                    </dt>
                    <dd className="text-sm leading-relaxed text-ink-300">
                      {item.detail}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-6 text-sm text-ink-400">
                The source code is public:{" "}
                <ExternalLink href={siteConfig.repository}>
                  GitHub repository
                </ExternalLink>
                .
              </p>
            </section>

            {/* ------------------------------------------------- Notice */}
            <section
              aria-labelledby="notice-heading"
              className="border-t border-line pt-10"
            >
              <h2
                id="notice-heading"
                className="font-display text-xs tracking-hud text-ink-100 uppercase"
              >
                A note on specifications
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-400">
                {siteConfig.disclaimer} All marque names, model names and specifications
                are the property of their respective manufacturers; AURIX is a
                non-commercial educational project and is not affiliated with any of them.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/cars">Browse the collection</ButtonLink>
                <ButtonLink href="/parts" variant="secondary">
                  Parts encyclopedia
                </ButtonLink>
              </div>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
