import { describe, expect, it } from "vitest";
import { formatBytes, inspectGlb, inspectImage } from "./files";

const bytes = (...parts: (number[] | string | Uint8Array)[]): Uint8Array => {
  const chunks = parts.map((part) =>
    typeof part === "string"
      ? new TextEncoder().encode(part)
      : part instanceof Uint8Array
        ? part
        : Uint8Array.from(part),
  );
  const out = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
};

const u32be = (n: number) => [
  (n >>> 24) & 255,
  (n >>> 16) & 255,
  (n >>> 8) & 255,
  n & 255,
];
const u32le = (n: number) => [
  n & 255,
  (n >>> 8) & 255,
  (n >>> 16) & 255,
  (n >>> 24) & 255,
];
const u16be = (n: number) => [(n >>> 8) & 255, n & 255];

function png(width: number, height: number) {
  return bytes(
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    u32be(13),
    "IHDR",
    u32be(width),
    u32be(height),
    [8, 6, 0, 0, 0],
    [0, 0, 0, 0],
  );
}

function jpeg(width: number, height: number) {
  const app0 = bytes([0xff, 0xe0], u16be(16), "JFIF", [0, 1, 1, 0, 0, 1, 0, 1, 0, 0]);
  const dqt = bytes([0xff, 0xdb], u16be(4), [0, 0]);
  const sof = bytes(
    [0xff, 0xc2],
    u16be(17),
    [8],
    u16be(height),
    u16be(width),
    [3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1],
  );
  return bytes([0xff, 0xd8], app0, dqt, sof, [0xff, 0xda, 0, 2], [0xff, 0xd9]);
}

function avif(width: number, height: number) {
  const box = (type: string, body: Uint8Array) =>
    bytes(u32be(body.length + 8), type, body);
  const ftyp = box("ftyp", bytes("avif", u32be(0), "mif1", "miaf"));
  const ispe = box("ispe", bytes([0, 0, 0, 0], u32be(width), u32be(height)));
  const smallIspe = box("ispe", bytes([0, 0, 0, 0], u32be(64), u32be(36)));
  const ipco = box("ipco", bytes(smallIspe, ispe));
  const iprp = box("iprp", ipco);
  const hdlr = box("hdlr", bytes([0, 0, 0, 0], u32be(0), "pict", new Uint8Array(13)));
  const meta = box("meta", bytes([0, 0, 0, 0], hdlr, iprp));
  return bytes(ftyp, meta, box("mdat", new Uint8Array(8)));
}

function glb(json: object, options: { declaredLength?: number; version?: number } = {}) {
  let text = JSON.stringify(json);
  while (text.length % 4) text += " ";
  const jsonBytes = new TextEncoder().encode(text);
  const bin = new Uint8Array(8);
  const total = 12 + 8 + jsonBytes.length + 8 + bin.length;
  return bytes(
    u32le(0x46546c67),
    u32le(options.version ?? 2),
    u32le(options.declaredLength ?? total),
    u32le(jsonBytes.length),
    u32le(0x4e4f534a),
    jsonBytes,
    u32le(bin.length),
    u32le(0x004e4942),
    bin,
  );
}

describe("inspectImage", () => {
  it("reads PNG dimensions", () => {
    expect(inspectImage(png(1920, 1080))).toEqual({
      ok: true,
      value: { mime: "image/png", ext: "png", width: 1920, height: 1080 },
    });
  });

  it("reads JPEG dimensions from the start-of-frame segment", () => {
    expect(inspectImage(jpeg(4000, 2667))).toEqual({
      ok: true,
      value: { mime: "image/jpeg", ext: "jpg", width: 4000, height: 2667 },
    });
  });

  it("reads all three WebP encodings", () => {
    const vp8x = bytes(
      "RIFF",
      u32le(30),
      "WEBP",
      "VP8X",
      u32le(10),
      [0, 0, 0, 0],
      [0x7f, 0x07, 0x00],
      [0x37, 0x04, 0x00],
    );
    expect(inspectImage(vp8x)).toMatchObject({
      ok: true,
      value: { mime: "image/webp", width: 1920, height: 1080 },
    });

    const bits = (800 - 1) | ((600 - 1) << 14);
    const vp8l = bytes(
      "RIFF",
      u32le(30),
      "WEBP",
      "VP8L",
      u32le(10),
      [0x2f],
      u32le(bits),
      [0, 0, 0, 0, 0],
    );
    expect(inspectImage(vp8l)).toMatchObject({
      ok: true,
      value: { width: 800, height: 600 },
    });

    const vp8 = bytes(
      "RIFF",
      u32le(30),
      "WEBP",
      "VP8 ",
      u32le(10),
      [0, 0, 0],
      [0x9d, 0x01, 0x2a],
      [0x80, 0x02],
      [0xe0, 0x01],
    );
    expect(inspectImage(vp8)).toMatchObject({
      ok: true,
      value: { width: 640, height: 480 },
    });
  });

  it("reads AVIF dimensions from the largest ispe box", () => {
    expect(inspectImage(avif(2560, 1440))).toEqual({
      ok: true,
      value: { mime: "image/avif", ext: "avif", width: 2560, height: 1440 },
    });
  });

  it("rejects files whose bytes are not an accepted image, whatever their name", () => {
    expect(inspectImage(bytes("GIF89a", new Uint8Array(20)))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/GIF/),
    });
    expect(
      inspectImage(bytes('<svg xmlns="http://www.w3.org/2000/svg"></svg>')),
    ).toMatchObject({ ok: false, error: expect.stringMatching(/SVG/) });
    expect(inspectImage(bytes("%PDF-1.7 ....................."))).toMatchObject({
      ok: false,
    });
    expect(inspectImage(new Uint8Array(4))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/too small/),
    });
  });

  it("rejects HEIC with a helpful message", () => {
    const box = bytes(u32be(20), "ftyp", "heic", u32be(0), "mif1");
    expect(inspectImage(bytes(box, new Uint8Array(16)))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/HEIC/),
    });
  });

  it("rejects an image header without dimensions", () => {
    expect(inspectImage(png(0, 100))).toMatchObject({ ok: false });
  });
});

describe("inspectGlb", () => {
  const asset = {
    asset: { version: "2.0", generator: "test" },
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    meshes: [{ primitives: [] }],
  };

  it("accepts a valid binary glTF 2.0 and counts its contents", () => {
    const result = inspectGlb(glb(asset));
    expect(result).toMatchObject({
      ok: true,
      value: {
        version: 2,
        assetVersion: "2.0",
        generator: "test",
        compression: [],
        meshCount: 1,
        nodeCount: 1,
      },
    });
  });

  it("detects compression from extensionsUsed", () => {
    const result = inspectGlb(
      glb({
        ...asset,
        extensionsUsed: [
          "KHR_draco_mesh_compression",
          "KHR_texture_basisu",
          "EXT_meshopt_compression",
          "KHR_materials_clearcoat",
        ],
        extensionsRequired: ["KHR_draco_mesh_compression"],
      }),
    );
    expect(result.ok && result.value.compression).toEqual(["draco", "ktx2", "meshopt"]);
    expect(result.ok && result.value.extensionsRequired).toEqual([
      "KHR_draco_mesh_compression",
    ]);
  });

  it("rejects wrong magic, wrong version and truncated files", () => {
    expect(inspectGlb(bytes("PK\u0003\u0004", new Uint8Array(40)))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/not a GLB/),
    });
    expect(inspectGlb(bytes('{"asset":{"version":"2.0"}}   '))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/text \.gltf/),
    });
    expect(inspectGlb(glb(asset, { version: 1 }))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/version 1/),
    });
    const full = glb(asset);
    expect(inspectGlb(full.subarray(0, full.length - 4))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/incomplete/),
    });
  });

  it("rejects a model that does not declare glTF 2.0", () => {
    expect(inspectGlb(glb({ asset: { version: "1.0" } }))).toMatchObject({
      ok: false,
      error: expect.stringMatching(/2\.0/),
    });
  });

  it("rejects an unreadable JSON chunk", () => {
    const broken = glb(asset);
    broken[21] = 0xff; // corrupt a byte inside the JSON text
    broken[22] = 0xfe;
    expect(inspectGlb(broken)).toMatchObject({
      ok: false,
      error: expect.stringMatching(/JSON/),
    });
  });
});

describe("formatBytes", () => {
  it("formats sizes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(10 * 1024 * 1024)).toBe("10 MB");
    expect(formatBytes(null)).toBe("—");
  });
});
