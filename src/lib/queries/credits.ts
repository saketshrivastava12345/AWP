import "server-only";

import { createStaticClient, isConfigured } from "@/lib/supabase/server";
import { mediaCredit, type GalleryCredit } from "@/lib/detail/gallery";
import { carDisplayName } from "@/lib/format";
import type { CarMedia } from "@/types/domain";

/**
 * Attribution for every photograph and 3D model the site shows, read from
 * `car_media`. CC BY and CC BY-SA require it, and the About page lists it in
 * full so the credit for any image is one link away.
 */

export type MediaCreditEntry = {
  id: string;
  type: CarMedia["type"];
  /** The car it depicts, and where its page is. */
  carName: string;
  carHref: string;
  /** Author, licence (with its deed URL when it is a CC licence), source. */
  credit: GalleryCredit | null;
  /** For 3D models: the exact vehicle (true) or a representation (false). */
  isExactModel: boolean | null;
};

type Maker = { slug: string; name: string } | null;
type ModelRef = { slug: string; name: string; manufacturers: Maker } | null;

type CreditRow = Pick<
  CarMedia,
  | "id"
  | "type"
  | "credit"
  | "author"
  | "license"
  | "source"
  | "source_url"
  | "is_exact_model"
> & {
  car_variants: { slug: string; name: string; car_models: ModelRef } | null;
  car_models: ModelRef;
};

const SELECT = `
  id, type, credit, author, license, source, source_url, is_exact_model,
  car_variants ( slug, name, car_models ( slug, name, manufacturers ( slug, name ) ) ),
  car_models ( slug, name, manufacturers ( slug, name ) )
`;

const collator = new Intl.Collator("en", { numeric: true, sensitivity: "base" });

/**
 * Every published photograph and 3D model with its credit, by car name.
 *
 * Media of a draft variant comes back without its car (row level security
 * hides the variant) and is left out: it is not shown anywhere either.
 */
export async function listMediaCredits(): Promise<MediaCreditEntry[]> {
  if (!isConfigured()) return [];

  try {
    const supabase = createStaticClient();
    const { data, error } = await supabase
      .from("car_media")
      .select(SELECT)
      .order("created_at")
      .returns<CreditRow[]>();

    if (error) {
      console.error("listMediaCredits failed:", error.message);
      return [];
    }

    const entries: MediaCreditEntry[] = [];
    for (const row of data ?? []) {
      const variant = row.car_variants;
      const model = variant?.car_models ?? row.car_models;
      const maker = model?.manufacturers;
      if (!model || !maker) continue;

      entries.push({
        id: row.id,
        type: row.type,
        carName: carDisplayName(maker.name, model.name, variant?.name),
        carHref: variant
          ? `/cars/${maker.slug}/${model.slug}/${variant.slug}`
          : `/cars/${maker.slug}/${model.slug}`,
        credit: mediaCredit(row),
        isExactModel: row.is_exact_model,
      });
    }
    return entries.sort((a, b) => collator.compare(a.carName, b.carName));
  } catch (error) {
    console.error("listMediaCredits threw:", error);
    return [];
  }
}
