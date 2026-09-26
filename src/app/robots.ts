import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Per-user and administrative routes hold nothing worth indexing, and
      // /compare generates effectively unlimited URL permutations.
      disallow: ["/admin", "/favorites", "/login", "/compare"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
