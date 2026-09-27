import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { GROUP_LABELS } from "@/components/3d/viewer-config";
import { cn } from "@/lib/utils";
import { PartList } from "./PartCard";
import { chipClasses } from "@/components/manufacturers/brand";
import { PartLocationFigure } from "./PartLocationFigure";
import { firstSentence } from "./parts-helpers";
import { breadcrumbJsonLd, serializeJsonLd, type JsonLd } from "@/lib/json-ld";
import { siteConfig } from "@/lib/site-config";
import type { ViewerGroup } from "@/types/domain";
import type { PartCategoryPageData } from "@/lib/queries/parts";

/** /parts/[category]: one category of the encyclopedia and all its parts. */
export function PartCategoryView({ data }: { data: PartCategoryPageData }) {
  const { category, categories } = data;
  const path = `/parts/${category.slug}`;
  const groups = [
    ...new Set(
      category.parts
        .map((part) => part.viewer_group)
        .filter((group): group is ViewerGroup => group !== null),
    ),
  ];
  const recorded = category.parts.filter((part) => part.usageCount > 0).length;

  const termSet: JsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: `${category.name} components`,
    ...(category.description ? { description: category.description } : {}),
    url: `${siteConfig.url}${path}`,
    hasDefinedTerm: category.parts.map((part) => ({
      "@type": "DefinedTerm",
      name: part.name,
      url: `${siteConfig.url}/parts/${part.slug}`,
    })),
  };
  const breadcrumbs = breadcrumbJsonLd(
    [
      { name: siteConfig.name, path: "/" },
      { name: "Parts", path: "/parts" },
      { name: category.name, path },
    ],
    siteConfig.url,
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd([termSet, breadcrumbs]) }}
      />

      <section className="border-b border-line-subtle">
        <Container className="pt-6 pb-12 lg:pt-8 lg:pb-16">
          <Breadcrumbs
            items={[{ label: "Parts", href: "/parts" }, { label: category.name }]}
          />

          <div
            className={cn(
              "mt-10 lg:mt-12",
              groups.length > 0 && "grid gap-12 lg:grid-cols-12 lg:items-center",
            )}
          >
            <div
              className={cn("min-w-0", groups.length > 0 ? "lg:col-span-6" : "max-w-3xl")}
            >
              <p className="text-eyebrow">
                {category.parts.length}{" "}
                {category.parts.length === 1 ? "component" : "components"}
              </p>
              <h1 className="mt-4 text-display-l hyphens-auto">{category.name}</h1>
              {category.description ? (
                <p className="mt-6 max-w-[60ch] text-lead">{category.description}</p>
              ) : null}

              {groups.length > 0 || recorded > 0 ? (
                <p className="mt-5 text-body-s text-ink-400">
                  {groups.length > 0
                    ? `3D ${groups.length === 1 ? "system" : "systems"}: ${groups
                        .map((group) => GROUP_LABELS[group])
                        .join(", ")}.`
                    : null}
                  {groups.length > 0 && recorded > 0 ? " " : null}
                  {recorded > 0
                    ? `${recorded} of these ${recorded === 1 ? "is" : "are"} recorded on catalogued cars, with notes specific to each car.`
                    : null}
                </p>
              ) : null}

              <div className="mt-8">
                <ButtonLink href="/parts" variant="secondary">
                  Every component
                </ButtonLink>
              </div>
            </div>

            {groups.length > 0 ? (
              <PartLocationFigure
                groups={groups}
                id={`category-${category.slug}`}
                className="lg:col-span-6"
              />
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="pt-10 pb-24 lg:pb-32">
        <nav aria-label="Part categories">
          <ul className="-mx-5 no-scrollbar flex gap-2 overflow-x-auto edge-fade-x px-5 py-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:[mask-image:none] sm:px-0">
            {categories.map((entry) => {
              const current = entry.slug === category.slug;
              return (
                <li key={entry.id} className="flex shrink-0">
                  <Link
                    href={`/parts/${entry.slug}`}
                    aria-current={current ? "page" : undefined}
                    className={chipClasses(current)}
                  >
                    {entry.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <h2 className="sr-only">Components in {category.name}</h2>
        {category.parts.length > 0 ? (
          <PartList
            className="mt-10"
            parts={category.parts.map((part) => ({
              key: part.id,
              slug: part.slug,
              name: part.name,
              summary: firstSentence(part.function ?? part.description),
              // Worth saying per row only when the category spans systems.
              systemLabel:
                groups.length > 1 && part.viewer_group
                  ? GROUP_LABELS[part.viewer_group]
                  : null,
              usageCount: part.usageCount,
            }))}
          />
        ) : (
          <p className="mt-10 text-body text-ink-400">
            No components are recorded in this category yet.
          </p>
        )}

        <p className="mt-20 max-w-[68ch] border-t border-line-subtle pt-8 text-caption">
          Component descriptions are general engineering explanations, not specific to any
          one vehicle.
        </p>
      </Container>
    </>
  );
}
