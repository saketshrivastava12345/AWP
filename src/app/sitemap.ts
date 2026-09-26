import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";
import { getAllVariantPaths } from "@/lib/queries/cars";
import { getAllManufacturerSlugs } from "@/lib/queries/manufacturers";
import { getAllCountrySlugs } from "@/lib/queries/countries";
import { getAllPartSlugs } from "@/lib/queries/parts";

/**
 * Sitemap covering every catalogue page.
 *
 * Private and interactive routes (/favorites, /login, /admin, /compare) are
 * deliberately absent: they have no stable indexable content, and two of them
 * are per-user.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const [variants, manufacturers, countries, parts] = await Promise.all([
    getAllVariantPaths(),
    getAllManufacturerSlugs(),
    getAllCountrySlugs(),
    getAllPartSlugs(),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/cars`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${base}/manufacturers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/countries`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${base}/parts`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    { url: `${base}/about`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];

  return [
    ...staticRoutes,
    ...variants.map((entry) => ({
      url: `${base}/cars/${entry.manufacturer}/${entry.model}/${entry.variant}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...manufacturers.map((slug) => ({
      url: `${base}/manufacturers/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...countries.map((slug) => ({
      url: `${base}/countries/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...parts.map((slug) => ({
      url: `${base}/parts/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
