import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { GROUP_LABELS } from "@/components/3d/viewer-config";
import { PartCard } from "./PartCard";
import { PartApplications } from "./PartApplications";
import { PartLocationFigure } from "./PartLocationFigure";
import { firstSentence, usageLabel } from "./parts-helpers";
import { breadcrumbJsonLd, serializeJsonLd, type JsonLd } from "@/lib/json-ld";
import { carDisplayName } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { PartPageData } from "@/lib/queries/parts";

/** The five prose aspects of a part, in reading order. Absent ones are skipped. */
const ASPECTS = [
  { key: "function", label: "Function" },
  { key: "typical_materials", label: "Typical materials" },
  { key: "location", label: "Location" },
  { key: "common_failure_points", label: "Common failure points" },
  { key: "performance_impact", label: "Performance impact" },
] as const;

/** /parts/[part]: one component, explained, and where to see it. */
export function PartDetailView({ data }: { data: PartPageData }) {
  const { part, category, related, applications } = data;
  const group = part.viewer_group;
  const systemLabel = group ? GROUP_LABELS[group] : null;
  const path = `/parts/${part.slug}`;
  const aspects = ASPECTS.map((aspect) => ({ ...aspect, body: part[aspect.key] })).filter(
    (aspect): aspect is (typeof ASPECTS)[number] & { body: string } =>
      Boolean(aspect.body?.trim()),
  );

  // "View in 3D" opens the first catalogued car that records this part, with
  // its system selected. Without such a car there is nothing honest to open.
  const showcase = applications[0]?.car ?? null;
  const showcaseHref = showcase
    ? `/cars/${showcase.manufacturer_slug}/${showcase.model_slug}/${showcase.variant_slug}${
        group ? `?inspect=${group}` : ""
      }#explore-3d`
    : null;
  const showcaseName = showcase
    ? carDisplayName(
        showcase.manufacturer_name,
        showcase.model_name,
        showcase.variant_name,
      )
    : null;

  const term: JsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: part.name,
    ...(part.description ? { description: part.description } : {}),
    url: `${siteConfig.url}${path}`,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      name: `${category.name} components`,
      url: `${siteConfig.url}/parts/${category.slug}`,
    },
  };
  const breadcrumbs = breadcrumbJsonLd(
    [
      { name: siteConfig.name, path: "/" },
      { name: "Parts", path: "/parts" },
      { name: category.name, path: `/parts/${category.slug}` },
      { name: part.name, path },
    ],
    siteConfig.url,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([term, breadcrumbs]) }}
      />

      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="absolute inset-0 -z-10 tech-grid opacity-80" />
        <div
          aria-hidden="true"
          className="absolute -top-48 -right-40 -z-10 h-[28rem] w-[40rem] max-w-none rounded-full bg-gold-700/10 blur-[150px]"
        />
        <Container className="pt-8 pb-14 sm:pt-10 sm:pb-16">
          <Breadcrumbs
            items={[
              { label: "Parts", href: "/parts" },
              { label: category.name, href: `/parts/${category.slug}` },
              { label: part.name },
            ]}
          />

          <div
            className={
              group
                ? "mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-start"
                : "mt-10"
            }
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Link
                  href={`/parts/${category.slug}`}
                  className="text-hud transition-colors duration-(--duration-fast) hover:text-gold-300"
                >
                  {category.name}
                </Link>
                {systemLabel ? (
                  <span className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-gold-400 uppercase">
                    <span
                      className="size-1.5 rounded-full bg-gold-500"
                      aria-hidden="true"
                    />
                    3D system · {systemLabel}
                  </span>
                ) : null}
              </div>

              <h1 className="mt-5 font-display text-[clamp(1.75rem,5.5vw,3.75rem)] leading-[1.08] tracking-[0.04em] break-words text-ink-50 uppercase">
                {part.name}
              </h1>

              {part.description ? (
                <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
                  {part.description}
                </p>
              ) : null}

              <div className="mt-8 flex flex-wrap gap-3">
                {showcaseHref ? (
                  <ButtonLink href={showcaseHref}>View in 3D</ButtonLink>
                ) : null}
                <ButtonLink href={`/parts/${category.slug}`} variant="secondary">
                  All {category.name.toLowerCase()} parts
                </ButtonLink>
              </div>
              {showcaseHref && showcaseName ? (
                <p className="mt-3 max-w-xl text-xs leading-relaxed text-ink-500">
                  Opens the {showcaseName}
                  {systemLabel
                    ? ` with its ${systemLabel.toLowerCase()} system selected`
                    : ""}
                  , the first catalogued car that records this part.
                </p>
              ) : null}
            </div>

            {group ? (
              <PartLocationFigure groups={[group]} id={`part-${part.slug}`} />
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="py-14 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-16">
          <section aria-labelledby="engineering-heading">
            <h2 id="engineering-heading" className="text-label">
              Engineering notes
            </h2>
            {aspects.length > 0 ? (
              <dl className="mt-6 border-t border-line">
                {aspects.map((aspect, index) => (
                  <div
                    key={aspect.key}
                    className="grid gap-3 border-b border-line-subtle py-7 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8"
                  >
                    <dt className="flex items-baseline gap-3 font-display text-[11px] tracking-hud text-ink-100 uppercase">
                      <span className="tabular font-mono text-[11px] tracking-normal text-gold-500">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {aspect.label}
                    </dt>
                    <dd className="max-w-3xl text-[15px] leading-[1.8] text-ink-300">
                      {aspect.body}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-6 text-sm text-ink-500">
                No engineering notes are recorded for this part yet.
              </p>
            )}
          </section>

          <aside aria-label="At a glance" className="lg:pt-10">
            <dl className="edge-light border border-line bg-surface-1/70 p-5 text-sm">
              <div className="border-b border-line-subtle pb-4">
                <dt className="text-label">Category</dt>
                <dd className="mt-1.5">
                  <Link
                    href={`/parts/${category.slug}`}
                    className="text-ink-100 transition-colors hover:text-gold-300"
                  >
                    {category.name}
                  </Link>
                </dd>
              </div>
              <div className="border-b border-line-subtle py-4">
                <dt className="text-label">3D system</dt>
                <dd className="mt-1.5 text-ink-100">{systemLabel ?? "Not assigned"}</dd>
              </div>
              <div className="border-b border-line-subtle py-4">
                <dt className="text-label">Catalogued cars</dt>
                <dd className="mt-1.5 text-ink-100">
                  {usageLabel(applications.length) ?? "None record it yet"}
                </dd>
              </div>
              <div className="pt-4">
                <dt className="text-label">Related parts</dt>
                <dd className="tabular mt-1.5 font-mono text-ink-100">
                  {related.length}
                </dd>
              </div>
            </dl>
          </aside>
        </div>

        {related.length > 0 ? (
          <section className="mt-20" aria-labelledby="related-heading">
            <SectionHeading
              overline="Works with"
              title={<span id="related-heading">Related components</span>}
              description="Parts that work directly with this one."
            />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <li key={item.id}>
                  <PartCard
                    part={{
                      slug: item.slug,
                      name: item.name,
                      summary: firstSentence(item.function ?? item.description),
                      systemLabel: item.viewer_group
                        ? GROUP_LABELS[item.viewer_group]
                        : null,
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {applications.length > 0 ? (
          <section className="mt-20" aria-labelledby="applications-heading">
            <SectionHeading
              overline="In the catalogue"
              title={<span id="applications-heading">Cars that record this part</span>}
              description="Each with the detail that is specific to that car. Open one to see the part in its 3D viewer."
            />
            <div className="mt-8">
              <PartApplications applications={applications} />
            </div>
          </section>
        ) : null}

        <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-500">
          Component descriptions are general engineering explanations, not specific to any
          one vehicle; a car&apos;s own note above says where it differs.
        </p>
      </Container>
    </>
  );
}
