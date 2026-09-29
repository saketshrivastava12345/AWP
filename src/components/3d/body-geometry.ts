import * as THREE from "three";
import type { CarLayout } from "./car-layout";
import { buildPatch, buildShell } from "./car-shape";
import {
  projectDecal,
  rimBarrelGeometry,
  spokesGeometry,
  tubeAlong,
  tyreGeometry,
} from "./car-parts";

/**
 * Everything the body subsystem draws, built once per car and level of detail
 * (and cached, see geometry-cache.ts): the lofted shell, its glass, lamps and
 * trim projected onto it, mirrors, arch liners, wing or spoiler, roof rails
 * and a spare wheel. Also the points on the body other systems need — where
 * the tailpipes exit, where the headlights and charging inlet are — found on
 * the real surface rather than guessed.
 */

export type DecalKind = "head" | "tail" | "grille" | "trim" | "chrome";

export type BodyGeometry = {
  shell: THREE.BufferGeometry;
  edges: THREE.BufferGeometry;
  glass: THREE.BufferGeometry[];
  sideGlass: THREE.BufferGeometry[];
  decals: { geometry: THREE.BufferGeometry; kind: DecalKind }[];
  mirrors: { side: 1 | -1; base: THREE.Vector3 }[];
  mirrorShell: THREE.BufferGeometry;
  mirrorArm: THREE.BufferGeometry;
  liner: THREE.BufferGeometry;
  plate: THREE.BufferGeometry;
  linerCenterX: number;
  plateX: number;
  spoiler: THREE.BufferGeometry | null;
  wing: { blade: THREE.BufferGeometry; posts: THREE.BufferGeometry } | null;
  spoilerAt: THREE.Vector3;
  rails: THREE.BufferGeometry[];
  spare: {
    tyre: THREE.BufferGeometry;
    rim: THREE.BufferGeometry;
    spokes: THREE.BufferGeometry;
    at: THREE.Vector3;
  } | null;
  /** Tailpipe exits on the rear surface, for the exhaust system. */
  exhaustTips: THREE.Vector3[];
  /** Points on the body for hotspots and callouts (car space). */
  points: {
    headlight: THREE.Vector3 | null;
    aero: THREE.Vector3;
    charging: THREE.Vector3;
  };
  dispose(): void;
};

function sideGlassOutline(
  from: (t: number) => number,
  to: number,
): (s: number, t: number) => [number, number] {
  return (s, t) => {
    const band = THREE.MathUtils.lerp(0.05, 0.95, t);
    return [THREE.MathUtils.lerp(from(band), to, s), band];
  };
}

export function buildBodyGeometry(layout: CarLayout, lowDetail: boolean): BodyGeometry {
  const { spec, shape, build } = layout;
  const { def } = spec;

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
  const decals: BodyGeometry["decals"] = [];
  const push = (geometry: THREE.BufferGeometry | null, kind: DecalKind) => {
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
  let headlight: THREE.Vector3 | null = null;
  for (const side of [1, -1] as const) {
    const found = hit(new THREE.Vector3(side * W * 0.31, headY, noseProbe), front);
    if (!found) continue;
    if (side === 1) headlight = found.point.clone();
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
  const diffuser = hit(new THREE.Vector3(0, tailStation.bottom + 0.07, tailProbe), back);
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
  const mirrors = ([1, -1] as const).map((side) => ({
    side,
    base: shape.point(mirrorU, "glass", 0.1, side),
  }));
  const mirrorShell = new THREE.SphereGeometry(
    1,
    lowDetail ? 12 : 24,
    lowDetail ? 8 : 16,
  );
  const mirrorArm = new THREE.BoxGeometry(0.09, 0.022, 0.07);
  disposables.push(mirrorShell, mirrorArm);

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
  let wing: BodyGeometry["wing"] = null;
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
    const pieces = [
      ...[-1, 1].map((sideX) =>
        new THREE.BoxGeometry(0.018, height, 0.16).translate(
          sideX * spec.width * 0.2,
          -height / 2,
          0.02,
        ),
      ),
      ...[-1, 1].map((sideX) =>
        new THREE.BoxGeometry(0.01, 0.13, 0.36).translate(
          sideX * spec.width * 0.42,
          0.01,
          0,
        ),
      ),
    ].map((piece) => {
      const flat = piece.toNonIndexed();
      piece.dispose();
      return flat;
    });
    const posts = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    for (const g of pieces) {
      positions.push(...(g.getAttribute("position").array as Float32Array));
      normals.push(...(g.getAttribute("normal").array as Float32Array));
      uvs.push(...(g.getAttribute("uv").array as Float32Array));
      g.dispose();
    }
    posts.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    posts.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
    posts.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
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
  let spare: BodyGeometry["spare"] = null;
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

  // --- tailpipe exits (drawn by the exhaust system) ----------------------
  const exhaustTips: THREE.Vector3[] = [];
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
      if (found) exhaustTips.push(new THREE.Vector3(x, y, found.point.z - 0.02));
    }
  }

  // --- points for hotspots ---------------------------------------------------
  const aero =
    wing || spoiler
      ? spoilerAt.clone().add(new THREE.Vector3(0, 0.02, 0))
      : (diffuser?.point.clone() ??
        new THREE.Vector3(0, tailStation.bottom + 0.1, spec.tailZ));
  // Charging inlet: on the left rear quarter, just ahead of the tail lamp,
  // where most electric cars carry it. Its exact position is not catalogued.
  const charging = shape.point(def.capRear + 0.07, "side", 0.86, 1);

  return {
    shell,
    edges,
    glass,
    sideGlass,
    decals,
    mirrors,
    mirrorShell,
    mirrorArm,
    liner,
    plate,
    linerCenterX: (xInner + xOuter) / 2,
    plateX: xInner,
    spoiler,
    wing,
    spoilerAt,
    rails,
    spare,
    exhaustTips,
    points: { headlight, aero, charging },
    dispose: () => {
      for (const item of disposables) item.dispose();
    },
  };
}
