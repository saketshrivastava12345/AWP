/**
 * File inspection for uploads: what a file really is, judged by its bytes.
 *
 * A declared MIME type or a file extension is whatever the uploader's
 * computer says, so neither is trusted. These parsers read the format's own
 * header — magic numbers, the image's pixel dimensions, the glTF binary
 * container and the extensions its JSON chunk declares.
 *
 * Pure, dependency-free and client-safe: the upload form runs the same checks
 * for instant feedback, and the server runs them again before storing.
 */

export const IMAGE_MAX_BYTES = 10 * 1024 * 1024; // the `cars` bucket limit
export const GLB_MAX_BYTES = 50 * 1024 * 1024; // the `models-3d` bucket limit

/** Largest edge accepted; beyond this is almost certainly a corrupt header. */
const MAX_EDGE_PX = 30_000;

export type ImageMime = "image/jpeg" | "image/png" | "image/webp" | "image/avif";

export type ImageInfo = {
  mime: ImageMime;
  ext: "jpg" | "png" | "webp" | "avif";
  width: number;
  height: number;
};

export type Inspection<T> = { ok: true; value: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function ascii(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  for (let i = start; i < start + length && i < bytes.length; i++) {
    out += String.fromCharCode(bytes[i]!);
  }
  return out;
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function withDimensions(
  base: Omit<ImageInfo, "width" | "height">,
  width: number,
  height: number,
): Inspection<ImageInfo> {
  if (!(width > 0 && height > 0)) {
    return fail("The image header does not state its dimensions.");
  }
  if (width > MAX_EDGE_PX || height > MAX_EDGE_PX) {
    return fail(
      `The image is ${width} × ${height} px, larger than any photograph needs.`,
    );
  }
  return { ok: true, value: { ...base, width, height } };
}

function inspectPng(bytes: Uint8Array): Inspection<ImageInfo> {
  if (bytes.length < 24 || ascii(bytes, 12, 4) !== "IHDR") {
    return fail("The PNG file is damaged (no IHDR header).");
  }
  const dv = view(bytes);
  return withDimensions(
    { mime: "image/png", ext: "png" },
    dv.getUint32(16, false),
    dv.getUint32(20, false),
  );
}

/** Start-of-frame markers that carry dimensions (not DHT C4, JPG C8, DAC CC). */
function isStartOfFrame(marker: number): boolean {
  return (
    marker >= 0xc0 &&
    marker <= 0xcf &&
    marker !== 0xc4 &&
    marker !== 0xc8 &&
    marker !== 0xcc
  );
}

function inspectJpeg(bytes: Uint8Array): Inspection<ImageInfo> {
  let i = 2;
  while (i + 3 < bytes.length) {
    if (bytes[i] !== 0xff) return fail("The JPEG file is damaged (bad segment marker).");
    const marker = bytes[i + 1]!;
    if (marker === 0xff) {
      i += 1; // fill byte
      continue;
    }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) {
      i += 2; // standalone markers
      continue;
    }
    if (marker === 0xd9 || marker === 0xda) break; // end of image / start of scan
    const length = (bytes[i + 2]! << 8) | bytes[i + 3]!;
    if (length < 2) return fail("The JPEG file is damaged (bad segment length).");
    if (isStartOfFrame(marker)) {
      if (i + 8 >= bytes.length) break;
      const height = (bytes[i + 5]! << 8) | bytes[i + 6]!;
      const width = (bytes[i + 7]! << 8) | bytes[i + 8]!;
      return withDimensions({ mime: "image/jpeg", ext: "jpg" }, width, height);
    }
    i += 2 + length;
  }
  return fail("The JPEG header does not state its dimensions.");
}

function inspectWebp(bytes: Uint8Array): Inspection<ImageInfo> {
  const chunk = ascii(bytes, 12, 4);
  const base = { mime: "image/webp", ext: "webp" } as const;
  const dv = view(bytes);
  if (chunk === "VP8 ") {
    if (
      bytes.length < 30 ||
      bytes[23] !== 0x9d ||
      bytes[24] !== 0x01 ||
      bytes[25] !== 0x2a
    ) {
      return fail("The WebP file is damaged (bad VP8 frame).");
    }
    return withDimensions(
      base,
      dv.getUint16(26, true) & 0x3fff,
      dv.getUint16(28, true) & 0x3fff,
    );
  }
  if (chunk === "VP8L") {
    if (bytes.length < 25 || bytes[20] !== 0x2f) {
      return fail("The WebP file is damaged (bad VP8L header).");
    }
    const bits = dv.getUint32(21, true);
    return withDimensions(base, (bits & 0x3fff) + 1, ((bits >>> 14) & 0x3fff) + 1);
  }
  if (chunk === "VP8X") {
    if (bytes.length < 30) return fail("The WebP file is damaged (short VP8X header).");
    const width = 1 + (bytes[24]! | (bytes[25]! << 8) | (bytes[26]! << 16));
    const height = 1 + (bytes[27]! | (bytes[28]! << 8) | (bytes[29]! << 16));
    return withDimensions(base, width, height);
  }
  return fail("The WebP file uses an unknown encoding.");
}

type Box = { type: string; start: number; end: number; body: number };

/** ISO-BMFF boxes directly inside [start, end). */
function boxes(bytes: Uint8Array, start: number, end: number): Box[] {
  const dv = view(bytes);
  const found: Box[] = [];
  let offset = start;
  while (offset + 8 <= end) {
    let size = dv.getUint32(offset, false);
    const type = ascii(bytes, offset + 4, 4);
    let header = 8;
    if (size === 1) {
      if (offset + 16 > end) break;
      const high = dv.getUint32(offset + 8, false);
      const low = dv.getUint32(offset + 12, false);
      size = high * 2 ** 32 + low;
      header = 16;
    } else if (size === 0) {
      size = end - offset;
    }
    if (size < header || offset + size > end) break;
    found.push({ type, start: offset, end: offset + size, body: offset + header });
    offset += size;
  }
  return found;
}

function inspectAvif(bytes: Uint8Array): Inspection<ImageInfo> {
  const top = boxes(bytes, 0, bytes.length);
  const ftyp = top.find((box) => box.type === "ftyp");
  if (!ftyp) return fail("Not an AVIF file.");
  const brands = [ascii(bytes, ftyp.body, 4)];
  for (let i = ftyp.body + 8; i + 4 <= ftyp.end; i += 4) brands.push(ascii(bytes, i, 4));
  if (!brands.some((brand) => brand === "avif" || brand === "avis")) {
    return brands.some((brand) => /^(heic|heix|mif1|msf1)$/.test(brand))
      ? fail(
          "HEIC/HEIF images are not supported. Export the photograph as JPEG, WebP or AVIF.",
        )
      : fail("Not an AVIF file.");
  }
  const meta = top.find((box) => box.type === "meta");
  // `meta` is a FullBox: 4 bytes of version and flags precede its children.
  const iprp = meta
    ? boxes(bytes, meta.body + 4, meta.end).find((b) => b.type === "iprp")
    : null;
  const ipco = iprp
    ? boxes(bytes, iprp.body, iprp.end).find((b) => b.type === "ipco")
    : null;
  const ispes = ipco
    ? boxes(bytes, ipco.body, ipco.end).filter((b) => b.type === "ispe")
    : [];
  if (ispes.length === 0) return fail("The AVIF header does not state its dimensions.");
  const dv = view(bytes);
  // Several `ispe` boxes can exist (alpha plane, thumbnails): the image is the largest.
  let width = 0;
  let height = 0;
  for (const ispe of ispes) {
    if (ispe.body + 12 > ispe.end) continue;
    const w = dv.getUint32(ispe.body + 4, false);
    const h = dv.getUint32(ispe.body + 8, false);
    if (w * h > width * height) {
      width = w;
      height = h;
    }
  }
  return withDimensions({ mime: "image/avif", ext: "avif" }, width, height);
}

/**
 * Identifies a photograph from its bytes and reads its pixel size.
 * Accepts JPEG, PNG, WebP and AVIF — the types the `cars` bucket allows.
 */
export function inspectImage(bytes: Uint8Array): Inspection<ImageInfo> {
  if (bytes.length < 12) return fail("The file is empty or too small to be an image.");
  if (bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG" && bytes[4] === 0x0d) {
    return inspectPng(bytes);
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return inspectJpeg(bytes);
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP")
    return inspectWebp(bytes);
  if (ascii(bytes, 4, 4) === "ftyp") return inspectAvif(bytes);
  if (ascii(bytes, 0, 3) === "GIF")
    return fail("GIF is not supported. Use JPEG, PNG, WebP or AVIF.");
  if (/^\s*<(\?xml|svg)/i.test(ascii(bytes, 0, 64))) {
    return fail("SVG is not accepted for photographs. Use JPEG, PNG, WebP or AVIF.");
  }
  return fail("This is not a JPEG, PNG, WebP or AVIF image.");
}

export type Compression = "draco" | "ktx2" | "meshopt";

/** glTF extensions that mean the viewer needs a decoder. */
export const COMPRESSION_EXTENSIONS: Record<string, Compression> = {
  KHR_draco_mesh_compression: "draco",
  KHR_texture_basisu: "ktx2",
  EXT_meshopt_compression: "meshopt",
  KHR_meshopt_compression: "meshopt",
};

export type GlbInfo = {
  version: 2;
  byteLength: number;
  assetVersion: string;
  generator: string | null;
  extensionsUsed: string[];
  extensionsRequired: string[];
  compression: Compression[];
  meshCount: number;
  nodeCount: number;
  materialCount: number;
  textureCount: number;
};

const GLB_MAGIC = 0x46546c67; // "glTF", little-endian
const CHUNK_JSON = 0x4e4f534a; // "JSON"

type GltfJson = {
  asset?: { version?: unknown; generator?: unknown };
  extensionsUsed?: unknown;
  extensionsRequired?: unknown;
  meshes?: unknown;
  nodes?: unknown;
  materials?: unknown;
  textures?: unknown;
};

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const count = (value: unknown): number => (Array.isArray(value) ? value.length : 0);

/**
 * Validates a binary glTF (.glb): the 12-byte header (magic "glTF", version 2,
 * total length equal to the file size, which also catches truncated uploads)
 * and the JSON chunk, whose declared extensions decide the compression the
 * viewer must decode.
 */
export function inspectGlb(bytes: Uint8Array): Inspection<GlbInfo> {
  if (bytes.length < 20) return fail("The file is too small to be a GLB model.");
  const dv = view(bytes);
  if (dv.getUint32(0, true) !== GLB_MAGIC) {
    return /^\s*\{/.test(ascii(bytes, 0, 16))
      ? fail(
          "This is a text .gltf file. Upload the binary .glb form (textures embedded).",
        )
      : fail("This is not a GLB model (the file does not start with “glTF”).");
  }
  const version = dv.getUint32(4, true);
  if (version !== 2)
    return fail(`glTF version ${version} is not supported; version 2 is required.`);
  const declared = dv.getUint32(8, true);
  if (declared !== bytes.length) {
    return fail(
      declared > bytes.length
        ? "The GLB file is incomplete: its header declares more data than was received."
        : "The GLB file has unexpected trailing data.",
    );
  }
  const jsonLength = dv.getUint32(12, true);
  if (dv.getUint32(16, true) !== CHUNK_JSON) {
    return fail("The GLB file is damaged: its first chunk is not JSON.");
  }
  if (jsonLength === 0 || 20 + jsonLength > bytes.length) {
    return fail("The GLB file is damaged: the JSON chunk is truncated.");
  }

  let json: GltfJson;
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(
      bytes.subarray(20, 20 + jsonLength),
    );
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    json = parsed as GltfJson;
  } catch {
    return fail("The GLB file is damaged: its JSON chunk cannot be read.");
  }

  const assetVersion = typeof json.asset?.version === "string" ? json.asset.version : "";
  if (!assetVersion.startsWith("2")) {
    return fail("The model does not declare glTF asset version 2.0.");
  }

  const extensionsUsed = stringList(json.extensionsUsed);
  const compression = [
    ...new Set(
      extensionsUsed
        .map((name) => COMPRESSION_EXTENSIONS[name])
        .filter((value): value is Compression => value !== undefined),
    ),
  ].sort();

  return {
    ok: true,
    value: {
      version: 2,
      byteLength: bytes.length,
      assetVersion,
      generator: typeof json.asset?.generator === "string" ? json.asset.generator : null,
      extensionsUsed,
      extensionsRequired: stringList(json.extensionsRequired),
      compression,
      meshCount: count(json.meshes),
      nodeCount: count(json.nodes),
      materialCount: count(json.materials),
      textureCount: count(json.textures),
    },
  };
}

/** 1536 -> "1.5 KB", 10485760 -> "10 MB". */
export function formatBytes(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB"];
  let amount = value / 1024;
  let unit = 0;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  const digits = amount >= 100 || Number.isInteger(amount) ? 0 : 1;
  return `${amount.toFixed(digits)} ${units[unit]}`;
}
