import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { getSitemapData, newestOf, type SitemapEntry } from "@/lib/queries/sitemap";

type ChangeFrequency = NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;

/**
 * Sitemap covering every public catalogue page.
 *
 * `lastModified` is the row's real `updated_at`, not the time the sitemap was
 * generated: stamping every URL with "now" tells crawlers that all 170 pages
 * changed on every build, which is exactly the signal a sitemap exists to
 * avoid. Index pages take the newest date among the pages they list.
 *
 * Private and interactive routes (/favorites, /login, /admin, /compare) are
 * deliberately absent: they have no stable indexable content, two of them are
 * per-user, and /compare generates unlimited permutations.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const data = await getSitemapData();

  const entry = (
    path: string,
    updatedAt: string | null,
    changeFrequency: ChangeFrequency,
    priority: number,
  ): MetadataRoute.Sitemap[number] => ({
    url: `${base}${path}`,
    ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
    changeFrequency,
    priority,
  });

  const section = (
    entries: readonly SitemapEntry[],
    changeFrequency: ChangeFrequency,
    priority: number,
  ) => entries.map((item) => entry(item.path, item.updatedAt, changeFrequency, priority));

  const everything = [
    ...data.variants,
    ...data.models,
    ...data.manufacturers,
    ...data.countries,
    ...data.parts,
  ];

  return [
    entry("/", newestOf(everything), "weekly", 1),
    entry("/cars", newestOf(data.variants), "weekly", 0.9),
    entry("/manufacturers", newestOf(data.manufacturers), "monthly", 0.8),
    entry("/countries", newestOf(data.countries), "monthly", 0.8),
    entry("/parts", newestOf(data.parts), "monthly", 0.8),
    entry("/about", null, "yearly", 0.4),
    ...section(data.variants, "monthly", 0.7),
    ...section(data.models, "monthly", 0.6),
    ...section(data.manufacturers, "monthly", 0.6),
    ...section(data.countries, "monthly", 0.6),
    ...section(data.parts, "monthly", 0.5),
  ];
}
