"use client";

import { SceneLighting, ViewerFloor } from "./CarLighting";

/**
 * The studio rig and floor with the settings the scroll-driven scenes (the
 * anatomy tour and the home page story) were tuned with. Those scenes set
 * their own backdrop and fog, so only the lights and the environment come
 * from here. The interactive viewer uses SceneLighting directly, with its
 * lighting presets and quality levels.
 */
export function Lighting({ lowDetail = false }: { lowDetail?: boolean }) {
  return (
    <SceneLighting
      preset="studio"
      backdrop={false}
      extent={5}
      quality={{
        shadows: !lowDetail,
        shadowMapSize: 1024,
        envResolution: lowDetail ? 128 : 256,
      }}
    />
  );
}

/**
 * Showroom floor: a softly reflective ground plus contact shadows. The
 * reflection renders the scene a second time, so small devices get a plain
 * matte floor instead. `contactFrames` defaults to re-rendering every frame,
 * for scenes whose car moves apart (the home page finale).
 */
export function StudioFloor({
  lowDetail = false,
  size = 60,
  contactFrames = Infinity,
}: {
  lowDetail?: boolean;
  size?: number;
  contactFrames?: number;
}) {
  return (
    <ViewerFloor
      preset="studio"
      size={size}
      contactFrames={contactFrames}
      quality={{
        reflector: !lowDetail,
        reflectorResolution: 1024,
        contactShadowResolution: lowDetail ? 256 : 512,
      }}
    />
  );
}
