import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PartCategoryView } from "@/components/parts/PartCategoryView";
import { PartDetailView } from "@/components/parts/PartDetailView";
import { getAllPartsRouteSlugs, resolvePartsSlug } from "@/lib/queries/parts";
import { siteConfig } from "@/lib/site-config";
import { PLACEHOLDER_PARAM, withPlaceholder } from "@/lib/static-params";

/*
 * /parts/[slug] serves two kinds of page from one segment:
 *   /parts/braking     a category and all its parts
 *   /parts/brake-disc  one part
 * A slug is looked up as a category first, then as a part (see
 * pickPartsRoute), and both kinds are prerendered.
 */

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const slugs = await getAllPartsRouteSlugs();
  return withPlaceholder(
    slugs.map((slug) => ({ slug })),
    { slug: PLACEHOLDER_PARAM },
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/parts/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const route = await resolvePartsSlug(slug);
  if (!route) return { title: "Part not found", robots: { index: false } };

  if (route.kind === "category") {
    const { category } = route.category;
    const title = `${category.name} components`;
    const description =
      category.description ??
      `${category.name}: every component in the category, what it does and where it sits.`;
    const url = `${siteConfig.url}/parts/${category.slug}`;
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: "website", url },
    };
  }

  const { part, category } = route.part;
  const description =
    part.description ??
    `${part.name}: function, typical materials, location and common failure points.`;
  const url = `${siteConfig.url}/parts/${part.slug}`;
  return {
    title: `${part.name} · ${category.name}`,
    description,
    alternates: { canonical: url },
    openGraph: { title: part.name, description, type: "article", url },
  };
}

export default async function PartsSlugPage({ params }: PageProps<"/parts/[slug]">) {
  const { slug } = await params;
  const route = await resolvePartsSlug(slug);
  if (!route) notFound();

  return route.kind === "category" ? (
    <PartCategoryView data={route.category} />
  ) : (
    <PartDetailView data={route.part} />
  );
}
