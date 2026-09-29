"use client";

import type { Part, ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { Car3DViewer } from "./Car3DViewer";

/**
 * @deprecated Use `Car3DViewer`. Kept so the current car page keeps working
 * until it moves to the new props; it maps the old ones across.
 *
 * - `glbUrl` + `modelCredit` become a model marked as NOT exact (the old
 *   props could not say otherwise, so the viewer does not claim it).
 * - Dimensions come from the build, which carries the same published figures
 *   `dimensionLabels` was formatted from.
 * - `highlightGroup`, `showExplode` and `showEngineering` had no callers and
 *   have no equivalent: every viewer now offers every mode.
 */
export type CarViewerProps = {
  build: CarBuild;
  glbUrl?: string | null;
  partsByGroup?: Partial<Record<ViewerGroup, Part[]>>;
  groupNotes?: Partial<Record<ViewerGroup, string>>;
  highlightGroup?: ViewerGroup | null;
  className?: string;
  showExplode?: boolean;
  modelCredit?: string | null;
  showEngineering?: boolean;
  dimensionLabels?: { length?: string; width?: string; wheelbase?: string } | null;
  /** Accessible name; the old API had none. */
  title?: string;
};

export function CarViewer({
  build,
  glbUrl,
  partsByGroup,
  groupNotes,
  className,
  modelCredit,
  title = "car",
}: CarViewerProps) {
  return (
    <Car3DViewer
      build={build}
      title={title}
      className={className}
      partsByGroup={partsByGroup}
      groupNotes={groupNotes}
      dimensions={{
        length_mm: build.length_mm,
        width_mm: build.width_mm,
        height_mm: build.height_mm,
        wheelbase_mm: build.wheelbase_mm,
        ground_clearance_mm: build.ground_clearance_mm,
      }}
      model={
        glbUrl
          ? {
              url: glbUrl,
              isExact: false,
              format: "glb",
              compression: [],
              credit: modelCredit ?? null,
              license: null,
              author: null,
              sourceUrl: null,
              posterUrl: null,
            }
          : null
      }
    />
  );
}
