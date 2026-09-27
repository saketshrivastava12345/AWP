/**
 * Where the self-hosted 3D decoders live (copied from three.js into
 * `public/`). One definition for the loader and for the catalogue's
 * warm-up prefetch.
 */

/** Draco geometry decoder, glTF build (smaller than the general one). */
export const DRACO_PATH = "/draco/gltf/";

/** Basis Universal transcoder for KTX2 textures. */
export const BASIS_PATH = "/basis/";

/** The files each decoder loads, for prefetching. */
export const DRACO_PATHS = [
  `${DRACO_PATH}draco_wasm_wrapper.js`,
  `${DRACO_PATH}draco_decoder.wasm`,
] as const;

export const BASIS_PATHS = [
  `${BASIS_PATH}basis_transcoder.js`,
  `${BASIS_PATH}basis_transcoder.wasm`,
] as const;
