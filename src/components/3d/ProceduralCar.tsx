"use client";

import { useEffect, useMemo, useRef, type ReactNode, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import gsap from "gsap";
import * as THREE from "three";
import type { ViewerGroup } from "@/types/domain";
import type { CarBuild } from "@/lib/car-build";
import { EXPLODE_VECTORS, VIEWER_GROUPS, groupsForPowertrain } from "./viewer-config";
import { computeLayout, type CarLayout } from "./car-layout";
import {
  DEFAULT_PAINT,
  MaterialKit,
  setDim,
  setHighlight,
  type PaintId,
} from "./car-materials";
import {
  caliperGeometry,
  discGeometry,
  hubDetailGeometry,
  rimBarrelGeometry,
  spokesGeometry,
  tyreGeometry,
} from "./car-parts";
import {
  buildBattery,
  buildElectronics,
  buildEngine,
  buildInterior,
  buildSuspension,
  buildTransmission,
  type Part,
} from "./car-systems";
import { CarBody } from "./CarBody";

/**
 * The procedural car.
 *
 * No licensed model exists for most of the catalogue, and an exploded view
 * needs the parts separated anyway — so the car is generated. The body is a
 * lofted surface drawn from the variant's real dimensions (car-shape.ts); the
 * mechanical layout follows its real engine, drivetrain and seating
 * (car-layout.ts). Every subsystem is its own named group, which is what the
 * exploded view animates, the anatomy tour highlights, and a click selects.
 */

/** Distance travelled, in metres. The tour drives it; the wheels roll to match. */
export type CarMotion = { distance: number };

export type ProceduralCarProps = {
  /** From `useCarLayout(build)`, shared with whatever frames the camera. */
  layout: CarLayout;
  paint?: PaintId;
  /** 0 = assembled, 1 = fully exploded. */
  explode?: number;
  /** Group chosen by the visitor. */
  selectedGroup?: ViewerGroup | null;
  /** Group the page is pointing at (the tour, or a part's page). */
  highlightGroup?: ViewerGroup | null;
  onSelectGroup?: (group: ViewerGroup) => void;
  /** Fewer segments and fewer details on small devices. */
  lowDetail?: boolean;
  /** 0 = solid bodywork, 1 = translucent shell showing the systems inside. */
  ghost?: number;
  /** Skips the explode tween and snaps instead. */
  reducedMotion?: boolean;
  motion?: RefObject<CarMotion | null>;
};

/** The layout of a car, memoised on its build. */
export function useCarLayout(build: CarBuild): CarLayout {
  return useMemo(() => computeLayout(build), [build]);
}

/**
 * A subsystem group: its own explode offset, highlight and pointer handling.
 *
 * The explode offset is tweened with GSAP and staggered by index so the car
 * comes apart in sequence rather than all at once.
 */
function Subsystem({
  name,
  index,
  explode,
  explodeScale,
  kit,
  highlighted,
  dimmed,
  reducedMotion,
  onSelect,
  children,
}: {
  name: ViewerGroup;
  index: number;
  explode: number;
  explodeScale: number;
  kit: MaterialKit;
  highlighted: boolean;
  /** Another subsystem is the subject: fade this one so it can be seen. */
  dimmed: boolean;
  reducedMotion: boolean;
  onSelect?: (group: ViewerGroup) => void;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  const vector = EXPLODE_VECTORS[name];
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;
    const target = {
      x: vector[0] * explode * explodeScale,
      y: vector[1] * explode * explodeScale,
      z: vector[2] * explode * explodeScale,
    };
    if (reducedMotion) {
      group.position.set(target.x, target.y, target.z);
      invalidate();
      return;
    }
    const tween = gsap.to(group.position, {
      ...target,
      duration: 0.9,
      delay: index * 0.045,
      ease: "power3.inOut",
      onUpdate: invalidate,
    });
    return () => {
      tween.kill();
    };
  }, [explode, explodeScale, vector, index, invalidate, reducedMotion]);

  // The subsystem being discussed keeps its materials and gains a faint
  // warmth; the rest fade back. Both eased, so a change of subject dissolves.
  const amount = useRef(0);
  const dim = useRef(0);
  useFrame((_, delta) => {
    const step = Math.min(delta, 0.1);
    const target = highlighted ? 1 : 0;
    if (amount.current !== target) {
      const next = THREE.MathUtils.damp(amount.current, target, 5, step);
      amount.current = Math.abs(next - target) < 0.01 ? target : next;
      setHighlight(kit, amount.current);
    }
    const dimTarget = dimmed ? 1 : 0;
    if (dim.current !== dimTarget) {
      const next = THREE.MathUtils.damp(dim.current, dimTarget, 5, step);
      dim.current = Math.abs(next - dimTarget) < 0.01 ? dimTarget : next;
      setDim(kit, dim.current);
    }
  });

  return (
    <group
      ref={ref}
      name={name}
      onPointerDown={
        onSelect
          ? (event) => {
              event.stopPropagation();
              onSelect(name);
            }
          : undefined
      }
      onPointerOver={
        onSelect
          ? (event) => {
              event.stopPropagation();
              document.body.style.cursor = "pointer";
            }
          : undefined
      }
      onPointerOut={
        onSelect
          ? () => {
              document.body.style.cursor = "";
            }
          : undefined
      }
    >
      {children}
    </group>
  );
}

function PartList({
  parts,
  kit,
  shadows,
}: {
  parts: Part[];
  kit: MaterialKit;
  shadows: boolean;
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
    </>
  );
}

/**
 * Eases each corner outward to its own side in the exploded view. A single
 * explode vector per group would push all four wheels the same way.
 */
function useSpread(
  layout: CarLayout,
  explode: number,
  distance: number,
  reducedMotion: boolean,
) {
  const groups = useRef<(THREE.Group | null)[]>([]);
  const current = useRef(0);
  const invalidate = useThree((state) => state.invalidate);
  useFrame((_, delta) => {
    const target = explode * distance * (layout.spec.length / 4.5);
    if (current.current === target) return;
    const next = reducedMotion
      ? target
      : THREE.MathUtils.damp(current.current, target, 4, Math.min(delta, 0.1));
    current.current = Math.abs(next - target) < 0.001 ? target : next;
    layout.wheels.forEach(({ position, side }, index) => {
      const group = groups.current[index];
      if (group) group.position.x = position.x + side * current.current;
    });
    invalidate();
  });
  return groups;
}

/** Road wheels. The rolling parts turn with `motion.distance`. */
function Wheels({
  layout,
  kit,
  lowDetail,
  motion,
  explode,
  reducedMotion,
}: {
  layout: CarLayout;
  kit: MaterialKit;
  lowDetail: boolean;
  motion?: RefObject<CarMotion | null>;
  explode: number;
  reducedMotion: boolean;
}) {
  const corners = useSpread(layout, explode, 1.25, reducedMotion);
  const { spec } = layout;
  const geometry = useMemo(() => {
    const segments = lowDetail ? 28 : 56;
    return {
      tyre: tyreGeometry(spec.wheelRadius, spec.tyreWidth, spec.rimRadius, segments),
      barrel: rimBarrelGeometry(spec.rimRadius, spec.tyreWidth, segments),
      spokes: spokesGeometry(spec.def.spokes, spec.rimRadius, spec.tyreWidth),
      hub: hubDetailGeometry(spec.tyreWidth),
    };
  }, [spec, lowDetail]);
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);

  const spinners = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const distance = motion?.current?.distance ?? 0;
    const angle = distance / spec.wheelRadius;
    layout.wheels.forEach(({ side }, index) => {
      const group = spinners.current[index];
      if (group) group.rotation.x = side === 1 ? angle : -angle;
    });
  });

  // Dark wheels on the performance styles, bright alloys elsewhere.
  const dark =
    spec.style === "supercar" ||
    spec.style === "sports-rear" ||
    spec.style === "gt" ||
    spec.style === "electric-sedan";
  const rim = kit.get(dark ? "rimDark" : "rim");

  return (
    <>
      {layout.wheels.map(({ position, side }, index) => (
        <group
          key={index}
          ref={(node) => {
            corners.current[index] = node;
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
  explode,
  reducedMotion,
}: {
  layout: CarLayout;
  kit: MaterialKit;
  motion?: RefObject<CarMotion | null>;
  explode: number;
  reducedMotion: boolean;
}) {
  const corners = useSpread(layout, explode, 0.7, reducedMotion);
  const { spec } = layout;
  const geometry = useMemo(
    () => ({
      disc: discGeometry(spec.rimRadius),
      caliper: caliperGeometry(spec.rimRadius),
    }),
    [spec],
  );
  useEffect(() => () => Object.values(geometry).forEach((g) => g.dispose()), [geometry]);

  const spinners = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    const angle = (motion?.current?.distance ?? 0) / spec.wheelRadius;
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
            corners.current[index] = node;
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
          </group>
          <mesh
            geometry={geometry.caliper}
            material={kit.get("caliper")}
            position={[inboard, 0, 0]}
            castShadow
          />
        </group>
      ))}
    </>
  );
}

export function ProceduralCar({
  layout,
  paint = DEFAULT_PAINT,
  explode = 0,
  selectedGroup = null,
  highlightGroup = null,
  onSelectGroup,
  lowDetail = false,
  ghost = 0,
  reducedMotion = false,
  motion,
}: ProceduralCarProps) {
  const { build } = layout;

  // One material kit per subsystem, so a highlight tints only its own group.
  const kits = useMemo(
    () =>
      Object.fromEntries(
        VIEWER_GROUPS.map((group) => [group, new MaterialKit()]),
      ) as Record<ViewerGroup, MaterialKit>,
    [],
  );
  useEffect(() => () => Object.values(kits).forEach((kit) => kit.dispose()), [kits]);

  const systems = useMemo(
    () => ({
      engine: buildEngine(layout, lowDetail),
      transmission: buildTransmission(layout, lowDetail),
      suspension: buildSuspension(layout, lowDetail),
      battery: buildBattery(layout, lowDetail),
      interior: buildInterior(layout, lowDetail),
      electronics: buildElectronics(layout, lowDetail),
    }),
    [layout, lowDetail],
  );
  useEffect(
    () => () => {
      for (const parts of Object.values(systems))
        for (const part of parts) part.geometry.dispose();
    },
    [systems],
  );

  // Groups follow the powertrain: an EV has a battery and no engine, a hybrid
  // both. An engine whose position is not recorded is not drawn at all.
  const active = groupsForPowertrain(build.powertrain).filter(
    (group) => group !== "engine" || layout.engine !== null,
  );
  const explodeScale = layout.spec.length / 4.5;
  const shadows = !lowDetail;

  const sub = (group: ViewerGroup, children: ReactNode) =>
    active.includes(group) ? (
      <Subsystem
        key={group}
        name={group}
        index={active.indexOf(group)}
        explode={explode}
        explodeScale={explodeScale}
        kit={kits[group]}
        highlighted={selectedGroup === group || highlightGroup === group}
        // The body has its own ghosting; every other system steps back when
        // the page is pointing at a different one.
        dimmed={
          group !== "body" &&
          highlightGroup !== null &&
          highlightGroup !== group &&
          selectedGroup !== group
        }
        reducedMotion={reducedMotion}
        onSelect={onSelectGroup}
      >
        {children}
      </Subsystem>
    ) : null;

  return (
    <group name="procedural-car">
      {sub(
        "body",
        <CarBody
          layout={layout}
          kit={kits.body}
          lowDetail={lowDetail}
          ghost={ghost}
          paint={paint}
        />,
      )}
      {sub(
        "wheels",
        <Wheels
          layout={layout}
          kit={kits.wheels}
          lowDetail={lowDetail}
          motion={motion}
          explode={explode}
          reducedMotion={reducedMotion}
        />,
      )}
      {sub(
        "brakes",
        <Brakes
          layout={layout}
          kit={kits.brakes}
          motion={motion}
          explode={explode}
          reducedMotion={reducedMotion}
        />,
      )}
      {sub(
        "suspension",
        <PartList parts={systems.suspension} kit={kits.suspension} shadows={shadows} />,
      )}
      {sub(
        "engine",
        <PartList parts={systems.engine} kit={kits.engine} shadows={shadows} />,
      )}
      {sub(
        "transmission",
        <PartList
          parts={systems.transmission}
          kit={kits.transmission}
          shadows={shadows}
        />,
      )}
      {sub(
        "battery",
        <PartList parts={systems.battery} kit={kits.battery} shadows={shadows} />,
      )}
      {sub(
        "interior",
        <PartList parts={systems.interior} kit={kits.interior} shadows={false} />,
      )}
      {sub(
        "electronics",
        <PartList parts={systems.electronics} kit={kits.electronics} shadows={false} />,
      )}
    </group>
  );
}
