/**
 * Can this browser draw WebGL at all, and on what?
 *
 * Checked once, before any canvas is mounted, so a device without WebGL gets
 * the "3D model unavailable" poster instead of a blank box and an unhandled
 * rejection from inside the renderer. The same probe reads the GPU's name for
 * the quality heuristics, where the browser exposes it.
 *
 * Browser-only (returns "unsupported" on the server), no three.js.
 */

export type WebGLProbe = {
  supported: boolean;
  version: 0 | 1 | 2;
  /** Unmasked renderer string, e.g. "ANGLE (NVIDIA, GeForce RTX 3070 …)". */
  renderer: string | null;
};

const UNSUPPORTED: WebGLProbe = { supported: false, version: 0, renderer: null };

let cached: WebGLProbe | null = null;

export function probeWebGL(): WebGLProbe {
  if (cached) return cached;
  if (typeof document === "undefined") return UNSUPPORTED;

  let result: WebGLProbe = UNSUPPORTED;
  try {
    const canvas = document.createElement("canvas");
    const attributes: WebGLContextAttributes = { failIfMajorPerformanceCaveat: false };
    const gl2 = canvas.getContext("webgl2", attributes);
    const gl =
      gl2 ??
      (canvas.getContext("webgl", attributes) as WebGLRenderingContext | null) ??
      (canvas.getContext(
        "experimental-webgl",
        attributes,
      ) as WebGLRenderingContext | null);
    if (gl) {
      let renderer: string | null = null;
      const info = gl.getExtension("WEBGL_debug_renderer_info");
      if (info) {
        const value: unknown = gl.getParameter(info.UNMASKED_RENDERER_WEBGL);
        renderer = typeof value === "string" ? value : null;
      }
      if (!renderer) {
        const value: unknown = gl.getParameter(gl.RENDERER);
        renderer = typeof value === "string" ? value : null;
      }
      result = { supported: true, version: gl2 ? 2 : 1, renderer };
      // Browsers cap live contexts (often at 16). Give this one back now.
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
  } catch {
    result = UNSUPPORTED;
  }
  cached = result;
  return result;
}

/** For tests: forget the cached probe. */
export function resetWebGLProbe(): void {
  cached = null;
}
