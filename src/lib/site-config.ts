export const siteConfig = {
  name: "AURIX",
  tagline: "Global Automotive Intelligence",
  description:
    "A global encyclopedia of automobiles: browse by country, manufacturer and category, " +
    "explore interactive 3D models and exploded views, and compare full specifications.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  /** Shown in the footer and on every spec-heavy page. */
  disclaimer:
    "Technical information may vary by market, model year, trim and manufacturer specification.",
} as const;
