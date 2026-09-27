"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import type { ViewerGroup } from "@/types/domain";
import { GOLD } from "@/lib/viewer-colors";
import {
  offsetAt,
  planExplode,
  type ExplodePlan,
  type GroupExtent,
} from "@/lib/viewer-explode";
import {
  DISC_PARAMS,
  WHEEL_FINISH_PARAMS,
  type DiscType,
  type WheelFinish,
  type WheelStyle,
} from "@/lib/viewer-paint";
import { VIEWER_GROUPS, drawnGroups } from "./viewer-config";
import type { CarLayout } from "./car-layout";
import {
  DEFAULT_SURFACE,
  MaterialKit,
  blendSurface,
  setDim,
  setHighlight,
  type PaintSurface,
} from "./car-materials";
import {
  caliperGeometry,
  discGeometry,
  hubDetailGeometry,
  rimBarrelGeometry,
  spokesGeometry,
  tyreGeometry,
} from "./car-parts";
import { buildSystems, type Part } from "./car-systems";
import { buildBodyGeometry } from "./body-geometry";
import { useCachedGeometry } from "./geometry-cache";
import { edgeMaterial, mergedEdges, toneEdges } from "./blueprint-edges";
import { CarBody } from "./CarBody";
import { wheelDefaults } from "./wheel-defaults";

export { useCarLayout } from "./layout-cache";

/**
 * The procedural car.
 *
 * No licensed model exists for most of the catalogue, and an exploded view
 * needs the parts separated anyway — so the car is generated. The body is a
 * lofted surface drawn from the variant's real dimensions (car-shape.ts); the
 * mechanical layout follows its real engine, drivetrain and seating
 * (car-layout.ts). Every subsystem is its own named group, which is what the
 * exploded view moves, the anatomy tour highlights, and a click selects.
 *
 * Rendering is on demand: every animation here (explode, fades, highlights,
 * paint) asks for frames while it runs and stops asking when it settles, so
 * a still car costs nothing.
 */

/** Distance travelled, in metres. The tour drives it; the wheels roll to match. */
export type CarMotion = { distance: number };

/** How the car is finished. Every field is presentation, never catalogue data. */
export type CarAppearance = {
  paint: PaintSurface;
  /** Spoke pattern; null keeps the body style's own. */
  wheelStyle: WheelStyle | null;
  /** Rim finish; null keeps the body style's own. */
  wheelFinish: WheelFinish | null;
  /** Caliper colour, hex. */
  caliper: string;
  disc: DiscType;
};

/**
 * The blueprint (the scroll-driven exploded drawing) drives the car through
 * this object, written by the stage every frame. Separation per group is set
 * directly on the groups from it, so scrolling never causes a React render.
 */
export type BlueprintState = {
  /** 0 = the rendered car, 1 = the line drawing. Scales the line work. */
  drawing: number;
  /** Separation per group: 0 assembled, 1 at its exploded position. */
  explode: Partial<Record<ViewerGroup, number>>;
  /**
   * Filled by the car once it has measured itself: a point above each group
   * that rides with it, for the finale's labels.
   */
  labels: Map<ViewerGroup, AnchorPoint>;
};

/** A point that rides on part of the car, for hotspots and callouts. */
export type AnchorPoint = { object: THREE.Object3D; local: THREE.Vector3 };
export type AnchorRegistry = Map<string, AnchorPoint>;

export type ProceduralCarProps = {
  /** From `useCarLayout(build)`, shared with whatever frames the camera. */
  layout: CarLayout;
  appearance?: Partial<CarAppearance>;
  /** 0 = assembled, 1 = fully exploded. */
  explode?: number;
  /** Group chosen by the visitor. */
  selectedGroup?: ViewerGroup | null;
  /** Group the page is pointing at (the tour, or a part's page). */
  highlightGroup?: ViewerGroup | null;
  /** Group under the pointer. */
  hoveredGroup?: ViewerGroup | null;
  /** X-ray: these groups glow and the others (bar the body) step back. */
  emphasis?: readonly ViewerGroup[] | null;
  onSelectGroup?: (group: ViewerGroup) => void;
  /** Pointer over a group (with its position on the canvas) or off it. */
  onHoverGroup?: (group: ViewerGroup | null, point?: { x: number; y: number }) => void;
  /** Fewer segments and fewer details on small devices. */
  lowDetail?: boolean;
  /** Procedural surface textures (flake, weave, brushed metal). */
  surfaceDetail?: boolean;
  /** Physically transmissive windscreen glass. */
  glassTransmission?: boolean;
  /** 0 = solid bodywork, 1 = translucent shell showing the systems inside. */
  ghost?: number;
  /** Snaps the explode and paint changes instead of animating them. */
  reducedMotion?: boolean;
  motion?: RefObject<CarMotion | null>;
  /** Filled with hotspot and callout anchors while mounted. */
  anchors?: AnchorRegistry;
  /** True while parts are moving apart or together. */
  onExplodeMotion?: (moving: boolean) => void;
  /** The geometry is built and in the scene. */
  onReady?: () => void;
  /**
   * Scroll-driven blueprint. When set, the `explode` prop is ignored and each
   * group is placed from `blueprint.current.explode` every frame.
   */
  blueprint?: RefObject<BlueprintState>;
  /** Build the hairline edges of every part (the blueprint's line work). */
  lineWork?: boolean;
  /** How far groups that are not the subject step back (0–1). */
  restDim?: number;
  /** How warm the line work of groups that are not the subject is (0–1). */
  restEdge?: number;
  /** The same for the body's panel lines; defaults to `restEdge`. */
  shellEdge?: number;
};

// ---------------------------------------------------------------------------
// Material transitions
// ---------------------------------------------------------------------------

type Tint = { color: string; metalness: number; roughness: number };

const TWEEN = { duration: 0.6, ease: "power2.inOut" } as const;

const scratchColor = new THREE.Color();

/** One step of a tint change; returns what the material now shows. */
function tintStep(
  material: THREE.MeshStandardMaterial,
  from: Tint,
  to: Tint,
  t: number,
): Tint {
  material.color.set(from.color).lerp(scratchColor.set(to.color), t);
  material.metalness = THREE.MathUtils.lerp(from.metalness, to.metalness, t);
  material.roughness = THREE.MathUtils.lerp(from.roughness, to.roughness, t);
  return {
    color: `#${material.color.getHexString()}`,
    metalness: material.metalness,
    roughness: material.roughness,
  };
}

/** One step of a paint change, flake included; returns what is now shown. */
function paintStep(
  kit: MaterialKit,
  material: THREE.MeshPhysicalMaterial,
  from: PaintSurface,
  to: PaintSurface,
  t: number,
): PaintSurface {
  blendSurface(material, from, to, t);
  const flake = THREE.MathUtils.lerp(from.flake, to.flake, t);
  kit.setFlake(flake);
  return {
    color: `#${material.color.getHexString()}`,
    metalness: material.metalness,
    roughness: material.roughness,
    clearcoat: material.clearcoat,
    clearcoatRoughness: material.clearcoatRoughness,
    flake,
    iridescence: t >= 1 ? to.iridescence : material.iridescence,
  };
}

/**
 * Ease a material's colour and finish to a new value over ~600 ms. An
 * interrupted change continues from wherever the material had got to.
 */
function useTint(
  material: THREE.MeshStandardMaterial,
  tint: Tint,
  reducedMotion: boolean,
) {
  const invalidate = useThree((state) => state.invalidate);
  const shown = useRef<Tint | null>(null);
  const { color, metalness, roughness } = tint;

  useEffect(() => {
    const to: Tint = { color, metalness, roughness };
    const from = shown.current;
    if (!from || reducedMotion) {
      shown.current = tintStep(material, to, to, 1);
      invalidate();
      return;
    }
    if (
      from.color === to.color &&
      from.metalness === to.metalness &&
      from.roughness === to.roughness
    )
      return;
    const state = { t: 0 };
    const tween = gsap.to(state, {
      t: 1,
      ...TWEEN,
      onUpdate: () => {
        shown.current = tintStep(material, from, to, state.t);
        invalidate();
      },
    });
    return () => {
      tween.kill();
    };
  }, [material, color, metalness, roughness, reducedMotion, invalidate]);
}

/** The same for the car paint, which also has clear coat, flake and pearl. */
function usePaint(kit: MaterialKit, paint: PaintSurface, reducedMotion: boolean) {
  const invalidate = useThree((state) => state.invalidate);
  const shown = useRef<PaintSurface | null>(null);
  const material = kit.get("paint");
  const {
    color,
    metalness,
    roughness,
    clearcoat,
    clearcoatRoughness,
    flake,
    iridescence,
  } = paint;

  useEffect(() => {
    const to: PaintSurface = {
      color,
      metalness,
      roughness,
      clearcoat,
      clearcoatRoughness,
      flake,
      iridescence,
    };
    const from = shown.current;
    if (!from || reducedMotion) {
      shown.current = paintStep(kit, material, to, to, 1);
      invalidate();
      return;
    }
    const state = { t: 0 };
    const tween = gsap.to(state, {
      t: 1,
      ...TWEEN,
      onUpdate: () => {
        shown.current = paintStep(kit, material, from, to, state.t);
        invalidate();
      },
    });
    return () => {
      tween.kill();
    };
  }, [
    kit,
    material,
    color,
    metalness,
    roughness,
    clearcoat,
    clearcoatRoughness,
    flake,
    iridescence,
    reducedMotion,
    invalidate,
  ]);
}

// ---------------------------------------------------------------------------
// Subsystem
// ---------------------------------------------------------------------------

/** Pointer travel (px) beyond which a press is a drag, not a click. */
const CLICK_TOLERANCE = 5;

/**
 * A subsystem group: its highlight, fade and pointer handling. The explode
 * offset is set on the group by ProceduralCar's timeline.
 */
function Subsystem({
  name,
  kit,
  highlight,
  dim,
  pickable,
  onHover,
  onSelect,
  register,
  lines,
  restEdge = 0,
  blueprint,
  children,
}: {
  name: ViewerGroup;
  kit: MaterialKit;
  /** 0–1: how warmly the group is tinted. */
  highlight: number;
  /** 0–1: how far the group steps back. */
  dim: number;
  /** Takes part in hover and click. */
  pickable: boolean;
  onHover?: ProceduralCarProps["onHoverGroup"];
  onSelect?: (group: ViewerGroup) => void;
  register: (name: ViewerGroup, group: THREE.Group | null) => void;
  /**
   * The group's blueprint line work. Its colour runs from ink to gold with
   * the highlight; its opacity follows the drawing, except on the body, whose
   * panel lines fade with the ghosted shell instead.
   */
  lines?: THREE.LineBasicMaterial | null;
  /** Warmth of the line work when the group is not the subject (0–1). */
  restEdge?: number;
  blueprint?: RefObject<BlueprintState>;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    register(name, ref.current);
    return () => register(name, null);
  }, [name, register]);

  // Changes of subject dissolve rather than switch.
  const amount = useRef(0);
  const faded = useRef(0);
  const warmth = useRef(0);
  useEffect(() => {
    invalidate();
  }, [highlight, dim, restEdge, invalidate]);

  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1);
    let moving = false;
    if (amount.current !== highlight) {
      const next = THREE.MathUtils.damp(amount.current, highlight, 6, step);
      amount.current = Math.abs(next - highlight) < 0.01 ? highlight : next;
      setHighlight(kit, amount.current);
      moving = moving || amount.current !== highlight;
    }
    if (faded.current !== dim) {
      const next = THREE.MathUtils.damp(faded.current, dim, 5, step);
      faded.current = Math.abs(next - dim) < 0.01 ? dim : next;
      setDim(kit, faded.current);
      moving = moving || faded.current !== dim;
    }
    if (lines) {
      const target = Math.max(highlight, restEdge);
      if (warmth.current !== target) {
        const next = THREE.MathUtils.damp(warmth.current, target, 5, step);
        warmth.current = Math.abs(next - target) < 0.01 ? target : next;
        moving = moving || warmth.current !== target;
      }
      const drawing = blueprint?.current?.drawing ?? 0;
      // The subject's lines are strong; the rest stay hairlines.
      const opacity =
        name === "body" ? null : drawing * (0.2 + 0.72 * warmth.current);
      toneEdges(lines, warmth.current, opacity);
    }
    if (moving) invalidate();
  });

  const interactive = pickable && (onHover !== undefined || onSelect !== undefined);
  const point = (event: ThreeEvent<PointerEvent>) => ({
    x: event.nativeEvent.offsetX,
    y: event.nativeEvent.offsetY,
  });

  return (
    <group
      ref={ref}
      name={name}
      onPointerOver={
        interactive
          ? (event) => {
              event.stopPropagation();
              onHover?.(name, point(event));
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (event) => {
              event.stopPropagation();
              onHover?.(name, point(event));
            }
          : undefined
      }
      onPointerOut={
        interactive
          ? () => {
              onHover?.(null);
            }
          : undefined
      }
      onClick={
        interactive
          ? (event) => {
              // A drag to orbit that happens to end over the car is not a click.
              if (event.delta > CLICK_TOLERANCE) return;
              event.stopPropagation();
              onSelect?.(name);
            }
          : undefined
      }
    >
      {children}
    </group>
  );
}

/** Blueprint line work is decoration: never picked by the pointer. */
const noRaycast = () => null;

function PartList({
  parts,
  kit,
  shadows,
  lines,
  owner,
  cacheKey,
}: {
  parts: Part[];
  kit: MaterialKit;
  shadows: boolean;
  /** Draw the parts' hard edges with this material (blueprint). */
  lines?: THREE.LineBasicMaterial | null;
  /** Cache owner and key for the edge buffer (the layout, and the group). */
  owner: object;
  cacheKey: string;
}) {
  return (
    <>
      {parts.map((part, index) => (
        <mesh
          key={index}
          geometry={part.geometry}
          material={kit.get(part.material)}
          castShadow={shadows}
        />
      ))}
      {lines && parts.length > 0 ? (
        <PartEdges parts={parts} material={lines} owner={owner} cacheKey={cacheKey} />
      ) : null}
    </>
  );
}

/** The merged hard edges of a group's parts, built once per car and detail level. */
function PartEdges({
  parts,
  material,
  owner,
  cacheKey,
}: {
  parts: Part[];
  material: THREE.LineBasicMaterial;
  owner: object;
  cacheKey: string;
}) {
  const build = useCallback(
    () => mergedEdges(parts.map((part) => part.geometry)),
    [parts],
  );
  const geometry = useCachedGeometry(owner, `edges:${cacheKey}`, build);
  return <lineSegments geometry={geometry} material={material} raycast={noRaycast} />;
}

type Corners = { wheels: (THREE.Group | null)[]; brakes: (THREE.Group | null)[] };

/** Road wheels. The rolling parts turn with `motion.distance`. */
function Wheels({
  layout,
  kit,
  lowDetail,
  style,
  motion,
  corners,
  lines,
}: {
  layout: CarLayout;
  kit: MaterialKit;
  lowDetail: boolean;
  style: WheelStyle;
  motion?: RefObject<CarMotion | null>;
  corners: RefObject<Corners>;
  lines?: THREE.LineBasicMaterial | null;
}) {
  const { spec } = layout;
  const geometry = useMemo(() => {
    const segments = lowDetail ? 28 : 56;
    return {
      tyre: tyreGeometry(spec.wheelRadius, spec.tyreWidth, spec.rimRadius, segments),
      barrel: rimBarrelGeometry(spec.rimRadius, spec.tyreWidth, segments),
      spokes: spokesGeometry(style, spec.rimRadius, spec.tyreWidth),
      hub: hubDetailGeometry(spec.tyreWidth),
    };
  }, [spec, lowDetail, style]);
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);
  const wantLines = Boolean(lines);
  const edges = useMemo(
    () =>
      wantLines
        ? mergedEdges([geometry.tyre, geometry.barrel, geometry.spokes, geometry.hub])
        : null,
    [geometry, wantLines],
  );
  useEffect(() => () => edges?.dispose(), [edges]);

  const spinners = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    if (!motion) return;
    const angle = (motion.current?.distance ?? 0) / spec.wheelRadius;
    layout.wheels.forEach(({ side }, index) => {
      const group = spinners.current[index];
      if (group) group.rotation.x = side === 1 ? angle : -angle;
    });
  });

  const rim = kit.get("rim");
  return (
    <>
      {layout.wheels.map(({ position, side }, index) => (
        <group
          key={index}
          ref={(node) => {
            corners.current.wheels[index] = node;
          }}
          position={position}
          rotation={[0, side === 1 ? 0 : Math.PI, 0]}
        >
          <group
            ref={(node) => {
              spinners.current[index] = node;
            }}
          >
            <mesh geometry={geometry.tyre} material={kit.get("tyre")} castShadow />
            <mesh geometry={geometry.barrel} material={rim} />
            <mesh geometry={geometry.spokes} material={rim} castShadow />
            <mesh geometry={geometry.hub} material={kit.get("chrome")} />
            {edges && lines ? (
              <lineSegments geometry={edges} material={lines} raycast={noRaycast} />
            ) : null}
          </group>
        </group>
      ))}
    </>
  );
}

/** Discs turn with the wheels; calipers are fixed to the upright. */
function Brakes({
  layout,
  kit,
  motion,
  corners,
  lines,
}: {
  layout: CarLayout;
  kit: MaterialKit;
  motion?: RefObject<CarMotion | null>;
  corners: RefObject<Corners>;
  lines?: THREE.LineBasicMaterial | null;
}) {
  const { spec } = layout;
  const geometry = useMemo(
    () => ({
      disc: discGeometry(spec.rimRadius),
      caliper: caliperGeometry(spec.rimRadius),
    }),
    [spec],
  );
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);
  const wantLines = Boolean(lines);
  const edges = useMemo(
    () =>
      wantLines
        ? { disc: mergedEdges([geometry.disc]), caliper: mergedEdges([geometry.caliper]) }
        : null,
    [geometry, wantLines],
  );
  useEffect(
    () => () => {
      edges?.disc.dispose();
      edges?.caliper.dispose();
    },
    [edges],
  );

  const spinners = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    if (!motion) return;
    const angle = (motion.current?.distance ?? 0) / spec.wheelRadius;
    layout.wheels.forEach(({ side }, index) => {
      const group = spinners.current[index];
      if (group) group.rotation.x = side === 1 ? angle : -angle;
    });
  });

  const inboard = -spec.tyreWidth * 0.12;
  return (
    <>
      {layout.wheels.map(({ position, side }, index) => (
        <group
          key={index}
          ref={(node) => {
            corners.current.brakes[index] = node;
          }}
          position={position}
          rotation={[0, side === 1 ? 0 : Math.PI, 0]}
        >
          <group
            position={[inboard, 0, 0]}
            ref={(node) => {
              spinners.current[index] = node;
            }}
          >
            <mesh geometry={geometry.disc} material={kit.get("disc")} />
            {edges && lines ? (
              <lineSegments geometry={edges.disc} material={lines} raycast={noRaycast} />
            ) : null}
          </group>
          <mesh
            geometry={geometry.caliper}
            material={kit.get("caliper")}
            position={[inboard, 0, 0]}
            castShadow
          />
          {edges && lines ? (
            <lineSegments
              geometry={edges.caliper}
              material={lines}
              position={[inboard, 0, 0]}
              raycast={noRaycast}
            />
          ) : null}
        </group>
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// The car
// ---------------------------------------------------------------------------

export function ProceduralCar({
  layout,
  appearance,
  explode = 0,
  selectedGroup = null,
  highlightGroup = null,
  hoveredGroup = null,
  emphasis = null,
  onSelectGroup,
  onHoverGroup,
  lowDetail = false,
  surfaceDetail = true,
  glassTransmission = false,
  ghost = 0,
  reducedMotion = false,
  motion,
  anchors,
  onExplodeMotion,
  onReady,
  blueprint,
  lineWork = false,
  restDim = 0,
  restEdge = 0,
  shellEdge,
}: ProceduralCarProps) {
  const { build, spec } = layout;
  const invalidate = useThree((state) => state.invalidate);

  // One material kit per subsystem, so a highlight tints only its own group.
  // Created once; quality changes are applied to the live kits, before the
  // first frame (layout effect), so no frame is drawn with the wrong recipe.
  const kits = useMemo(
    () =>
      Object.fromEntries(
        VIEWER_GROUPS.map((group) => [group, new MaterialKit()]),
      ) as Record<ViewerGroup, MaterialKit>,
    [],
  );
  useEffect(() => () => Object.values(kits).forEach((kit) => kit.dispose()), [kits]);

  // Blueprint line work: one hairline material per group, so the subject can
  // turn gold while the rest stay ink. Created only when asked for.
  const lineMaterials = useMemo(
    () =>
      lineWork
        ? (Object.fromEntries(
            VIEWER_GROUPS.map((group) => [group, edgeMaterial()]),
          ) as Record<ViewerGroup, THREE.LineBasicMaterial>)
        : null,
    [lineWork],
  );
  useEffect(
    () => () => {
      if (lineMaterials)
        Object.values(lineMaterials).forEach((material) => material.dispose());
    },
    [lineMaterials],
  );
  useLayoutEffect(() => {
    for (const kit of Object.values(kits)) kit.setSurfaceDetail(surfaceDetail);
    kits.body.setGlassTransmission(glassTransmission);
    invalidate();
  }, [kits, surfaceDetail, glassTransmission, invalidate]);

  // Geometry, built once per car and level of detail and shared with any
  // other canvas showing the same car.
  const body = useCachedGeometry(layout, `body:${lowDetail}`, () =>
    buildBodyGeometry(layout, lowDetail),
  );
  const systems = useCachedGeometry(layout, `systems:${lowDetail}`, () =>
    buildSystems(layout, lowDetail, body.exhaustTips),
  );

  // Groups follow the powertrain: an EV has a battery and no engine, a hybrid
  // both. An engine whose position is not recorded is not drawn at all.
  const active = useMemo(() => drawnGroups(build), [build]);
  const shadows = !lowDetail;

  // --- appearance -------------------------------------------------------------
  const paint = appearance?.paint ?? DEFAULT_SURFACE;
  const wheels = wheelDefaults(spec.style);
  const wheelStyle = appearance?.wheelStyle ?? wheels.style;
  const wheelFinish: WheelFinish = appearance?.wheelFinish ?? wheels.finish;
  usePaint(kits.body, paint, reducedMotion);
  useTint(kits.wheels.get("rim"), WHEEL_FINISH_PARAMS[wheelFinish], reducedMotion);
  useTint(
    kits.brakes.get("caliper"),
    { color: appearance?.caliper ?? GOLD, metalness: 0.35, roughness: 0.32 },
    reducedMotion,
  );
  useTint(
    kits.brakes.get("disc"),
    DISC_PARAMS[appearance?.disc ?? "steel"],
    reducedMotion,
  );

  // --- groups, corners, explode ------------------------------------------------
  const rootRef = useRef<THREE.Group>(null);
  const groups = useRef(new Map<ViewerGroup, THREE.Group>());
  const corners = useRef<Corners>({ wheels: [], brakes: [] });
  const register = useCallback((name: ViewerGroup, group: THREE.Group | null) => {
    if (group) groups.current.set(name, group);
    else groups.current.delete(name);
  }, []);

  const onExplodeMotionRef = useRef(onExplodeMotion);
  useLayoutEffect(() => {
    onExplodeMotionRef.current = onExplodeMotion;
  }, [onExplodeMotion]);

  // Measure every group as assembled, then plan where each goes. Measured
  // rather than assumed, so the floor rule holds for any car.
  const measurePlan = useCallback((): {
    plan: ExplodePlan;
    boxes: Map<ViewerGroup, THREE.Box3>;
  } | null => {
    const root = rootRef.current;
    if (!root) return null;
    root.updateWorldMatrix(true, true);
    const inverse = root.matrixWorld.clone().invert();
    const extents: GroupExtent[] = [];
    const boxes = new Map<ViewerGroup, THREE.Box3>();
    for (const name of active) {
      const node = groups.current.get(name);
      if (!node) continue;
      const box = new THREE.Box3().setFromObject(node);
      if (box.isEmpty()) continue;
      box.applyMatrix4(inverse);
      box.translate(node.position.clone().negate());
      boxes.set(name, box);
      // The engine group also carries the radiator in the nose, so its
      // position along the car comes from the layout, not its bounds.
      const centerZ =
        name === "engine" && layout.engine
          ? layout.engine.center.z
          : name === "transmission" && layout.gearbox
            ? layout.gearbox.center.z
            : (box.min.z + box.max.z) / 2;
      extents.push({ group: name, minY: box.min.y, centerZ });
    }
    const plan = planExplode({
      groups: extents,
      powertrain: build.powertrain,
      enginePosition: layout.engine ? build.enginePosition : null,
      length: spec.length,
    });
    return { plan, boxes };
  }, [active, layout, build, spec.length]);

  useEffect(() => {
    // The blueprint places the groups itself, every frame.
    if (blueprint) return;
    const root = rootRef.current;
    if (!root) return;
    const plan = explode > 0 ? (measurePlan()?.plan ?? null) : null;

    const timeline = gsap.timeline({
      paused: true,
      onUpdate: invalidate,
      onComplete: () => {
        onExplodeMotionRef.current?.(false);
        invalidate();
      },
    });
    let moves = 0;
    const move = (
      target: THREE.Vector3,
      to: { x?: number; y?: number; z?: number },
      at: number,
    ) => {
      const changed =
        (to.x !== undefined && Math.abs(target.x - to.x) > 1e-4) ||
        (to.y !== undefined && Math.abs(target.y - to.y) > 1e-4) ||
        (to.z !== undefined && Math.abs(target.z - to.z) > 1e-4);
      if (!changed) return;
      moves += 1;
      timeline.to(target, { ...to, duration: 0.9, ease: "power3.inOut" }, at);
    };
    active.forEach((name, index) => {
      const node = groups.current.get(name);
      if (!node) return;
      const [x, y, z] = plan ? offsetAt(plan, name, explode) : [0, 0, 0];
      move(node.position, { x, y, z }, index * 0.045);
    });
    const spread = plan ? plan.spread : { wheels: 0, brakes: 0 };
    layout.wheels.forEach(({ position, side }, index) => {
      const wheel = corners.current.wheels[index];
      if (wheel)
        move(wheel.position, { x: position.x + side * spread.wheels * explode }, 0.08);
      const brake = corners.current.brakes[index];
      if (brake)
        move(brake.position, { x: position.x + side * spread.brakes * explode }, 0.08);
    });

    if (moves === 0) {
      timeline.kill();
      return;
    }
    onExplodeMotionRef.current?.(true);
    if (reducedMotion) {
      timeline.progress(1);
      timeline.kill();
      return;
    }
    timeline.play();
    return () => {
      timeline.kill();
    };
  }, [
    explode,
    active,
    layout,
    body,
    systems,
    reducedMotion,
    invalidate,
    measurePlan,
    blueprint,
  ]);

  // --- the blueprint: separation per group, straight from the scroll -----------
  const blueprintPlan = useRef<ExplodePlan | null>(null);
  useEffect(() => {
    // A new car, detail level or set of groups is measured afresh.
    blueprintPlan.current = null;
  }, [measurePlan, body, systems]);

  useFrame(() => {
    const state = blueprint?.current;
    if (!state) return;
    if (!blueprintPlan.current) {
      const measured = measurePlan();
      if (!measured) return;
      blueprintPlan.current = measured.plan;
      // A point just above each group, riding with it, for the labels.
      state.labels.clear();
      for (const [name, box] of measured.boxes) {
        const node = groups.current.get(name);
        if (!node || name === "wheels" || name === "brakes") continue;
        const top = new THREE.Vector3(
          (box.min.x + box.max.x) / 2,
          box.max.y + 0.04,
          (box.min.z + box.max.z) / 2,
        );
        state.labels.set(name, { object: node, local: top });
      }
      // Wheels and brakes are labelled at one corner each (the near side).
      const wheel = corners.current.wheels[2];
      if (wheel)
        state.labels.set("wheels", {
          object: wheel,
          local: new THREE.Vector3(0, spec.wheelRadius + 0.05, 0),
        });
      const brake = corners.current.brakes[0];
      if (brake)
        state.labels.set("brakes", {
          object: brake,
          local: new THREE.Vector3(0, spec.rimRadius + 0.04, 0),
        });
    }
    const plan = blueprintPlan.current;
    for (const name of active) {
      const node = groups.current.get(name);
      if (!node) continue;
      const [x, y, z] = offsetAt(plan, name, state.explode[name] ?? 0);
      node.position.set(x, y, z);
    }
    const wheelsOut = state.explode.wheels ?? 0;
    const brakesOut = state.explode.brakes ?? 0;
    layout.wheels.forEach(({ position, side }, index) => {
      const wheel = corners.current.wheels[index];
      if (wheel) wheel.position.x = position.x + side * plan.spread.wheels * wheelsOut;
      const brake = corners.current.brakes[index];
      if (brake) brake.position.x = position.x + side * plan.spread.brakes * brakesOut;
    });
  });

  // --- anchors for hotspots and callouts -----------------------------------------
  useLayoutEffect(() => {
    if (!anchors) return;
    const entries: [string, AnchorPoint][] = [];
    const add = (
      id: string,
      group: ViewerGroup,
      local: THREE.Vector3 | null | undefined,
    ) => {
      const object = groups.current.get(group);
      if (object && local) entries.push([id, { object, local: local.clone() }]);
    };
    const corner = (
      id: string,
      list: (THREE.Group | null)[],
      index: number,
      local: THREE.Vector3,
    ) => {
      const object = list[index];
      if (object) entries.push([id, { object, local }]);
    };

    add("headlights", "body", body.points.headlight);
    add("aero", "body", body.points.aero);
    add("charging", "body", body.points.charging);
    add("engine", "engine", layout.anchors.engine);
    add("suspension", "suspension", layout.anchors.frontSuspension);
    add(
      "battery",
      "battery",
      layout.battery
        ? layout.battery.center
            .clone()
            .setY(layout.battery.center.y + layout.battery.size.y / 2)
        : (layout.motors[0]?.position ?? null),
    );
    const tip = [...body.exhaustTips].sort((a, b) => b.x - a.x)[0];
    add("exhaust", "exhaust", tip);
    // Wheels 0 and 2 are the +x (left-hand) corners, the side the default
    // views look at. Corner space: +x is the wheel's outer face.
    const { tyreWidth, rimRadius } = spec;
    corner(
      "brakes",
      corners.current.brakes,
      0,
      new THREE.Vector3(tyreWidth * 0.5 + 0.02, rimRadius * 0.5, -rimRadius * 0.3),
    );
    corner(
      "wheels",
      corners.current.wheels,
      2,
      new THREE.Vector3(tyreWidth * 0.5 + 0.03, 0, 0),
    );

    // Engineering callouts.
    add(
      "callout:engine",
      "engine",
      layout.engine?.center.clone().setY(layout.engine.center.y + 0.1),
    );
    add(
      "callout:transmission",
      "transmission",
      layout.gearbox?.center ?? layout.differentials[0] ?? null,
    );
    add("callout:battery", "battery", layout.battery?.center ?? null);
    add("callout:motor", "battery", layout.motors[0]?.position ?? null);
    add("callout:suspension", "suspension", layout.anchors.frontSuspension);
    add("callout:exhaust", "exhaust", tip);

    for (const [id, point] of entries) anchors.set(id, point);
    invalidate();
    return () => {
      for (const [id] of entries) anchors.delete(id);
    };
  }, [anchors, body, layout, spec, active, invalidate]);

  // The model is built and mounted: say so once per build.
  const onReadyRef = useRef(onReady);
  useLayoutEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onReadyRef.current?.();
  }, [body, systems]);

  // --- rendering -----------------------------------------------------------------
  const emphasised = (group: ViewerGroup) => emphasis?.includes(group) ?? false;
  const highlightOf = (group: ViewerGroup) =>
    Math.max(
      selectedGroup === group || highlightGroup === group ? 1 : 0,
      emphasised(group) ? 0.75 : 0,
      hoveredGroup === group ? 0.6 : 0,
    );
  const dimOf = (group: ViewerGroup) => {
    if (group === "body" || selectedGroup === group) return 0;
    // The tour points at one system: everything else steps back.
    if (highlightGroup !== null) return highlightGroup === group ? 0 : 1;
    // X-ray: the powertrain stands out, the cabin and wiring recede.
    if (emphasis && emphasis.length > 0 && !emphasised(group)) return 0.7;
    return restDim;
  };

  const sub = (group: ViewerGroup, children: ReactNode) =>
    active.includes(group) ? (
      <Subsystem
        key={group}
        name={group}
        kit={kits[group]}
        highlight={highlightOf(group)}
        dim={dimOf(group)}
        // A ghosted shell must not catch the pointer meant for what is inside.
        pickable={group !== "body" || ghost < 0.5}
        onHover={onHoverGroup}
        onSelect={onSelectGroup}
        register={register}
        lines={lineMaterials?.[group] ?? null}
        restEdge={group === "body" ? (shellEdge ?? restEdge) : restEdge}
        blueprint={blueprint}
      >
        {children}
      </Subsystem>
    ) : null;

  return (
    <group ref={rootRef} name="procedural-car">
      {sub(
        "body",
        <CarBody
          layout={layout}
          geometry={body}
          kit={kits.body}
          ghost={ghost}
          glassTransmission={glassTransmission}
          edgeMaterial={lineMaterials?.body ?? null}
        />,
      )}
      {sub(
        "wheels",
        <Wheels
          layout={layout}
          kit={kits.wheels}
          lowDetail={lowDetail}
          style={wheelStyle}
          motion={motion}
          corners={corners}
          lines={lineMaterials?.wheels ?? null}
        />,
      )}
      {sub(
        "brakes",
        <Brakes
          layout={layout}
          kit={kits.brakes}
          motion={motion}
          corners={corners}
          lines={lineMaterials?.brakes ?? null}
        />,
      )}
      {sub(
        "suspension",
        <PartList
          parts={systems.suspension}
          kit={kits.suspension}
          shadows={shadows}
          lines={lineMaterials?.suspension ?? null}
          owner={layout}
          cacheKey={`suspension:${lowDetail}`}
        />,
      )}
      {sub(
        "engine",
        <PartList
          parts={systems.engine}
          kit={kits.engine}
          shadows={shadows}
          lines={lineMaterials?.engine ?? null}
          owner={layout}
          cacheKey={`engine:${lowDetail}`}
        />,
      )}
      {sub(
        "transmission",
        <PartList
          parts={systems.transmission}
          kit={kits.transmission}
          shadows={shadows}
          lines={lineMaterials?.transmission ?? null}
          owner={layout}
          cacheKey={`transmission:${lowDetail}`}
        />,
      )}
      {sub(
        "battery",
        <PartList
          parts={systems.battery}
          kit={kits.battery}
          shadows={shadows}
          lines={lineMaterials?.battery ?? null}
          owner={layout}
          cacheKey={`battery:${lowDetail}`}
        />,
      )}
      {sub(
        "exhaust",
        <PartList
          parts={systems.exhaust}
          kit={kits.exhaust}
          shadows={shadows}
          lines={lineMaterials?.exhaust ?? null}
          owner={layout}
          cacheKey={`exhaust:${lowDetail}`}
        />,
      )}
      {sub(
        "interior",
        <PartList
          parts={systems.interior}
          kit={kits.interior}
          shadows={false}
          lines={lineMaterials?.interior ?? null}
          owner={layout}
          cacheKey={`interior:${lowDetail}`}
        />,
      )}
      {sub(
        "electronics",
        <PartList
          parts={systems.electronics}
          kit={kits.electronics}
          shadows={false}
          lines={lineMaterials?.electronics ?? null}
          owner={layout}
          cacheKey={`electronics:${lowDetail}`}
        />,
      )}
    </group>
  );
}
