import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { PartCard } from "@/components/parts/PartCard";
import { getPartDetail, getAllPartSlugs } from "@/lib/queries/parts";
import { formatEnumLabel } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllPartSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/parts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const detail = await getPartDetail(slug);
  if (!detail) return { title: "Part not found" };

  const description =
    detail.part.description ??
    `${detail.part.name}: function, materials and failure points.`;

  return {
    title: detail.part.name,
    description,
    alternates: { canonical: `${siteConfig.url}/parts/${slug}` },
    openGraph: { title: detail.part.name, description, type: "article" },
  };
}

/** One labelled prose block of the part's description. */
function PartAspect({ title, body }: { title: string; body: string | null }) {
  if (!body) return null;
  return (
    <section className="border-b border-line-subtle py-7">
      <h2 className="text-label">{title}</h2>
      <p className="mt-4 max-w-3xl text-sm leading-relaxed text-ink-300">{body}</p>
    </section>
  );
}

export default async function PartPage({ params }: PageProps<"/parts/[slug]">) {
  const { slug } = await params;
  const detail = await getPartDetail(slug);
  if (!detail) notFound();

  const { part, category, related, usedBy } = detail;

  return (
    <Container className="py-10">
      <Breadcrumbs
        items={[
          { label: "Parts", href: "/parts" },
          { label: category.name, href: `/parts#${category.slug}` },
          { label: part.name },
        ]}
      />

      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{category.name}</Badge>
          {part.viewer_group ? (
            <Badge tone="gold">{formatEnumLabel(part.viewer_group)} group</Badge>
          ) : null}
        </div>

        <h1 className="mt-6 font-display text-3xl tracking-[0.04em] text-ink-50 sm:text-4xl">
          {part.name}
        </h1>

        {part.description ? (
          <p className="mt-7 max-w-3xl leading-relaxed text-ink-300">
            {part.description}
          </p>
        ) : null}
      </header>

      <div className="mt-14 border-t border-line">
        <PartAspect title="Function" body={part.function} />
        <PartAspect title="Typical materials" body={part.typical_materials} />
        <PartAspect title="Location" body={part.location} />
        <PartAspect title="Common failure points" body={part.common_failure_points} />
        <PartAspect title="Performance impact" body={part.performance_impact} />
      </div>

      {related.length > 0 ? (
        <section className="mt-16" aria-labelledby="related-heading">
          <h2
            id="related-heading"
            className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
          >
            Related components
          </h2>
          <div className="mt-8 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item) => (
              <PartCard key={item.id} part={item} />
            ))}
          </div>
        </section>
      ) : null}

      {usedBy.length > 0 ? (
        <section className="mt-16" aria-labelledby="usedby-heading">
          <h2
            id="usedby-heading"
            className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
          >
            Notable applications
          </h2>
          <ul className="mt-1">
            {usedBy.map(({ variant, detail: note }) => (
              <li key={variant.variant_id} className="border-b border-line-subtle py-5">
                <Link
                  href={`/cars/${variant.manufacturer_slug}/${variant.model_slug}/${variant.variant_slug}`}
                  className="text-sm text-gold-300 transition-colors hover:text-gold-200"
                >
                  {variant.country_flag_emoji} {variant.manufacturer_name}{" "}
                  {variant.model_name} {variant.variant_name} →
                </Link>
                {note ? (
                  <p className="mt-2 max-w-3xl text-xs leading-relaxed text-ink-400">
                    {note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-20 border-t border-line pt-8 text-xs leading-relaxed text-ink-600">
        Component descriptions are general engineering explanations and are not specific
        to any one vehicle. {siteConfig.disclaimer}
      </p>
    </Container>
  );
}
