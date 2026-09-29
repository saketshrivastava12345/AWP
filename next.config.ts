import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

/** Parsed defensively: a malformed value must not stop the dev server starting. */
function parseUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    return new URL(value);
  } catch {
    console.warn(`NEXT_PUBLIC_SUPABASE_URL is not a valid URL: "${value}"`);
    return undefined;
  }
}

const supabaseUrl = parseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);

/** Long-lived caching for immutable 3D assets and decoders. */
const IMMUTABLE = "public, max-age=31536000, immutable";

/** A local Supabase (supabase start, or a test stack) serves from loopback. */
const supabaseIsLocal =
  supabaseUrl !== undefined &&
  ["localhost", "127.0.0.1", "::1"].includes(supabaseUrl.hostname);

/** Baseline hardening for every response. */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Partial Prerendering. The navbar's account menu reads cookies, which
  // would otherwise force every route to render dynamically — losing static
  // generation on every page for the sake of one small widget. PPR lets the
  // page ship as a static shell with the session-dependent part streamed in
  // as a hole. (Top-level since Next 16; the experimental flag is deprecated.)
  cacheComponents: true,
  // Pin the workspace root. Without this, Turbopack walks up and finds an
  // unrelated package-lock.json in the user's home directory.
  turbopack: {
    root: fileURLToPath(new URL(".", import.meta.url)),
  },
  images: {
    // Modern formats first, per the performance requirements.
    formats: ["image/avif", "image/webp"],
    // Next refuses to optimise images from private addresses. Allowed only
    // when Supabase itself is local, so a developer's `supabase start` works;
    // never in a hosted configuration.
    dangerouslyAllowLocalIP: supabaseIsLocal,
    // Storage images uploaded through /admin. The protocol follows the
    // configured URL so a local Supabase (http) works as well as hosted.
    remotePatterns: supabaseUrl
      ? [
          {
            protocol: supabaseUrl.protocol === "http:" ? "http" : "https",
            hostname: supabaseUrl.hostname,
            port: supabaseUrl.port,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Draco and Basis (KTX2) decoders are self-hosted rather than fetched
      // from a third-party CDN at runtime; their file names are versioned by
      // the three.js release, so they can be cached for good.
      { source: "/draco/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE }] },
      { source: "/basis/:path*", headers: [{ key: "Cache-Control", value: IMMUTABLE }] },
      // Models are content, not code: revalidate daily rather than forever,
      // since a re-uploaded model may keep its file name.
      {
        source: "/models/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  // three.js ships large ES modules; transpiling keeps tree-shaking effective
  // across the drei/fiber boundary.
  transpilePackages: ["three"],
};

export default nextConfig;
