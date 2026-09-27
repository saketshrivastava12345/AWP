import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { getPublicEnv } from "@/lib/env";
import { buildGallery, isOptimizableImage, type GalleryItem } from "@/lib/detail/gallery";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { powertrainKind, type VariantDetail } from "@/types/domain";
import { DetailHeading } from "./DetailHeading";
import { GalleryViewer } from "./GalleryViewer";
import { SilhouetteArt } from "./SilhouetteArt";

/**
 * The photograph gallery.
 *
 * Props:
 *   detail        the variant; uses `media` (the variant's own photographs,
 *                 primary first) and `modelMedia` (registered once for the model)
 *   headingLevel  2 when used as a chapter's first block (default 3)
 *   id            optional id for the section (e.g. "gallery")
 *
 * Only car_media rows of type 'image' are shown — nothing is ever supplied
 * from elsewhere. Photographs are grouped by their recorded shot into
 * Exterior / Interior / Engine / Wheels / Details, with a tab per group that
 * has photographs. Every photograph carries its credit. With none catalogued,
 * an honest empty state shows the car's body-style drawing instead.
 */
export function Gallery({
  detail,
  headingLevel = 3,
  id,
  className,
}: {
  detail: VariantDetail;
  headingLevel?: 2 | 3;
  id?: string;
  className?: string;
}) {
  const name = carDisplayName(
    detail.manufacturer.name,
    detail.model.name,
    detail.variant.name,
  );
  const { images, groups } = buildGallery(detail.media, detail.modelMedia, name);
  const supabaseUrl = getPublicEnv()?.supabaseUrl ?? null;
  const items: GalleryItem[] = images.map((image) => ({
    ...image,
    optimize: isOptimizableImage(image.url, supabaseUrl),
  }));
  const shape = carSilhouette(
    detail.model.body_type,
    powertrainKind(detail.variant.fuel_type),
    detail.model.engine_position,
  );
  const headingId = `${id ?? "gallery"}-heading`;

  return (
    <section id={id} aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        eyebrow="Gallery"
        title="Photographs"
        meta={
          items.length > 0
            ? `${items.length} catalogued photograph${items.length === 1 ? "" : "s"}`
            : "car_media"
        }
      />

      {items.length === 0 ? (
        <div className="relative mt-8 overflow-hidden rounded-xs border border-dashed border-line-strong bg-surface-1/40">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 tech-grid"
          />
          <div className="relative flex flex-col items-center px-6 py-14 text-center sm:py-20">
            <SilhouetteArt shape={shape} className="w-[min(78%,30rem)] opacity-80" />
            <p className="mt-8 flex items-center gap-2 text-hud text-ink-500">
              <ImageOff className="size-3.5 shrink-0" aria-hidden="true" />
              Body-style drawing
            </p>
            <p className="mt-4 font-display text-xs leading-relaxed tracking-[0.14em] text-balance text-ink-100 uppercase sm:text-sm">
              No licensed photographs catalogued yet.
            </p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-400">
              AURIX shows only photographs with a recorded licence and credit. None has
              been added for the {name} so far.
            </p>
          </div>
        </div>
      ) : (
        <GalleryViewer
          className="mt-8"
          items={items}
          groups={groups}
          carName={name}
          shape={shape}
        />
      )}
    </section>
  );
}
