import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

/**
 * Geometry for the car's mechanical parts: wheels, brakes, springs and the
 * canvas-drawn lamp and grille graphics. Pure three.js, no React.
 *
 * Wheel geometry is built with the axle on +X and the outer face at +X, so a
 * right-hand wheel needs no rotation and a left-hand one is turned 180°.
 */

const Y_TO_X = new THREE.Matrix4().makeRotationZ(-Math.PI / 2);

/** A lathe whose axis is X instead of Y. Profile points are [radius, x]. */
function latheX(
  profile: readonly [number, number][],
  segments: number,
): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(
    profile.map(([r, x]) => new THREE.Vector2(r, x)),
    segments,
  );
  geometry.applyMatrix4(Y_TO_X);
  return geometry;
}

/** Tyre with rounded shoulders and a slightly bulging sidewall. */
export function tyreGeometry(
  radius: number,
  width: number,
  rimRadius: number,
  segments: number,
): THREE.BufferGeometry {
  const h = width / 2;
  const r = radius;
  const bead = rimRadius + 0.006;
  return latheX(
    [
      [bead, h * 0.84],
      [bead + 0.025, h * 0.97],
      [r - 0.05, h],
      [r - 0.016, h * 0.95],
      [r - 0.003, h * 0.82],
      [r, h * 0.56],
      [r, -h * 0.56],
      [r - 0.003, -h * 0.82],
      [r - 0.016, -h * 0.95],
      [r - 0.05, -h],
      [bead + 0.025, -h * 0.97],
      [bead, -h * 0.84],
    ],
    segments,
  );
}

/** Rim barrel and lip. The spokes are separate so they can be styled. */
export function rimBarrelGeometry(
  rimRadius: number,
  width: number,
  segments: number,
): THREE.BufferGeometry {
  const h = width / 2;
  const r = rimRadius;
  return latheX(
    [
      [r - 0.03, -h * 0.82],
      [r + 0.004, -h * 0.84],
      [r + 0.012, -h * 0.8],
      [r - 0.004, -h * 0.72],
      [r - 0.018, h * 0.55],
      [r - 0.006, h * 0.74],
      [r + 0.014, h * 0.82],
      [r + 0.012, h * 0.88],
      [r - 0.008, h * 0.86],
    ],
    segments,
  );
}

export type SpokeStyle = "twin" | "five" | "six" | "mesh";

/**
 * Spokes, dished toward the hub the way a real alloy wheel is, merged into a
 * single geometry so a wheel costs one draw call for all of them.
 */
export function spokesGeometry(
  style: SpokeStyle,
  rimRadius: number,
  width: number,
): THREE.BufferGeometry {
  const h = width / 2;
  const hub = 0.075;
  const outer = rimRadius - 0.012;
  const length = outer - hub;

  const layout: { angles: number[]; hubWidth: number; rimWidth: number } = (() => {
    switch (style) {
      case "twin": {
        const angles: number[] = [];
        for (let k = 0; k < 5; k += 1) {
          const base = (k / 5) * Math.PI * 2;
          angles.push(base - 0.12, base + 0.12);
        }
        return { angles, hubWidth: 0.034, rimWidth: 0.026 };
      }
      case "six":
        return {
          angles: Array.from({ length: 6 }, (_, k) => (k / 6) * Math.PI * 2),
          hubWidth: 0.07,
          rimWidth: 0.05,
        };
      case "mesh":
        return {
          angles: Array.from({ length: 10 }, (_, k) => (k / 10) * Math.PI * 2),
          hubWidth: 0.03,
          rimWidth: 0.02,
        };
      default:
        return {
          angles: Array.from({ length: 5 }, (_, k) => (k / 5) * Math.PI * 2),
          hubWidth: 0.078,
          rimWidth: 0.052,
        };
    }
  })();

  const parts: THREE.BufferGeometry[] = layout.angles.map((angle) => {
    const spoke = new THREE.BoxGeometry(0.03, length, 1, 1, 6, 1);
    const position = spoke.getAttribute("position");
    for (let i = 0; i < position.count; i += 1) {
      const y = position.getY(i) + length / 2; // 0 at hub, length at rim
      const f = y / length;
      // Taper from hub to rim, and dish: the hub end sits deeper in the wheel.
      position.setZ(
        i,
        position.getZ(i) * THREE.MathUtils.lerp(layout.hubWidth, layout.rimWidth, f),
      );
      position.setX(i, position.getX(i) + THREE.MathUtils.lerp(h * 0.3, h * 0.7, f));
      position.setY(i, y + hub);
    }
    spoke.computeVertexNormals();
    spoke.applyMatrix4(new THREE.Matrix4().makeRotationX(angle));
    return spoke;
  });

  const hubCap = new THREE.CylinderGeometry(0.088, 0.096, 0.05, 28);
  hubCap.applyMatrix4(Y_TO_X);
  hubCap.translate(h * 0.34, 0, 0);
  parts.push(hubCap);

  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  for (const part of parts) part.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Centre cap and five lug nuts. */
export function hubDetailGeometry(width: number): THREE.BufferGeometry {
  const h = width / 2;
  const parts: THREE.BufferGeometry[] = [];
  const cap = new THREE.CylinderGeometry(0.034, 0.034, 0.02, 24);
  cap.applyMatrix4(Y_TO_X);
  cap.translate(h * 0.34 + 0.03, 0, 0);
  parts.push(cap);
  for (let k = 0; k < 5; k += 1) {
    const angle = (k / 5) * Math.PI * 2;
    const nut = new THREE.CylinderGeometry(0.009, 0.009, 0.02, 8);
    nut.applyMatrix4(Y_TO_X);
    nut.translate(h * 0.34 + 0.028, Math.cos(angle) * 0.058, Math.sin(angle) * 0.058);
    parts.push(nut);
  }
  const merged = mergeGeometries(parts.map((part) => part.toNonIndexed()));
  for (const part of parts) part.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/** Ventilated disc: friction ring plus the central hat. */
export function discGeometry(rimRadius: number): THREE.BufferGeometry {
  const radius = rimRadius * 0.8;
  const ring = new THREE.CylinderGeometry(radius, radius, 0.032, 48, 1, false);
  ring.applyMatrix4(Y_TO_X);
  const hat = new THREE.CylinderGeometry(0.11, 0.12, 0.06, 32);
  hat.applyMatrix4(Y_TO_X);
  hat.translate(0.03, 0, 0);
  const merged = mergeGeometries([ring.toNonIndexed(), hat.toNonIndexed()]);
  ring.dispose();
  hat.dispose();
  return merged ?? new THREE.BufferGeometry();
}

/**
 * Caliper: an arc-shaped block straddling the disc, sitting at the trailing
 * top of the rotor. It does not spin with the wheel.
 */
export function caliperGeometry(rimRadius: number): THREE.BufferGeometry {
  const discRadius = rimRadius * 0.8;
  const outer = discRadius + 0.016;
  const inner = discRadius - 0.07;
  const span = 0.62; // radians
  const start = Math.PI / 2 + 0.25; // measured from +Y toward the rear

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, start, start + span, false);
  shape.absarc(0, 0, inner, start + span, start, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.08,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
    curveSegments: 12,
  });
  geometry.translate(0, 0, -0.04);
  // Shape X/Y -> wheel face plane (Z/Y); extrusion Z -> axle X.
  geometry.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  return geometry;
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private readonly radius: number,
    private readonly height: number,
    private readonly turns: number,
  ) {
    super();
  }

  override getPoint(t: number, target = new THREE.Vector3()): THREE.Vector3 {
    const angle = t * this.turns * Math.PI * 2;
    return target.set(
      Math.cos(angle) * this.radius,
      t * this.height - this.height / 2,
      Math.sin(angle) * this.radius,
    );
  }
}

/** Coil spring along +Y, centred on the origin. */
export function springGeometry(
  radius: number,
  height: number,
  turns: number,
  wire: number,
  lowDetail: boolean,
): THREE.BufferGeometry {
  return new THREE.TubeGeometry(
    new Helix(radius, height, turns),
    Math.round(turns * (lowDetail ? 10 : 18)),
    wire,
    lowDetail ? 5 : 8,
    false,
  );
}

/** A straight tube between two points. Used for arms, shafts and cables. */
export function rodBetween(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  segments = 10,
): THREE.BufferGeometry {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(radius, radius, length, segments);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );
  geometry.applyQuaternion(quaternion);
  const middle = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return geometry;
}

/** A tube along an arbitrary path of points. */
export function tubeAlong(
  points: THREE.Vector3[],
  radius: number,
  lowDetail: boolean,
): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
  return new THREE.TubeGeometry(
    curve,
    Math.max(8, points.length * (lowDetail ? 4 : 10)),
    radius,
    lowDetail ? 5 : 8,
    false,
  );
}

// ---------------------------------------------------------------------------
// Decals
// ---------------------------------------------------------------------------

const lookHelper = new THREE.Object3D();

/**
 * Project a rectangle onto the body along `normal`, the way a real decal or a
 * lamp lens sits on a curved panel. Returns geometry with UVs, so a canvas
 * texture can draw the detail.
 */
export function projectDecal(
  mesh: THREE.Mesh,
  position: THREE.Vector3,
  normal: THREE.Vector3,
  size: THREE.Vector3,
  roll = 0,
): THREE.BufferGeometry {
  lookHelper.position.copy(position);
  lookHelper.up.set(0, 1, 0);
  lookHelper.lookAt(position.clone().add(normal));
  lookHelper.rotateZ(roll);
  return new DecalGeometry(mesh, position, lookHelper.rotation.clone(), size);
}

// ---------------------------------------------------------------------------
// Canvas textures: lamp and grille graphics
// ---------------------------------------------------------------------------

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export type HeadlightStyle = "round" | "slim" | "blade" | "square";

/**
 * Headlight graphic. Dark reflector and lens with a bright daytime running
 * light signature; the bright pixels double as the emissive map.
 */
export function headlightTexture(style: HeadlightStyle): THREE.CanvasTexture | null {
  if (style === "round") {
    return canvasTexture(256, 256, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const r = w * 0.47;
      const lens = ctx.createRadialGradient(
        cx - r * 0.3,
        cy - r * 0.35,
        r * 0.1,
        cx,
        cy,
        r,
      );
      lens.addColorStop(0, "#3a444d");
      lens.addColorStop(1, "#0a0d10");
      ctx.fillStyle = lens;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      // Bezel.
      ctx.strokeStyle = "#8d949b";
      ctx.lineWidth = w * 0.025;
      ctx.stroke();
      // Running-light ring and four-point signature.
      ctx.strokeStyle = "#f6fbff";
      ctx.lineWidth = w * 0.035;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      for (let k = 0; k < 4; k += 1) {
        const angle = (k / 4) * Math.PI * 2 + Math.PI / 4;
        ctx.save();
        ctx.translate(cx + Math.cos(angle) * r * 0.5, cy + Math.sin(angle) * r * 0.5);
        ctx.rotate(angle);
        roundRect(ctx, -w * 0.07, -w * 0.018, w * 0.14, w * 0.036, w * 0.018);
        ctx.fill();
        ctx.restore();
      }
      // Projector lens.
      ctx.fillStyle = "#0c1115";
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7f8f9b";
      ctx.beginPath();
      ctx.arc(cx - r * 0.08, cy - r * 0.08, r * 0.08, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  return canvasTexture(512, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const lens = ctx.createLinearGradient(0, 0, 0, h);
    lens.addColorStop(0, "#2a3138");
    lens.addColorStop(1, "#0b0e11");

    const radius = style === "square" ? h * 0.12 : h * 0.35;
    const height = style === "blade" ? h * 0.42 : style === "square" ? h * 0.9 : h * 0.62;
    const top = (h - height) / 2;
    ctx.fillStyle = lens;
    roundRect(ctx, w * 0.02, top, w * 0.96, height, radius);
    ctx.fill();
    ctx.strokeStyle = "#5d646b";
    ctx.lineWidth = 4;
    ctx.stroke();

    // Running-light signature along the top edge, turning down at the
    // outboard end — the "L" that most modern lamps share.
    ctx.fillStyle = "#f6fbff";
    roundRect(ctx, w * 0.06, top + height * 0.12, w * 0.86, height * 0.14, height * 0.07);
    ctx.fill();
    if (style !== "blade") {
      roundRect(
        ctx,
        w * 0.06,
        top + height * 0.12,
        w * 0.05,
        height * 0.62,
        height * 0.05,
      );
      ctx.fill();
    }
    // Projector modules.
    const modules = style === "square" ? 2 : 3;
    for (let k = 0; k < modules; k += 1) {
      const x = w * (0.35 + k * 0.18);
      const y = top + height * 0.62;
      ctx.fillStyle = "#0b0f13";
      ctx.beginPath();
      ctx.arc(x, y, height * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#6d7b86";
      ctx.beginPath();
      ctx.arc(x - height * 0.04, y - height * 0.04, height * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

/** Tail lamp: a lit bar with a darker inner lens and fine segmentation. */
export function taillightTexture(): THREE.CanvasTexture | null {
  return canvasTexture(1024, 128, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const glow = ctx.createLinearGradient(0, 0, 0, h);
    glow.addColorStop(0, "#ff5a5a");
    glow.addColorStop(0.5, "#e0121c");
    glow.addColorStop(1, "#6d0509");
    ctx.fillStyle = glow;
    roundRect(ctx, 0, h * 0.2, w, h * 0.6, h * 0.3);
    ctx.fill();
    ctx.fillStyle = "rgba(20,0,0,0.35)";
    for (let x = 0; x < w; x += 18) ctx.fillRect(x, h * 0.2, 3, h * 0.6);
    ctx.fillStyle = "#ffd6d6";
    roundRect(ctx, w * 0.01, h * 0.34, w * 0.98, h * 0.08, h * 0.04);
    ctx.fill();
  });
}

export type GrilleStyle = "intakes" | "wide" | "tall" | "closed";

/** Front openings: dark mesh or slats behind a bright frame. */
export function grilleTexture(style: GrilleStyle): THREE.CanvasTexture | null {
  return canvasTexture(1024, 256, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    if (style === "closed") {
      // Battery-electric: no radiator to feed, just a slim lower intake.
      ctx.fillStyle = "#0a0a0c";
      roundRect(ctx, w * 0.2, h * 0.64, w * 0.6, h * 0.2, h * 0.1);
      ctx.fill();
      ctx.strokeStyle = "#4a4f55";
      ctx.lineWidth = 4;
      ctx.stroke();
      return;
    }

    const opening = (
      x: number,
      y: number,
      bw: number,
      bh: number,
      radius: number,
      fill: "mesh" | "slats",
    ) => {
      ctx.save();
      roundRect(ctx, x, y, bw, bh, radius);
      ctx.fillStyle = "#040405";
      ctx.fill();
      ctx.clip();
      if (fill === "slats") {
        ctx.fillStyle = "#3b3f45";
        for (let yy = y + bh * 0.16; yy < y + bh; yy += bh / 5)
          ctx.fillRect(x, yy, bw, bh * 0.06);
      } else {
        ctx.strokeStyle = "#2c2f34";
        ctx.lineWidth = 3;
        const cell = 20;
        for (let row = 0; row * cell * 0.86 < bh + cell; row += 1) {
          for (let col = 0; col * cell < bw + cell; col += 1) {
            const cx = x + col * cell + (row % 2 ? cell / 2 : 0);
            const cy = y + row * cell * 0.86;
            ctx.beginPath();
            for (let k = 0; k < 6; k += 1) {
              const angle = (k / 6) * Math.PI * 2 + Math.PI / 6;
              const px = cx + Math.cos(angle) * cell * 0.5;
              const py = cy + Math.sin(angle) * cell * 0.5;
              if (k === 0) ctx.moveTo(px, py);
              else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.stroke();
          }
        }
      }
      ctx.restore();
      ctx.strokeStyle = "#6a7078";
      ctx.lineWidth = 5;
      roundRect(ctx, x, y, bw, bh, radius);
      ctx.stroke();
    };

    if (style === "intakes") {
      // Three separate openings, sports-car style.
      opening(w * 0.04, h * 0.34, w * 0.25, h * 0.52, h * 0.2, "mesh");
      opening(w * 0.36, h * 0.5, w * 0.28, h * 0.36, h * 0.16, "mesh");
      opening(w * 0.71, h * 0.34, w * 0.25, h * 0.52, h * 0.2, "mesh");
      return;
    }
    if (style === "tall") {
      opening(w * 0.22, h * 0.04, w * 0.56, h * 0.58, h * 0.1, "slats");
      opening(w * 0.28, h * 0.72, w * 0.44, h * 0.2, h * 0.08, "mesh");
      return;
    }
    opening(w * 0.3, h * 0.1, w * 0.4, h * 0.26, h * 0.1, "slats");
    opening(w * 0.14, h * 0.56, w * 0.72, h * 0.32, h * 0.14, "mesh");
  });
}
