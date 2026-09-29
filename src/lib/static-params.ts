/**
 * generateStaticParams helpers.
 *
 * With Cache Components on, a dynamic route's generateStaticParams must return
 * at least one entry or `next build` fails (E898). The catalogue queries return
 * [] when Supabase is unconfigured or unreachable, which would make a fresh
 * checkout unbuildable. Next's documented answer is a placeholder param that
 * the page resolves to notFound() — which ours do naturally, because no row has
 * this slug.
 */

export const PLACEHOLDER_PARAM = "__placeholder__";

export function withPlaceholder<T extends Record<string, string>>(
  params: readonly T[],
  placeholder: T,
): T[] {
  return params.length > 0 ? [...params] : [placeholder];
}
