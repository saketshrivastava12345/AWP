"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, type JSX } from "react";
import { useThree } from "@react-three/fiber";
import {
  ContactShadows,
  Environment,
  Grid,
  Lightformer,
  MeshReflectorMaterial,
} from "@react-three/drei";
import * as THREE from "three";
import { VIEWER_COLORS } from "@/lib/viewer-colors";
import { LIGHTING, type LightingId } from "@/lib/viewer-lighting";
import type { QualityProfile } from "@/lib/viewer-quality";

/**
 * Lighting rigs, built in the scene rather than downloaded.
 *
 * Car paint is judged by what it reflects: a metallic finish with nothing to
 * mirror renders nearly black. Each rig is a set of soft light panels (drei
 * Lightformers) and simple shapes rendered once into a cube map, plus a few
 * real lights for shape and shadow. Nothing is fetched: an HDR from a CDN is
 * one more thing that can fail, and when the old one did it took the page
 * down with it.
 *
 *   STUDIO       long overhead softboxes, side strips, one warm sparkle
 *   OUTDOOR      a daylight dome, a low warm sun, light bounced off the ground
 *   DARK         low key: rim strips trace the silhouette out of black
 *   ENGINEERING  flat, even, neutral-cool light for reading form
 *
 * Tone mapping is ACES Filmic with an exposure tuned per rig so no highlight
 * clips to white.
 */

type LightingQuality = Pick<
  QualityProfile,
  "shadows" | "shadowMapSize" | "envResolution"
>;

/** The shadow-casting key light, sized to the area it must cover. */
function KeyLight({
  position,
  intensity,
  color,
  quality,
  extent,
}: {
  position: [number, number, number];
  intensity: number;
  color: string;
  quality: LightingQuality;
  /** Half-width of the square the shadow must cover, metres. */
  extent: number;
}) {
  const light = useRef<THREE.DirectionalLight>(null);
  const invalidate = useThree((state) => state.invalidate);

  // A shadow map is allocated once at its first size; changing the size
  // means dropping the old map so three allocates a new one.
  useLayoutEffect(() => {
    const current = light.current;
    if (!current) return;
    current.shadow.mapSize.set(quality.shadowMapSize, quality.shadowMapSize);
    current.shadow.map?.dispose();
    current.shadow.map = null;
    const camera = current.shadow.camera;
    camera.left = -extent;
    camera.right = extent;
    camera.top = extent;
    camera.bottom = -extent;
    camera.far = 40;
    camera.updateProjectionMatrix();
    invalidate();
  }, [quality.shadowMapSize, extent, invalidate]);

  return (
    <directionalLight
      ref={light}
      position={position}
      intensity={intensity}
      color={color}
      castShadow={quality.shadows}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-near={1}
    />
  );
}

/** Sky dome for the daylight rig: zenith blue, pale horizon, warm ground. */
function DaylightDome() {
  const geometry = useMemo(() => {
    const sphere = new THREE.SphereGeometry(60, 48, 24);
    const positions = sphere.getAttribute("position");
    const colors = new Float32Array(positions.count * 3);
    const zenith = new THREE.Color("#5d7fa6");
    const horizon = new THREE.Color("#dde3e8");
    const ground = new THREE.Color("#4a4038");
    const out = new THREE.Color();
    for (let i = 0; i < positions.count; i += 1) {
      const y = positions.getY(i) / 60;
      if (y >= 0) out.copy(horizon).lerp(zenith, Math.pow(y, 0.6));
      else out.copy(horizon).lerp(ground, Math.min(1, -y * 6));
      colors[i * 3] = out.r;
      colors[i * 3 + 1] = out.g;
      colors[i * 3 + 2] = out.b;
    }
    sphere.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return sphere;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} toneMapped={false} />
    </mesh>
  );
}

function StudioRig() {
  return (
    <>
      <color attach="background" args={["#040406"]} />
      {/* Overhead softboxes. */}
      <Lightformer
        form="rect"
        intensity={2.4}
        position={[0, 6, 0]}
        rotation-x={Math.PI / 2}
        scale={[14, 1.8, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.3}
        position={[0, 6, -4.5]}
        rotation-x={Math.PI / 2}
        scale={[14, 0.9, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.3}
        position={[0, 6, 4.5]}
        rotation-x={Math.PI / 2}
        scale={[14, 0.9, 1]}
      />
      {/* Side strips, low, for the long reflection along the flanks. */}
      <Lightformer
        form="rect"
        intensity={1.1}
        position={[-10, 1.4, 0]}
        rotation-y={Math.PI / 2}
        scale={[24, 0.7, 1]}
      />
      <Lightformer
        form="rect"
        intensity={1.1}
        position={[10, 1.4, 0]}
        rotation-y={-Math.PI / 2}
        scale={[24, 0.7, 1]}
      />
      {/* Warm ring: one point of sparkle, in the brand's gold. */}
      <Lightformer
        form="ring"
        color="#f2d6a0"
        intensity={4}
        scale={2.4}
        position={[7, 4, 8]}
        target={[0, 0, 0]}
      />
      {/* Cool back panel. */}
      <Lightformer
        form="rect"
        color="#d4e2ff"
        intensity={1.2}
        position={[0, 3, -11]}
        scale={[10, 3, 1]}
        target={[0, 0, 0]}
      />
    </>
  );
}

const SUN_DIRECTION = new THREE.Vector3(7, 5.2, 4.5).normalize();

function OutdoorRig() {
  const sun = SUN_DIRECTION.clone().multiplyScalar(40);
  return (
    <>
      <DaylightDome />
      {/* The sun's disc, so paint and glass carry a real specular point. */}
      <Lightformer
        form="circle"
        color="#fff0d6"
        intensity={14}
        scale={4}
        position={[sun.x, sun.y, sun.z]}
        target={[0, 0, 0]}
      />
      {/* A band of bright overcast above the horizon. */}
      <Lightformer
        form="rect"
        color="#eef3f7"
        intensity={0.9}
        position={[0, 9, -20]}
        scale={[60, 6, 1]}
        target={[0, 0, 0]}
      />
    </>
  );
}

function DarkRig() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      {/* Tall strips behind the car on both sides: the rim that draws the outline. */}
      <Lightformer
        form="rect"
        intensity={3.2}
        position={[-7, 2.5, -7]}
        scale={[0.7, 9, 1]}
        target={[0, 0.6, 0]}
      />
      <Lightformer
        form="rect"
        intensity={2.6}
        color="#f1e3c6"
        position={[7, 2.5, -7]}
        scale={[0.7, 9, 1]}
        target={[0, 0.6, 0]}
      />
      {/* A faint overhead line so the roof does not vanish completely. */}
      <Lightformer
        form="rect"
        intensity={0.45}
        position={[0, 7, 0]}
        rotation-x={Math.PI / 2}
        scale={[12, 0.5, 1]}
      />
    </>
  );
}

function EngineeringRig() {
  return (
    <>
      <color attach="background" args={["#8e98a3"]} />
      {/* A large, even ceiling and four low walls: soft, low-contrast light. */}
      <Lightformer
        form="rect"
        intensity={1.1}
        color="#eef3fa"
        position={[0, 9, 0]}
        rotation-x={Math.PI / 2}
        scale={[30, 30, 1]}
      />
      {(
        [
          [12, 2, 0, -Math.PI / 2],
          [-12, 2, 0, Math.PI / 2],
          [0, 2, 12, Math.PI],
          [0, 2, -12, 0],
        ] as const
      ).map(([x, y, z, rotation]) => (
        <Lightformer
          key={`${x}:${z}`}
          form="rect"
          intensity={0.55}
          color="#dfe7f1"
          position={[x, y, z]}
          rotation-y={rotation}
          scale={[26, 5, 1]}
        />
      ))}
    </>
  );
}

const RIGS: Record<LightingId, () => JSX.Element> = {
  studio: StudioRig,
  outdoor: OutdoorRig,
  dark: DarkRig,
  engineering: EngineeringRig,
};

const ENV_INTENSITY: Record<LightingId, number> = {
  studio: 0.95,
  outdoor: 0.8,
  dark: 0.9,
  engineering: 0.62,
};

/** The direct lights of a rig: shape and shadow, alongside the reflections. */
function Lights({
  preset,
  quality,
  extent,
}: {
  preset: LightingId;
  quality: LightingQuality;
  extent: number;
}) {
  switch (preset) {
    case "outdoor": {
      const sun = SUN_DIRECTION.clone().multiplyScalar(12);
      return (
        <>
          <hemisphereLight args={["#bfd3e8", "#5b4f44", 0.55]} />
          <KeyLight
            position={[sun.x, sun.y, sun.z]}
            intensity={2.3}
            color="#ffe0b5"
            quality={quality}
            extent={extent}
          />
        </>
      );
    }
    case "dark":
      return (
        <>
          <ambientLight intensity={0.03} />
          <KeyLight
            position={[3, 7, 5]}
            intensity={0.35}
            color="#fff3df"
            quality={quality}
            extent={extent}
          />
          <directionalLight position={[-5, 2.6, -6]} intensity={1.6} color="#cfd8e3" />
          <directionalLight position={[5, 2.2, -6]} intensity={1.2} color="#e8dcc4" />
        </>
      );
    case "engineering":
      return (
        <>
          <ambientLight intensity={0.5} />
          <hemisphereLight args={["#dfe8f2", "#2a2f36", 0.55]} />
          <KeyLight
            position={[3, 10, 4]}
            intensity={0.7}
            color="#eef4ff"
            quality={quality}
            extent={extent}
          />
        </>
      );
    default:
      return (
        <>
          <ambientLight intensity={0.12} />
          {/* Key: high and forward, warm. The only shadow caster. */}
          <KeyLight
            position={[4.5, 8, 5.5]}
            intensity={1.5}
            color="#fff3df"
            quality={quality}
            extent={extent}
          />
          {/* Rim: behind and opposite, cool, to lift the silhouette off the floor. */}
          <directionalLight position={[-6, 3.5, -7]} intensity={0.7} color="#bccfe0" />
        </>
      );
  }
}

/** Backdrop the visitor sees: a flat colour or a soft vertical gradient. */
function Backdrop({ preset, scale }: { preset: LightingId; scale: number }) {
  const def = LIGHTING[preset];
  const gradient = useMemo(() => {
    if (typeof def.background === "string" || typeof document === "undefined")
      return null;
    const [top, bottom] = def.background;
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const fill = ctx.createLinearGradient(0, 0, 0, 256);
    fill.addColorStop(0, top);
    fill.addColorStop(1, bottom);
    ctx.fillStyle = fill;
    ctx.fillRect(0, 0, 2, 256);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [def.background]);
  useEffect(() => () => gradient?.dispose(), [gradient]);

  const [fogColor, near, far] = def.fog;
  return (
    <>
      {gradient ? (
        <primitive attach="background" object={gradient} />
      ) : (
        <color
          attach="background"
          args={[
            typeof def.background === "string" ? def.background : VIEWER_COLORS.void,
          ]}
        />
      )}
      <fog attach="fog" args={[fogColor, near * scale, far * scale]} />
    </>
  );
}

function setExposure(gl: THREE.WebGLRenderer, value: number): void {
  gl.toneMapping = THREE.ACESFilmicToneMapping;
  gl.toneMappingExposure = value;
}

/** Tone-mapping exposure for the rig. */
function Exposure({ value }: { value: number }) {
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);
  useLayoutEffect(() => {
    setExposure(gl, value);
    invalidate();
  }, [gl, value, invalidate]);
  return null;
}

/**
 * A complete lighting preset: backdrop, fog, exposure, direct lights and the
 * reflection environment.
 */
export function SceneLighting({
  preset,
  quality,
  extent,
  scale = 1,
  backdrop = true,
}: {
  preset: LightingId;
  quality: LightingQuality;
  /** Half-width of the area shadows must cover, metres. */
  extent: number;
  /** The car's size relative to 4.5 m, for fog distances. */
  scale?: number;
  /** Set the scene background, fog and exposure (off where the host does). */
  backdrop?: boolean;
}) {
  const Rig = RIGS[preset];
  return (
    <>
      {backdrop ? (
        <>
          <Backdrop preset={preset} scale={scale} />
          <Exposure value={LIGHTING[preset].exposure} />
        </>
      ) : null}
      <Lights preset={preset} quality={quality} extent={extent} />
      <Environment
        // A new rig is a new environment: remounting re-captures the cube map.
        key={preset}
        resolution={quality.envResolution}
        frames={1}
        environmentIntensity={ENV_INTENSITY[preset]}
      >
        <Rig />
      </Environment>
    </>
  );
}

/**
 * The ground: a softly mirrored showroom floor (a matte one on LOW quality),
 * with a measured grid for the engineering rig, and contact shadows — which
 * are what stop the car looking as if it floats.
 *
 * The mirror's settings are the same for every rig on purpose. drei's
 * reflector allocates its render targets from those settings and never frees
 * them, so changing them per rig would leak GPU memory on every switch; the
 * rigs differ only in the floor's colour and roughness, which cost nothing to
 * change. For the same reason the contact-shadow area is fixed per car.
 *
 * `contactFrames`: how many frames the contact shadows re-render for. They
 * are a full extra render of the car, so while nothing moves they are
 * captured once (1) and only follow the car (Infinity) while parts move.
 */
export function ViewerFloor({
  preset,
  quality,
  contactFrames = Infinity,
  extent = 6.5,
  size = 140,
  epoch = 0,
}: {
  preset: LightingId;
  quality: Pick<
    QualityProfile,
    "reflector" | "reflectorResolution" | "contactShadowResolution"
  >;
  contactFrames?: number;
  /** Half-width of the contact-shadow area, metres. Keep it fixed per car. */
  extent?: number;
  size?: number;
  /**
   * Bump to re-capture the contact shadows once (the car changed shape).
   * Re-rendering ContactShadows restarts its frame count.
   */
  epoch?: number;
}) {
  const def = LIGHTING[preset];
  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        {quality.reflector ? (
          <MeshReflectorMaterial
            blur={quality.reflectorResolution >= 1024 ? [320, 90] : [180, 60]}
            resolution={quality.reflectorResolution}
            mixBlur={1}
            mixStrength={18}
            mixContrast={1}
            depthScale={1.1}
            minDepthThreshold={0.35}
            maxDepthThreshold={1.3}
            mirror={0.35}
            color={def.floorColor}
            roughness={def.floorRoughness}
            metalness={0.5}
            // Grazing reflections of the light panels would otherwise paint a
            // bright band across the distant floor.
            envMapIntensity={0.35}
          />
        ) : (
          <meshStandardMaterial
            color={def.floorColor}
            roughness={Math.max(0.9, def.floorRoughness)}
            metalness={0.1}
            envMapIntensity={0.35}
          />
        )}
      </mesh>
      {def.grid ? (
        <Grid
          position={[0, 0.001, 0]}
          args={[size, size]}
          cellSize={0.1}
          cellThickness={0.6}
          cellColor="#1b2330"
          sectionSize={1}
          sectionThickness={1.1}
          sectionColor={VIEWER_COLORS.goldDeep}
          fadeDistance={24}
          fadeStrength={1.6}
          infiniteGrid
        />
      ) : null}
      <ContactShadows
        userData={{ epoch }}
        position={[0, 0.002, 0]}
        opacity={def.contactShadowOpacity}
        scale={extent * 2}
        blur={2.2}
        far={3}
        resolution={quality.contactShadowResolution}
        frames={contactFrames}
        color="#000000"
      />
    </group>
  );
}
