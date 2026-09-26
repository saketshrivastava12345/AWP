import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Pin the workspace root. Without this, Turbopack walks up and finds an
  // unrelated package-lock.json in the user's home directory.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  images: {
    // Modern formats first, per the performance requirements.
    formats: ["image/avif", "image/webp"],
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  // three.js ships large ES modules; transpiling keeps tree-shaking effective
  // across the drei/fiber boundary.
  transpilePackages: ["three"],
  experimental: {
    // Partial Prerendering. The navbar's account menu reads cookies, which
    // would otherwise force every route to render dynamically — losing static
    // generation on all 169 pages for the sake of one small widget. PPR lets
    // the page ship as a static shell with the session-dependent part streamed
    // in as a hole.
    cacheComponents: true,
  },
};

export default nextConfig;
