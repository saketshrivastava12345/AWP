import { cn } from "@/lib/utils";
import { carDisplayName } from "@/lib/format";
import { getPublicEnv } from "@/lib/env";
import { buildGallery, isOptimizableImage, type GalleryItem } from "@/lib/detail/gallery";
import { carSilhouette } from "@/components/cars/car-silhouette";
import { powertrainKind, type VariantDetail } from "@/types/domain";
import { GalleryViewer } from "./GalleryViewer";
import { SilhouetteArt } from "./SilhouetteArt";

/**
 * The photographs of the car, for the Overview's editorial split.
 *
 * Props:
 *   detail  the variant; uses `media` (the variant's own photographs, primary
 *           first) and `modelMedia` (registered once for the model)
 *   id      optional id for the block (e.g. "gallery")
 *
 * Only car_media rows of type 'image' are shown — nothing is ever supplied
 * from elsewhere. One photograph is shown at 4:3, never stretched past its
 * own width; two or more form a small mosaic, with the rest in the lightbox.
 * Every photograph carries its credit. With none catalogued, the car's
 * body-style drawing stands in, labelled as a drawing.
 */
export function Gallery({
  detail,
  id,
  className,
}: {
  detail: VariantDetail;
  id?: string;
  className?: string;
}) {
  const name = carDisplayName(
    detail.manufacturer.name,
    detail.model.name,
    detail.variant.name,
  );
  const { images } = buildGallery(detail.media, detail.modelMedia, name);
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
      <h3 id={headingId} className="sr-only">
        Photographs
      </h3>

      {items.length === 0 ? (
        <figure>
          <div className="flex aspect-[4/3] items-center justify-center rounded-card bg-surface-1 px-6">
            <SilhouetteArt shape={shape} className="w-[min(82%,34rem)] opacity-80" />
          </div>
          <figcaption className="mt-3 text-caption">
            Drawing · no photograph. AURIX shows only photographs with a recorded licence
            and credit, and none has been added for the {name} yet.
          </figcaption>
        </figure>
      ) : (
        <GalleryViewer items={items} carName={name} shape={shape} />
      )}
    </section>
  );
}
