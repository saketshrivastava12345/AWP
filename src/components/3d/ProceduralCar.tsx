"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useThree } from "@react-three/fiber";
import gsap from "gsap";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { Group } from "three";
import type { ViewerGroup } from "@/types/domain";
import {
  EXPLODE_VECTORS,
  groupsForPowertrain,
  resolveProportions,
  type DimensionInput,
  type Proportions,
} from "./viewer-config";

/**
 * A stylised car assembled from primitives.
 *
 * Realistic licensed car models are not available, and an exploded view needs
 * the parts separated anyway — so the car is built here instead. Every
 * subsystem is its own named `<group>`, which is what the exploded view
 * animates and what the parts encyclopedia highlights.
 *
 * Proportions come from the variant's published dimensions when they exist and
 * from a body-type profile otherwise, so a coupé, an SUV and a hatchback are
 * visibly different shapes rather than one silhouette in three sizes.
 */

export type ProceduralCarProps = {
  bodyType: string | null;
  dimensions?: DimensionInput | null;
  powertrain: "combustion" | "electric" | "hybrid";
  /** 0 = assembled, 1 = fully exploded. */
  explode?: number;
  /** Group currently selected, highlighted in gold. */
  selectedGroup?: ViewerGroup | null;
  /** Group to emphasise without selecting (parts-page highlight). */
  highlightGroup?: ViewerGroup | null;
  onSelectGroup?: (group: ViewerGroup) => void;
  /** Fewer segments and no glass refraction on small devices. */
  lowDetail?: boolean;
  /** Wireframe / x-ray look for Engineering Mode. */
  xray?: boolean;
  /** Skips the explode tween and snaps instead. */
  reducedMotion?: boolean;
};

/**
 * Body width as a fraction of the car's real track width.
 *
 * Under 1 on purpose: the wheels sit at the full half-width, so a body this
 * much narrower lets them break the silhouette at all four corners. That one
 * ratio is the difference between the shape reading as a car and reading as a
 * van.
 */
const BODY_WIDTH_RATIO = 0.84;

const PAINT_COLOR = "#14141b";
const ACCENT_GOLD = "#c8a34a";

/**
 * A subsystem group: handles its own explode offset, selection and pointer.
 *
 * The explode offset is animated with GSAP rather than set directly, and each
 * group is given a small stagger based on its index so the car comes apart in
 * sequence instead of all at once. `invalidate()` is called on every tick so
 * the tween still renders under a demand-driven frameloop.
 */
function Subsystem({
  name,
  index,
  explode,
  selected,
  dimmed,
  reducedMotion,
  onSelect,
  children,
}: {
  name: ViewerGroup;
  index: number;
  explode: number;
  selected: boolean;
  dimmed: boolean;
  reducedMotion: boolean;
  onSelect?: (group: ViewerGroup) => void;
  children: ReactNode;
}) {
  const ref = useRef<Group>(null);
  const vector = EXPLODE_VECTORS[name];
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const group = ref.current;
    if (!group) return;

    const target = {
      x: vector[0] * explode,
      y: vector[1] * explode,
      z: vector[2] * explode,
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
  }, [explode, vector, index, invalidate, reducedMotion]);

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
      <group visible={!dimmed || selected}>{children}</group>
      {/* Dimmed groups stay in the scene at low opacity so the car keeps its
          silhouette while one subsystem is emphasised. */}
      {dimmed && !selected ? <group>{children}</group> : null}
    </group>
  );
}

function useMaterials(xray: boolean, lowDetail: boolean) {
  return useMemo(() => {
    const base = (color: string, metalness: number, roughness: number) =>
      xray
        ? new THREE.MeshBasicMaterial({
            color,
            wireframe: true,
            transparent: true,
            opacity: 0.55,
          })
        : new THREE.MeshStandardMaterial({ color, metalness, roughness });

    const glass = xray
      ? new THREE.MeshBasicMaterial({
          color: "#8fb3bf",
          wireframe: true,
          transparent: true,
          opacity: 0.4,
        })
      : new THREE.MeshPhysicalMaterial({
          color: "#0d1418",
          metalness: 0,
          roughness: 0.08,
          transmission: lowDetail ? 0 : 0.85,
          thickness: 0.4,
          opacity: lowDetail ? 0.55 : 1,
          transparent: lowDetail,
          ior: 1.45,
        });

    return {
      paint: base(PAINT_COLOR, 0.72, 0.28),
      glass,
      tyre: base("#0b0b0e", 0.1, 0.95),
      rim: base("#8a8a93", 0.9, 0.22),
      disc: base("#55555f", 0.85, 0.35),
      caliper: base(ACCENT_GOLD, 0.7, 0.35),
      engine: base("#4a4a55", 0.8, 0.4),
      gearbox: base("#3a3a44", 0.85, 0.35),
      suspension: base("#6b6b76", 0.8, 0.4),
      spring: base(ACCENT_GOLD, 0.6, 0.45),
      interior: base("#1c1c25", 0.15, 0.85),
      electronics: base("#2a6b6b", 0.5, 0.5),
      battery: base("#2f4f5a", 0.55, 0.45),
      trim: base("#26262f", 0.6, 0.5),
    };
  }, [xray, lowDetail]);
}

type Mats = ReturnType<typeof useMaterials>;

/** Body shell, glass and aero surfaces. */
function BodyGroup({ p, m, lowDetail }: { p: Proportions; m: Mats; lowDetail: boolean }) {
  // The body is deliberately NARROWER than the track. A box spanning the full
  // width swallows the wheels entirely and the result reads as a bus — the
  // wheels have to break the silhouette for the shape to look like a car.
  const bodyWidth = p.width * BODY_WIDTH_RATIO;

  const cabinHeight = p.height * p.cabinRatio;
  const lowerHeight = p.height - cabinHeight;
  const beltline = p.groundClearance + lowerHeight;
  const segments = lowDetail ? 2 : 4;

  return (
    <group>
      {/* Main mass: sills, doors and flanks up to the beltline. */}
      <RoundedBox
        args={[bodyWidth, lowerHeight, p.length]}
        radius={Math.min(0.2, lowerHeight * 0.4)}
        smoothness={segments}
        position={[0, p.groundClearance + lowerHeight / 2, 0]}
        material={m.paint}
      />

      {/* Shoulder line: a thin capping strip flush with the top of the main
          mass. It must not rise ABOVE the beltline — a box stacked on top adds
          height and the silhouette immediately reads as a truck cab rather
          than a car. The step down from the cabin does the shaping instead. */}
      <RoundedBox
        args={[bodyWidth * 1.01, lowerHeight * 0.18, p.length * 0.98]}
        radius={0.04}
        smoothness={segments}
        position={[0, beltline - lowerHeight * 0.09, 0]}
        material={m.trim}
      />

      {/* Cabin greenhouse, set back and tapered inboard. */}
      <RoundedBox
        args={[bodyWidth * 0.86, cabinHeight, p.length * 0.42]}
        radius={Math.min(0.12, cabinHeight * 0.28)}
        smoothness={segments}
        position={[0, beltline + cabinHeight / 2 - 0.03, -p.length * 0.04]}
        material={m.glass}
      />

      {/* Roof panel capping the glass. */}
      <RoundedBox
        args={[bodyWidth * 0.76, 0.05, p.length * 0.26]}
        radius={0.02}
        smoothness={2}
        position={[0, beltline + cabinHeight - 0.04, -p.length * 0.07]}
        material={m.paint}
      />

      {/* Wheel-arch flares, so the wheels look enclosed rather than bolted on. */}
      {[1, -1].map((side) =>
        [p.wheelbase / 2, -p.wheelbase / 2].map((z) => (
          <RoundedBox
            key={`${side}-${z}`}
            args={[0.1, p.wheelRadius * 1.5, p.wheelRadius * 2.5]}
            radius={0.04}
            smoothness={2}
            position={[
              side * (bodyWidth / 2 + 0.02),
              p.groundClearance + p.wheelRadius * 0.85,
              z,
            ]}
            material={m.paint}
          />
        )),
      )}

      {/* Front splitter */}
      <RoundedBox
        args={[p.width * BODY_WIDTH_RATIO * 0.95, 0.06, 0.28]}
        radius={0.02}
        smoothness={2}
        position={[0, p.groundClearance + 0.05, p.length / 2 - 0.1]}
        material={m.trim}
      />

      {/* Rear diffuser */}
      <RoundedBox
        args={[p.width * BODY_WIDTH_RATIO * 0.9, 0.12, 0.34]}
        radius={0.02}
        smoothness={2}
        position={[0, p.groundClearance + 0.07, -p.length / 2 + 0.12]}
        material={m.trim}
      />

      {/* Rear wing — only on low, sporting bodies */}
      {p.height < 1.4 ? (
        <>
          <RoundedBox
            args={[p.width * BODY_WIDTH_RATIO * 0.8, 0.04, 0.24]}
            radius={0.015}
            smoothness={2}
            position={[0, p.groundClearance + p.height * 0.92, -p.length / 2 + 0.16]}
            material={m.trim}
          />
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[
                side * p.width * BODY_WIDTH_RATIO * 0.3,
                p.groundClearance + p.height * 0.84,
                -p.length / 2 + 0.16,
              ]}
              material={m.trim}
            >
              <boxGeometry args={[0.03, 0.16, 0.1]} />
            </mesh>
          ))}
        </>
      ) : null}

      {/* Headlights and tail lights */}
      {[-1, 1].map((side) => (
        <mesh
          key={`head-${side}`}
          position={[
            side * p.width * BODY_WIDTH_RATIO * 0.32,
            beltline - lowerHeight * 0.32,
            p.length / 2 - 0.02,
          ]}
          material={m.rim}
        >
          <boxGeometry args={[p.width * BODY_WIDTH_RATIO * 0.24, 0.07, 0.04]} />
        </mesh>
      ))}
      <mesh
        position={[0, beltline - lowerHeight * 0.3, -p.length / 2 + 0.01]}
        material={m.caliper}
      >
        <boxGeometry args={[p.width * BODY_WIDTH_RATIO * 0.74, 0.05, 0.03]} />
      </mesh>
    </group>
  );
}

/** One wheel: tyre, rim and spokes. */
function Wheel({
  position,
  radius,
  width,
  m,
  lowDetail,
}: {
  position: [number, number, number];
  radius: number;
  width: number;
  m: Mats;
  lowDetail: boolean;
}) {
  const segments = lowDetail ? 12 : 28;
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={m.tyre}>
        <cylinderGeometry args={[radius, radius, width, segments]} />
      </mesh>
      <mesh material={m.rim} scale={[0.62, 1.02, 0.62]}>
        <cylinderGeometry args={[radius, radius, width, segments]} />
      </mesh>
      {/* Spokes */}
      {!lowDetail
        ? Array.from({ length: 5 }, (_, index) => (
            <mesh
              key={index}
              material={m.rim}
              rotation={[0, (index / 5) * Math.PI * 2, 0]}
              position={[0, width * 0.5, 0]}
            >
              <boxGeometry args={[radius * 1.15, 0.012, 0.045]} />
            </mesh>
          ))
        : null}
    </group>
  );
}

/** Brake disc and caliper behind a wheel. */
function Brake({
  position,
  radius,
  m,
  lowDetail,
}: {
  position: [number, number, number];
  radius: number;
  m: Mats;
  lowDetail: boolean;
}) {
  const segments = lowDetail ? 10 : 24;
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh material={m.disc}>
        <cylinderGeometry args={[radius * 0.68, radius * 0.68, 0.035, segments]} />
      </mesh>
      <mesh material={m.caliper} position={[radius * 0.42, 0.06, 0]}>
        <boxGeometry args={[0.1, 0.06, 0.2]} />
      </mesh>
    </group>
  );
}

export function ProceduralCar({
  bodyType,
  dimensions,
  powertrain,
  explode = 0,
  selectedGroup = null,
  highlightGroup = null,
  onSelectGroup,
  lowDetail = false,
  xray = false,
  reducedMotion = false,
}: ProceduralCarProps) {
  const p = useMemo(
    () => resolveProportions(bodyType as never, dimensions),
    [bodyType, dimensions],
  );
  const m = useMaterials(xray, lowDetail);
  const active = groupsForPowertrain(powertrain);

  const axleY = p.groundClearance + p.wheelRadius;
  const frontZ = p.wheelbase / 2;
  const rearZ = -p.wheelbase / 2;
  const tyreWidth = 0.26;
  // Outer face of the tyre sits flush with the car's stated width.
  const trackX = p.width / 2 - tyreWidth * 0.45;

  // A group is dimmed when something else is explicitly highlighted.
  const isDimmed = (group: ViewerGroup) =>
    highlightGroup !== null && highlightGroup !== group;

  const sub = (group: ViewerGroup, children: ReactNode) =>
    active.includes(group) ? (
      <Subsystem
        key={group}
        name={group}
        index={active.indexOf(group)}
        explode={explode}
        reducedMotion={reducedMotion}
        selected={selectedGroup === group || highlightGroup === group}
        dimmed={isDimmed(group)}
        onSelect={onSelectGroup}
      >
        {children}
      </Subsystem>
    ) : null;

  const wheelPositions: [number, number, number][] = [
    [trackX, axleY, frontZ],
    [-trackX, axleY, frontZ],
    [trackX, axleY, rearZ],
    [-trackX, axleY, rearZ],
  ];

  return (
    <group name="procedural-car">
      {sub("body", <BodyGroup p={p} m={m} lowDetail={lowDetail} />)}

      {sub(
        "wheels",
        <group>
          {wheelPositions.map((position, index) => (
            <Wheel
              key={index}
              position={position}
              radius={p.wheelRadius}
              width={tyreWidth}
              m={m}
              lowDetail={lowDetail}
            />
          ))}
        </group>,
      )}

      {sub(
        "brakes",
        <group>
          {wheelPositions.map((position, index) => (
            <Brake
              key={index}
              position={position}
              radius={p.wheelRadius}
              m={m}
              lowDetail={lowDetail}
            />
          ))}
        </group>,
      )}

      {sub(
        "suspension",
        <group>
          {wheelPositions.map(([x, y, z], index) => (
            <group key={index}>
              {/* Control arm reaching inboard from the hub */}
              <mesh
                position={[x * 0.55, y - 0.04, z]}
                rotation={[0, 0, Math.PI / 2]}
                material={m.suspension}
              >
                <cylinderGeometry args={[0.028, 0.028, Math.abs(x) * 0.9, 8]} />
              </mesh>
              {/* Coil-over damper */}
              <mesh position={[x * 0.82, y + 0.16, z]} material={m.spring}>
                <cylinderGeometry args={[0.052, 0.052, 0.3, 10]} />
              </mesh>
            </group>
          ))}
          {/* Anti-roll bars */}
          {[frontZ, rearZ].map((z) => (
            <mesh
              key={z}
              position={[0, axleY - 0.08, z]}
              rotation={[0, 0, Math.PI / 2]}
              material={m.suspension}
            >
              <cylinderGeometry args={[0.018, 0.018, p.width * 0.8, 8]} />
            </mesh>
          ))}
        </group>,
      )}

      {sub(
        "engine",
        <group>
          {/* Block, sitting ahead of the front axle */}
          <RoundedBox
            args={[p.width * 0.5, 0.42, 0.62]}
            radius={0.04}
            smoothness={2}
            position={[0, axleY + 0.2, frontZ + 0.42]}
            material={m.engine}
          />
          {/* Intake plenum */}
          <RoundedBox
            args={[p.width * 0.4, 0.12, 0.42]}
            radius={0.03}
            smoothness={2}
            position={[0, axleY + 0.46, frontZ + 0.42]}
            material={m.trim}
          />
          {/* Turbochargers */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * p.width * 0.19, axleY + 0.12, frontZ + 0.72]}
              material={m.gearbox}
            >
              <cylinderGeometry args={[0.08, 0.1, 0.12, lowDetail ? 8 : 16]} />
            </mesh>
          ))}
          {/* Radiator */}
          <mesh position={[0, axleY + 0.1, p.length / 2 - 0.18]} material={m.trim}>
            <boxGeometry args={[p.width * 0.66, 0.34, 0.06]} />
          </mesh>
        </group>,
      )}

      {sub(
        "transmission",
        <group>
          <RoundedBox
            args={[0.3, 0.26, 0.7]}
            radius={0.04}
            smoothness={2}
            position={[0, axleY + 0.02, frontZ - 0.35]}
            material={m.gearbox}
          />
          {/* Driveshaft down the tunnel */}
          <mesh
            position={[0, axleY - 0.02, 0]}
            rotation={[Math.PI / 2, 0, 0]}
            material={m.suspension}
          >
            <cylinderGeometry args={[0.045, 0.045, p.wheelbase * 0.82, 10]} />
          </mesh>
          {/* Rear differential */}
          <mesh position={[0, axleY, rearZ]} material={m.gearbox}>
            <sphereGeometry args={[0.16, lowDetail ? 8 : 16, lowDetail ? 6 : 12]} />
          </mesh>
        </group>,
      )}

      {sub(
        "interior",
        <group>
          {/* Seats */}
          {[-1, 1].map((side) => (
            <group key={side}>
              <RoundedBox
                args={[0.42, 0.1, 0.46]}
                radius={0.03}
                smoothness={2}
                position={[
                  side * p.width * 0.19,
                  p.groundClearance + p.height * 0.42,
                  -0.1,
                ]}
                material={m.interior}
              />
              <RoundedBox
                args={[0.42, 0.54, 0.1]}
                radius={0.03}
                smoothness={2}
                position={[
                  side * p.width * 0.19,
                  p.groundClearance + p.height * 0.62,
                  -0.34,
                ]}
                material={m.interior}
              />
            </group>
          ))}
          {/* Dashboard */}
          <RoundedBox
            args={[p.width * 0.78, 0.18, 0.22]}
            radius={0.03}
            smoothness={2}
            position={[0, p.groundClearance + p.height * 0.55, 0.52]}
            material={m.interior}
          />
          {/* Steering wheel */}
          <mesh
            position={[p.width * 0.19, p.groundClearance + p.height * 0.58, 0.34]}
            rotation={[Math.PI / 2.6, 0, 0]}
            material={m.trim}
          >
            <torusGeometry
              args={[0.15, 0.022, lowDetail ? 6 : 12, lowDetail ? 12 : 24]}
            />
          </mesh>
        </group>,
      )}

      {sub(
        "electronics",
        <group>
          {/* ECU */}
          <RoundedBox
            args={[0.22, 0.08, 0.16]}
            radius={0.015}
            smoothness={2}
            position={[-p.width * 0.28, axleY + 0.3, frontZ + 0.02]}
            material={m.electronics}
          />
          {/* 12 V battery */}
          <RoundedBox
            args={[0.26, 0.18, 0.18]}
            radius={0.015}
            smoothness={2}
            position={[p.width * 0.28, axleY + 0.26, frontZ + 0.05]}
            material={m.electronics}
          />
          {/* Harness run along the sill */}
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[side * (p.width / 2 - 0.05), p.groundClearance + 0.1, 0]}
              rotation={[Math.PI / 2, 0, 0]}
              material={m.electronics}
            >
              <cylinderGeometry args={[0.018, 0.018, p.length * 0.6, 6]} />
            </mesh>
          ))}
        </group>,
      )}

      {sub(
        "battery",
        <group>
          {/* Flat traction pack in the floor — the defining EV package */}
          <RoundedBox
            args={[p.width * 0.78, 0.13, p.wheelbase * 0.94]}
            radius={0.03}
            smoothness={2}
            position={[0, p.groundClearance + 0.07, 0]}
            material={m.battery}
          />
          {/* Module divisions */}
          {!lowDetail
            ? Array.from({ length: 4 }, (_, index) => (
                <mesh
                  key={index}
                  position={[
                    0,
                    p.groundClearance + 0.14,
                    (index - 1.5) * (p.wheelbase * 0.22),
                  ]}
                  material={m.trim}
                >
                  <boxGeometry args={[p.width * 0.76, 0.012, 0.03]} />
                </mesh>
              ))
            : null}
          {/* Drive units on the axles */}
          {[frontZ, rearZ].map((z) => (
            <mesh key={z} position={[0, axleY, z]} material={m.electronics}>
              <cylinderGeometry args={[0.14, 0.14, 0.36, lowDetail ? 8 : 16]} />
            </mesh>
          ))}
        </group>,
      )}
    </group>
  );
}
