import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Next 16 renamed the `middleware` convention to `proxy`. This refreshes the
 * Supabase session cookie before routes render (see updateSession).
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets, image files and the public,
     * cacheable APIs (catalogue search and card lookups). Refreshing the
     * session on a font request would be pure overhead. The per-user APIs
     * (/api/favorites, /api/recently-viewed) stay in: they need the session.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|opengraph-image|apple-icon|icon.svg|api/search|api/cars|admin/media/upload|draco/|basis/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|glb|gltf|bin|ktx2|hdr|wasm|json|woff2?)$).*)",
  ],
};
