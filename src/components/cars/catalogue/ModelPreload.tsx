"use client";

import type { ReactNode } from "react";
import { useVehicleModelPreload } from "@/components/3d/useVehicleModelPreload";

/**
 * Warms a car's 3D model into the HTTP cache after a moment of mouse hover,
 * so its page opens with the model already on disk. Plain fetches only — no
 * three.js on the listing page. Touch and data-saver visitors are skipped by
 * the hook itself.
 */
export function ModelPreload({
  url,
  compression,
  className,
  children,
}: {
  url: string;
  compression: readonly string[];
  className?: string;
  children: ReactNode;
}) {
  const handlers = useVehicleModelPreload(url, { compression });
  return (
    <div className={className} {...handlers}>
      {children}
    </div>
  );
}
