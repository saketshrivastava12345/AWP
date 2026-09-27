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
     * Run on everything except static assets and image files. Refreshing the
     * session on a font request would be pure overhead.
     */
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api/search|draco/|basis/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|glb|gltf|bin|ktx2|hdr|wasm|json|woff2?)$).*)",
  ],
};
