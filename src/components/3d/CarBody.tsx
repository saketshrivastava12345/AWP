"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { CarLayout } from "./car-layout";
import { buildPatch, buildShell } from "./car-shape";
import {
  applyPaint,
  GOLD,
  paintById,
  type MaterialKit,
  type PaintId,
} from "./car-materials";
import {
  grilleTexture,
  headlightTexture,
  projectDecal,
  rimBarrelGeometry,
  spokesGeometry,
  taillightTexture,
  tubeAlong,
  tyreGeometry,
} from "./car-parts";

/**
 * The body subsystem: shell, glass, lamps and exterior trim.
 *
 * `ghost` fades the bodywork to a translucent shell with its panel edges
 * traced in gold, so the mechanical systems inside can be seen without the
 * car losing its shape. The tour and Engineering Mode both use it.
 */

type Fade = { material: THREE.Material; base: number; ghost: number };

/** Set every body material between solid (0) and ghosted (1). */
function applyGhost(fades: Fade[], edges: THREE.LineBasicMaterial, amount: number): void {
  for (const { material, base, ghost } of fades) {
    const opacity = THREE.MathUtils.lerp(base, ghost, amount);
    material.opacity = opacity;
    material.transparent = opacity < 0.999;
    // A ghosted shell must not hide what is behind it in the depth buffer.
    material.depthWrite = amount < 0.35 && base >= 1;
  }
  edges.opacity = 0.55 * amount;
}

function sideGlassOutline(
  from: (t: number) => number,
  to: number,
): (s: number, t: number) => [number, number] {
  return (s, t) => {
    const band = THREE.MathUtils.lerp(0.05, 0.95, t);
    return [THREE.MathUtils.lerp(from(band), to, s), band];
  };
}

export function CarBody({
  layout,
  kit,
  lowDetail,
  ghost,
  paint,
}: {
  layout: CarLayout;
  kit: MaterialKit;
  lowDetail: boolean;
  /** 0 = solid bodywork, 1 = translucent shell. */
  ghost: number;
  paint: PaintId;
}) {
  const { spec, shape, build } = layout;
  const { def } = spec;

  const built = useMemo(() => {
    const shell = buildShell(shape, lowDetail);
    const shellMesh = new THREE.Mesh(shell);
    shellMesh.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster();
    const disposables: { dispose: () => void }[] = [shell];

    /** First hit on the shell along a ray, as position + outward normal. */
    const hit = (origin: THREE.Vector3, direction: THREE.Vector3) => {
      raycaster.set(origin, direction.clone().normalize());
      const found = raycaster.intersectObject(shellMesh, false)[0];
      if (!found?.face) return null;
      return { point: found.point.clone(), normal: found.face.normal.clone() };
    };

    const edges = new THREE.EdgesGeometry(shell, 32);
    disposables.push(edges);

    // --- glass --------------------------------------------------------------
    const glass: THREE.BufferGeometry[] = [];
    const sideGlass: THREE.BufferGeometry[] = [];
    const glassRearAt = (t: number) =>
      THREE.MathUtils.lerp(def.glassRear[0], def.glassRear[1], t);
    const glassSegments: [number, number] = lowDetail ? [10, 3] : [22, 5];
    for (const side of [1, -1] as const) {
      const front = def.cowl - 0.004;
      if (def.bPillar !== null) {
        sideGlass.push(
          buildPatch(
            shape,
            "glass",
            side,
            sideGlassOutline(() => def.bPillar! + 0.013, front),
            glassSegments,
            0.0025,
          ),
          buildPatch(
            shape,
            "glass",
            side,
            sideGlassOutline(glassRearAt, def.bPillar - 0.013),
            glassSegments,
            0.0025,
          ),
        );
      } else {
        sideGlass.push(
          buildPatch(
            shape,
            "glass",
            side,
            sideGlassOutline(glassRearAt, front),
            glassSegments,
            0.0025,
          ),
        );
      }
    }
    glass.push(
      buildPatch(
        shape,
        "top",
        1,
        (s, t) => [
          THREE.MathUtils.lerp(def.roofFront + 0.002, def.cowl - 0.004, s),
          THREE.MathUtils.lerp(0.035, 0.965, t),
        ],
        lowDetail ? [8, 10] : [14, 22],
        0.0025,
      ),
      buildPatch(
        shape,
        "top",
        1,
        (s, t) => [
          THREE.MathUtils.lerp(def.rearGlass[0], def.rearGlass[1], s),
          THREE.MathUtils.lerp(0.075, 0.925, t),
        ],
        lowDetail ? [6, 10] : [12, 20],
        0.0025,
      ),
    );
    disposables.push(...glass, ...sideGlass);

    // --- lamps, grille and trim, projected onto the shell -----------------
    const { width: W } = spec;
    const noseStation = shape.station(1 - def.capFront - 0.02);
    const tailStation = shape.station(def.capRear + 0.02);
    const decals: {
      geometry: THREE.BufferGeometry;
      kind: "head" | "tail" | "grille" | "trim" | "chrome";
    }[] = [];
    const push = (
      geometry: THREE.BufferGeometry | null,
      kind: (typeof decals)[number]["kind"],
    ) => {
      if (geometry && geometry.getAttribute("position")?.count) {
        decals.push({ geometry, kind });
        disposables.push(geometry);
      }
    };

    const front = new THREE.Vector3(0, 0, -1);
    const back = new THREE.Vector3(0, 0, 1);
    const noseProbe = spec.noseZ + 2;
    const tailProbe = spec.tailZ - 2;

    // Headlights.
    const headStyle = def.headlights;
    const headSize =
      headStyle === "round"
        ? new THREE.Vector3(0.23, 0.23, 0.3)
        : headStyle === "blade"
          ? new THREE.Vector3(0.46, 0.1, 0.3)
          : headStyle === "square"
            ? new THREE.Vector3(0.34, 0.2, 0.3)
            : new THREE.Vector3(0.44, 0.13, 0.3);
    const headY = noseStation.belt - (headStyle === "round" ? 0.06 : 0.07);
    for (const side of [1, -1] as const) {
      const found = hit(new THREE.Vector3(side * W * 0.31, headY, noseProbe), front);
      if (!found) continue;
      const roll =
        headStyle === "blade" ? -side * 0.18 : headStyle === "slim" ? -side * 0.06 : 0;
      push(projectDecal(shellMesh, found.point, found.normal, headSize, roll), "head");
    }

    // Tail lamps: a full-width light bar on the styles that use one.
    const tailY = tailStation.belt - 0.09;
    const bar =
      spec.style === "sports-rear" ||
      spec.style === "electric-sedan" ||
      spec.style === "supercar";
    if (bar) {
      const found = hit(new THREE.Vector3(0, tailY, tailProbe), back);
      if (found) {
        push(
          projectDecal(
            shellMesh,
            found.point,
            new THREE.Vector3(0, 0.15, -1),
            new THREE.Vector3(W * 0.94, 0.06, 1.2),
          ),
          "tail",
        );
      }
    } else {
      for (const side of [1, -1] as const) {
        const found = hit(new THREE.Vector3(side * W * 0.34, tailY, tailProbe), back);
        if (found)
          push(
            projectDecal(
              shellMesh,
              found.point,
              found.normal,
              new THREE.Vector3(0.4, 0.1, 0.4),
            ),
            "tail",
          );
      }
    }

    // Grille and intakes.
    const grilleY = THREE.MathUtils.lerp(
      noseStation.bottom,
      noseStation.belt,
      def.grille === "tall" ? 0.52 : 0.36,
    );
    const grille = hit(new THREE.Vector3(0, grilleY, noseProbe), front);
    if (grille) {
      const height =
        (noseStation.belt - noseStation.bottom) * (def.grille === "tall" ? 0.78 : 0.62);
      push(
        projectDecal(
          shellMesh,
          grille.point,
          new THREE.Vector3(0, 0.12, 1),
          new THREE.Vector3(W * 0.8, height, 0.4),
        ),
        "grille",
      );
    }

    // Diffuser.
    const diffuser = hit(
      new THREE.Vector3(0, tailStation.bottom + 0.07, tailProbe),
      back,
    );
    if (diffuser) {
      push(
        projectDecal(
          shellMesh,
          diffuser.point,
          new THREE.Vector3(0, 0, -1),
          new THREE.Vector3(W * 0.72, 0.13, 0.8),
        ),
        "trim",
      );
    }

    if (!lowDetail) {
      const sillStart = spec.rearAxleZ + spec.archRadius + 0.05;
      const sillEnd = spec.frontAxleZ - spec.archRadius - 0.05;
      const doorFront = def.cowl - 0.012;
      const doorRear = def.bPillar ?? def.glassRear[0];
      for (const side of [1, -1] as const) {
        // Side skirt.
        const skirtU = shape.uOf((sillStart + sillEnd) / 2);
        const skirt = shape.point(skirtU, "side", 0.12, side);
        push(
          projectDecal(
            shellMesh,
            skirt,
            new THREE.Vector3(side, -0.3, 0),
            new THREE.Vector3(sillEnd - sillStart, 0.07, 0.3),
          ),
          "trim",
        );

        // Door shut lines and handles.
        const cuts =
          def.bPillar !== null &&
          spec.style !== "gt" &&
          spec.style !== "sports-rear" &&
          spec.style !== "supercar"
            ? [doorFront, doorRear, def.glassRear[0] + 0.012]
            : [doorFront, doorRear];
        for (const u of cuts) {
          const s = shape.station(u);
          const middle = shape.point(u, "side", 0.55, side);
          push(
            projectDecal(
              shellMesh,
              middle,
              new THREE.Vector3(side, 0, 0),
              new THREE.Vector3(0.005, (s.belt - s.bottom) * 0.9, 0.35),
            ),
            "trim",
          );
        }
        const handles =
          cuts.length === 3
            ? [doorRear + 0.03, def.glassRear[0] + 0.04]
            : [doorRear + 0.035];
        for (const u of handles) {
          const p = shape.point(u, "side", 0.84, side);
          push(
            projectDecal(
              shellMesh,
              p,
              new THREE.Vector3(side, 0, 0),
              new THREE.Vector3(0.13, 0.024, 0.2),
            ),
            "chrome",
          );
        }
      }
    }

    // --- mirrors -------------------------------------------------------------
    const mirrorU = def.cowl - 0.028;
    const mirrors = ([1, -1] as const).map((side) => {
      const base = shape.point(mirrorU, "glass", 0.1, side);
      return { side, base };
    });

    // --- wheel-arch liners ---------------------------------------------------
    const linerRadius = spec.archRadius - 0.014;
    const xInner = spec.track / 2 - spec.tyreWidth / 2 - 0.07;
    const xOuter = (spec.width / 2) * 0.985;
    const linerWidth = Math.max(0.1, xOuter - xInner);
    const liner = new THREE.CylinderGeometry(
      linerRadius,
      linerRadius,
      linerWidth,
      lowDetail ? 16 : 32,
      1,
      true,
      Math.PI - 0.12,
      Math.PI + 0.24,
    );
    liner.applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 2));
    const plateShape = new THREE.Shape();
    plateShape.absarc(0, 0, linerRadius, 0, Math.PI, false);
    plateShape.lineTo(-linerRadius, -(spec.wheelRadius - spec.groundClearance - 0.02));
    plateShape.lineTo(linerRadius, -(spec.wheelRadius - spec.groundClearance - 0.02));
    plateShape.closePath();
    const plate = new THREE.ShapeGeometry(plateShape, 16);
    plate.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
    disposables.push(liner, plate);

    // --- spoiler / wing ------------------------------------------------------
    let spoiler: THREE.BufferGeometry | null = null;
    let wing: { blade: THREE.BufferGeometry; posts: THREE.BufferGeometry } | null = null;
    let spoilerAt = new THREE.Vector3();
    if (build.rearWing) {
      const u = 0.075;
      const s = shape.station(u);
      const airfoil = new THREE.Shape();
      airfoil.moveTo(0.17, 0);
      airfoil.bezierCurveTo(0.1, 0.035, -0.08, 0.032, -0.16, 0.012);
      airfoil.lineTo(-0.16, -0.004);
      airfoil.bezierCurveTo(-0.06, 0.004, 0.08, -0.012, 0.17, 0);
      const blade = new THREE.ExtrudeGeometry(airfoil, {
        depth: spec.width * 0.84,
        bevelEnabled: false,
        curveSegments: 10,
      });
      blade.translate(0, 0, -spec.width * 0.42);
      blade.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
      blade.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.12));
      const height = 0.3;
      const postGeometries = [-1, 1].map((sideX) => {
        const post = new THREE.BoxGeometry(0.018, height, 0.16);
        post.translate(sideX * spec.width * 0.2, -height / 2, 0.02);
        return post.toNonIndexed();
      });
      const endplates = [-1, 1].map((sideX) => {
        const endplate = new THREE.BoxGeometry(0.01, 0.13, 0.36);
        endplate.translate(sideX * spec.width * 0.42, 0.01, 0);
        return endplate.toNonIndexed();
      });
      const posts = new THREE.BufferGeometry();
      const merged = [...postGeometries, ...endplates];
      const positions: number[] = [];
      const normals: number[] = [];
      for (const g of merged) {
        positions.push(...(g.getAttribute("position").array as Float32Array));
        normals.push(...(g.getAttribute("normal").array as Float32Array));
        g.dispose();
      }
      posts.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      posts.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
      wing = { blade, posts };
      spoilerAt = new THREE.Vector3(0, s.belt + s.crown + height, s.z + 0.05);
      disposables.push(blade, posts);
    } else if (def.spoiler !== "none") {
      const hatch =
        spec.style === "hatchback" ||
        spec.style === "suv" ||
        spec.style === "wagon" ||
        spec.style === "mpv";
      const u = hatch
        ? def.rearGlass[1] + 0.004
        : def.spoiler === "ducktail"
          ? 0.05
          : 0.035;
      const s = shape.station(u);
      const lip = new THREE.Shape();
      const chord = def.spoiler === "ducktail" ? 0.2 : hatch ? 0.16 : 0.1;
      const rise = def.spoiler === "ducktail" ? 0.05 : 0.02;
      lip.moveTo(0.02, -0.012);
      lip.lineTo(-chord, rise);
      lip.lineTo(-chord - 0.02, rise - 0.012);
      lip.lineTo(0.03, -0.028);
      lip.closePath();
      const width = (hatch ? s.edge : s.halfWidth) * 1.9;
      spoiler = new THREE.ExtrudeGeometry(lip, {
        depth: width,
        bevelEnabled: true,
        bevelThickness: 0.006,
        bevelSize: 0.006,
        bevelSegments: 2,
      });
      spoiler.translate(0, 0, -width / 2);
      spoiler.applyMatrix4(new THREE.Matrix4().makeRotationY(-Math.PI / 2));
      spoilerAt = new THREE.Vector3(
        0,
        hatch ? s.belt + s.glass + s.crown : s.belt + s.crown,
        s.z + (hatch ? -0.01 : 0.06),
      );
      disposables.push(spoiler);
    }

    // --- roof rails ----------------------------------------------------------
    const rails: THREE.BufferGeometry[] = [];
    if (def.roofRails) {
      for (const t of [0.075, 0.925]) {
        const points: THREE.Vector3[] = [];
        const start = def.rearGlass[1] + 0.02;
        const end = def.roofFront - 0.04;
        for (let k = 0; k <= 12; k += 1) {
          const p = shape.point(THREE.MathUtils.lerp(start, end, k / 12), "top", t);
          p.y += k === 0 || k === 12 ? 0.012 : 0.04;
          points.push(p);
        }
        rails.push(tubeAlong(points, 0.012, lowDetail));
      }
      disposables.push(...rails);
    }

    // --- spare wheel (off-roaders carry it on the tailgate) -----------------
    let spare: {
      tyre: THREE.BufferGeometry;
      rim: THREE.BufferGeometry;
      spokes: THREE.BufferGeometry;
      at: THREE.Vector3;
    } | null = null;
    if (def.spareWheel) {
      const tyre = tyreGeometry(
        spec.wheelRadius,
        spec.tyreWidth,
        spec.rimRadius,
        lowDetail ? 24 : 48,
      );
      const rim = rimBarrelGeometry(spec.rimRadius, spec.tyreWidth, lowDetail ? 20 : 40);
      const spokes = spokesGeometry(def.spokes, spec.rimRadius, spec.tyreWidth);
      const turn = new THREE.Matrix4().makeRotationY(Math.PI / 2);
      for (const g of [tyre, rim, spokes]) g.applyMatrix4(turn);
      const s = shape.station(0.012);
      spare = {
        tyre,
        rim,
        spokes,
        at: new THREE.Vector3(
          0,
          (s.belt + s.bottom) / 2 + 0.12,
          spec.tailZ - spec.tyreWidth / 2 + 0.01,
        ),
      };
      disposables.push(tyre, rim, spokes);
    }

    // --- exhausts -------------------------------------------------------------
    const exhausts: THREE.Vector3[] = [];
    if (build.powertrain !== "electric") {
      const quad = (build.cylinders ?? 4) >= 8;
      const central = spec.style === "supercar" || spec.style === "sports-rear";
      const y = tailStation.bottom + (central ? 0.1 : 0.05);
      const xs = central
        ? quad
          ? [-0.14, -0.05, 0.05, 0.14]
          : [-0.07, 0.07]
        : quad
          ? [-W * 0.33, -W * 0.25, W * 0.25, W * 0.33]
          : [-W * 0.3, W * 0.3];
      for (const x of xs) {
        const found = hit(new THREE.Vector3(x, y, tailProbe), back);
        if (found) exhausts.push(new THREE.Vector3(x, y, found.point.z - 0.02));
      }
    }
    const pipe = new THREE.CylinderGeometry(0.043, 0.043, 0.16, 20, 1, true);
    pipe.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
    const soot = new THREE.CircleGeometry(0.041, 20);
    soot.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI));
    soot.translate(0, 0, 0.06);
    disposables.push(pipe, soot);

    return {
      shell,
      edges,
      glass,
      sideGlass,
      decals,
      mirrors,
      liner,
      plate,
      linerCenterX: (xInner + xOuter) / 2,
      plateX: xInner,
      spoiler,
      wing,
      spoilerAt,
      rails,
      spare,
      exhausts,
      pipe,
      soot,
      dispose: () => {
        for (const item of disposables) item.dispose();
      },
    };
  }, [shape, spec, def, build, lowDetail]);

  useEffect(() => () => built.dispose(), [built]);

  // --- materials --------------------------------------------------------------
  const decalMaterials = useMemo(() => {
    const head = headlightTexture(def.headlights);
    const tail = taillightTexture();
    const grille = grilleTexture(def.grille);
    const decal = {
      transparent: true,
      alphaTest: 0.04,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      depthWrite: false,
    };
    const materials = {
      head: new THREE.MeshStandardMaterial({
        ...decal,
        map: head,
        emissiveMap: head,
        emissive: "#ffffff",
        emissiveIntensity: 1.3,
        roughness: 0.12,
        metalness: 0.4,
      }),
      tail: new THREE.MeshStandardMaterial({
        ...decal,
        map: tail,
        emissiveMap: tail,
        emissive: "#ff2a2a",
        emissiveIntensity: 1.35,
        roughness: 0.2,
      }),
      grille: new THREE.MeshStandardMaterial({
        ...decal,
        map: grille,
        roughness: 0.55,
        metalness: 0.3,
      }),
      trim: new THREE.MeshStandardMaterial({
        color: "#060607",
        roughness: 0.45,
        metalness: 0.3,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#c9cbd0",
        roughness: 0.15,
        metalness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
      edges: new THREE.LineBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    };
    return {
      materials,
      dispose: () => {
        for (const material of Object.values(materials)) material.dispose();
        head?.dispose();
        tail?.dispose();
        grille?.dispose();
      },
    };
  }, [def.headlights, def.grille]);

  useEffect(() => () => decalMaterials.dispose(), [decalMaterials]);

  const paintMaterial = kit.get("paint");
  useEffect(() => {
    applyPaint(paintMaterial, paintById(paint));
  }, [paintMaterial, paint]);

  // Every body material, with its solid opacity and its ghosted opacity.
  const fades = useMemo<Fade[]>(() => {
    const entries: [THREE.Material, number, number][] = [
      [kit.get("paint"), 1, 0.07],
      [kit.get("lining"), 1, 0],
      [kit.get("under"), 1, 0.05],
      [kit.get("trim"), 1, 0.08],
      [kit.get("well"), 1, 0],
      [kit.get("glass"), 0.42, 0.03],
      [kit.get("sideGlass"), 1, 0.04],
      [kit.get("satin"), 1, 0.1],
      [kit.get("chrome"), 1, 0.15],
      [kit.get("carbon"), 1, 0.12],
      [kit.get("tyre"), 1, 1],
      [decalMaterials.materials.head, 1, 0.1],
      [decalMaterials.materials.tail, 1, 0.14],
      [decalMaterials.materials.grille, 1, 0.06],
      [decalMaterials.materials.trim, 1, 0.08],
      [decalMaterials.materials.chrome, 1, 0.12],
    ];
    return entries.map(([material, base, ghostOpacity]) => ({
      material,
      base,
      ghost: ghostOpacity,
    }));
  }, [kit, decalMaterials]);

  const current = useRef(-1);
  const liningRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    const target = ghost;
    const previous = current.current;
    const next =
      previous < 0
        ? target
        : THREE.MathUtils.damp(previous, target, 5, Math.min(delta, 0.1));
    if (Math.abs(next - previous) < 0.0005) return;
    current.current = Math.abs(next - target) < 0.002 ? target : next;
    applyGhost(fades, decalMaterials.materials.edges, current.current);
    if (liningRef.current) liningRef.current.visible = current.current < 0.6;
  });

  const glassMaterial = kit.get("glass");
  const shellMaterials = useMemo(
    () => [kit.get("paint"), kit.get("under"), kit.get("trim")],
    [kit],
  );

  return (
    <group name="body-shell">
      <mesh geometry={built.shell} material={shellMaterials} castShadow receiveShadow />
      <mesh ref={liningRef} geometry={built.shell} material={kit.get("lining")} />
      <lineSegments geometry={built.edges} material={decalMaterials.materials.edges} />

      {built.glass.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={glassMaterial} renderOrder={2} />
      ))}
      {built.sideGlass.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={kit.get("sideGlass")} />
      ))}

      {built.decals.map(({ geometry, kind }, index) => (
        <mesh
          key={index}
          geometry={geometry}
          material={decalMaterials.materials[kind]}
          renderOrder={3}
        />
      ))}

      {built.mirrors.map(({ side, base }) => (
        <group key={side} position={base}>
          <mesh
            position={[side * 0.1, 0.045, -0.02]}
            scale={[0.075, 0.055, 0.105]}
            material={paintMaterial}
            castShadow
          >
            <sphereGeometry args={[1, lowDetail ? 12 : 24, lowDetail ? 8 : 16]} />
          </mesh>
          <mesh position={[side * 0.045, 0.012, 0]} material={kit.get("trim")}>
            <boxGeometry args={[0.09, 0.022, 0.07]} />
          </mesh>
        </group>
      ))}

      {layout.wheels.map(({ position, side }, index) => (
        <group key={index} position={[0, position.y, position.z]}>
          <mesh
            geometry={built.liner}
            material={kit.get("well")}
            position={[side * built.linerCenterX, 0, 0]}
          />
          <mesh
            geometry={built.plate}
            material={kit.get("well")}
            position={[side * built.plateX, 0, 0]}
          />
        </group>
      ))}

      {built.spoiler ? (
        <mesh
          geometry={built.spoiler}
          material={paintMaterial}
          position={built.spoilerAt}
          castShadow
        />
      ) : null}
      {built.wing ? (
        <group position={built.spoilerAt}>
          <mesh geometry={built.wing.blade} material={kit.get("carbon")} castShadow />
          <mesh geometry={built.wing.posts} material={kit.get("carbon")} />
        </group>
      ) : null}

      {built.rails.map((geometry, index) => (
        <mesh key={index} geometry={geometry} material={kit.get("satin")} />
      ))}

      {built.spare ? (
        <group position={built.spare.at}>
          <mesh geometry={built.spare.tyre} material={kit.get("tyre")} />
          <mesh geometry={built.spare.rim} material={kit.get("satin")} />
          <mesh geometry={built.spare.spokes} material={kit.get("satin")} />
        </group>
      ) : null}

      {built.exhausts.map((position, index) => (
        <group key={index} position={position}>
          <mesh geometry={built.pipe} material={kit.get("chrome")} />
          <mesh geometry={built.soot} material={kit.get("under")} />
        </group>
      ))}
    </group>
  );
}
