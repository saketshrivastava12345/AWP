import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { StatCard, StatRow } from "@/components/ui/StatCard";
import { GROUP_LABELS } from "@/components/3d/viewer-config";
import { cn } from "@/lib/utils";
import { PartList } from "./PartCard";
import { PartApplications } from "./PartApplications";
import { PartLocationFigure } from "./PartLocationFigure";
import { firstSentence } from "./parts-helpers";
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

  const facts = [
    { label: "Category", value: category.name },
    ...(systemLabel ? [{ label: "3D system", value: systemLabel }] : []),
    {
      label: "Catalogued cars",
      value: String(applications.length),
      hint: "Published cars that record this part, each with a note specific to that car.",
    },
    { label: "Related parts", value: String(related.length) },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([term, breadcrumbs]) }}
      />

      <section className="border-b border-line-subtle">
        <Container className="pt-6 pb-12 lg:pt-8 lg:pb-16">
          <Breadcrumbs
            items={[
              { label: "Parts", href: "/parts" },
              { label: category.name, href: `/parts/${category.slug}` },
              { label: part.name },
            ]}
          />

          <div
            className={cn(
              "mt-10 lg:mt-12",
              group && "grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-12",
            )}
          >
            <div className={cn("min-w-0", group ? "lg:col-span-6" : "max-w-3xl")}>
              <p className="text-eyebrow">
                <Link
                  href={`/parts/${category.slug}`}
                  className="inline-flex min-h-6 items-center transition-colors duration-(--duration-fast) hover:text-ink-50"
                >
                  {category.name}
                </Link>
              </p>
              <h1 className="mt-4 text-display-l hyphens-auto">{part.name}</h1>

              {part.description ? (
                <p className="mt-6 max-w-[60ch] text-lead">{part.description}</p>
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
                <p className="mt-4 max-w-[60ch] text-caption">
                  Opens the {showcaseName}
                  {systemLabel
                    ? ` with its ${systemLabel.toLowerCase()} system selected`
                    : ""}
                  , the first catalogued car that records this part.
                </p>
              ) : null}
            </div>

            {group ? (
              <PartLocationFigure
                groups={[group]}
                id={`part-${part.slug}`}
                className="lg:col-span-6"
              />
            ) : null}
          </div>

          <StatRow className="mt-12 lg:mt-16">
            {facts.map((fact) => (
              <StatCard
                key={fact.label}
                label={fact.label}
                value={fact.value}
                hint={fact.hint}
                size="sm"
              />
            ))}
          </StatRow>
        </Container>
      </section>

      <Container
        as="section"
        aria-labelledby="engineering-heading"
        className="py-16 lg:py-24"
      >
        <h2 id="engineering-heading" className="text-h2">
          Engineering notes
        </h2>
        {aspects.length > 0 ? (
          <dl className="mt-10 grid gap-x-16 gap-y-10 border-t border-line-subtle pt-10 lg:grid-cols-2">
            {aspects.map((aspect) => (
              <div key={aspect.key} className="min-w-0">
                <dt className="text-h4">{aspect.label}</dt>
                <dd className="mt-3 max-w-[68ch] text-body">{aspect.body}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-6 text-body text-ink-400">
            No engineering notes are recorded for this part yet.
          </p>
        )}
      </Container>

      {related.length > 0 ? (
        <Container
          as="section"
          aria-labelledby="related-heading"
          className="border-t border-line-subtle py-16 lg:py-24"
        >
          <SectionHeading
            id="related-heading"
            title="Related components"
            description="Parts that work directly with this one."
          />
          <PartList
            className="mt-10"
            parts={related.map((item) => ({
              key: item.id,
              slug: item.slug,
              name: item.name,
              summary: firstSentence(item.function ?? item.description),
              systemLabel: item.viewer_group ? GROUP_LABELS[item.viewer_group] : null,
            }))}
          />
        </Container>
      ) : null}

      {applications.length > 0 ? (
        <Container
          as="section"
          aria-labelledby="applications-heading"
          className="border-t border-line-subtle py-16 lg:py-24"
        >
          <SectionHeading
            id="applications-heading"
            title="Cars that record this part"
            description="Each with the detail that is specific to that car. Open one to see the part in its 3D viewer."
          />
          <div className="mt-10">
            <PartApplications applications={applications} />
          </div>
        </Container>
      ) : null}

      <Container className="pb-24">
        <p className="max-w-[68ch] border-t border-line-subtle pt-8 text-caption">
          Component descriptions are general engineering explanations, not specific to any
          one vehicle; a car&apos;s own note above says where it differs.
        </p>
      </Container>
    </>
  );
}
