import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { ButtonLink } from "@/components/ui/Button";
import { GROUP_LABELS } from "@/components/3d/viewer-config";
import { cn } from "@/lib/utils";
import { PartCard } from "./PartCard";
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

      <section className="relative isolate overflow-hidden border-b border-line">
        <div aria-hidden="true" className="absolute inset-0 -z-10 tech-grid opacity-80" />
        <div
          aria-hidden="true"
          className="absolute -top-48 -left-40 -z-10 h-[28rem] w-[40rem] max-w-none rounded-full bg-gold-700/10 blur-[150px]"
        />
        <Container className="pt-8 pb-14 sm:pt-10 sm:pb-16">
          <Breadcrumbs
            items={[{ label: "Parts", href: "/parts" }, { label: category.name }]}
          />

          <div
            className={cn(
              "mt-10",
              groups.length > 0 &&
                "grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,32rem)] lg:items-start",
            )}
          >
            <div className="min-w-0">
              <p className="text-hud text-gold-400">
                Category · {category.parts.length}{" "}
                {category.parts.length === 1 ? "component" : "components"}
              </p>
              <h1 className="mt-5 font-display text-[clamp(1.9rem,6vw,4rem)] leading-[1.06] tracking-[0.05em] break-words text-ink-50 uppercase">
                {category.name}
              </h1>
              {category.description ? (
                <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink-300 sm:text-lg">
                  {category.description}
                </p>
              ) : null}

              {groups.length > 0 ? (
                <p className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="text-label">3D systems</span>
                  {groups.map((group) => (
                    <span
                      key={group}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.08em] text-gold-400 uppercase"
                    >
                      <span
                        className="size-1.5 rounded-full bg-gold-500"
                        aria-hidden="true"
                      />
                      {GROUP_LABELS[group]}
                    </span>
                  ))}
                </p>
              ) : null}

              {recorded > 0 ? (
                <p className="mt-4 text-sm text-ink-400">
                  {recorded} of these {recorded === 1 ? "is" : "are"} recorded on
                  catalogued cars, with notes specific to each car.
                </p>
              ) : null}

              <div className="mt-8">
                <ButtonLink href="/parts" variant="secondary">
                  Every component
                </ButtonLink>
              </div>
            </div>

            {groups.length > 0 ? (
              <PartLocationFigure groups={groups} id={`category-${category.slug}`} />
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="py-12 sm:py-14">
        <nav aria-label="Part categories" className="border-b border-line pb-5">
          <ul className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1">
            {categories.map((entry) => {
              const current = entry.slug === category.slug;
              return (
                <li key={entry.id} className="shrink-0">
                  <Link
                    href={`/parts/${entry.slug}`}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "inline-flex min-h-10 items-center rounded-xs border px-3.5 font-display text-micro tracking-hud whitespace-nowrap uppercase",
                      "transition-colors duration-(--duration-fast)",
                      current
                        ? "border-gold-600 bg-gold-500/10 text-gold-300"
                        : "border-line text-ink-300 hover:border-gold-800 hover:text-gold-200",
                    )}
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
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {category.parts.map((part) => (
              <li key={part.id}>
                <PartCard
                  part={{
                    slug: part.slug,
                    name: part.name,
                    summary: firstSentence(part.function ?? part.description),
                    // Worth saying per card only when the category spans systems.
                    systemLabel:
                      groups.length > 1 && part.viewer_group
                        ? GROUP_LABELS[part.viewer_group]
                        : null,
                    usageCount: part.usageCount,
                  }}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-sm text-ink-500">
            No components are recorded in this category yet.
          </p>
        )}

        <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-500">
          Component descriptions are general engineering explanations, not specific to any
          one vehicle.
        </p>
      </Container>
    </>
  );
}
