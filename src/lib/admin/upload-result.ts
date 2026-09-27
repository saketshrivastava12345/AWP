/** The JSON the upload route answers with. Client-safe. */
export type UploadResult =
  | { ok: true; message: string; mediaId: string; url: string }
  | { ok: false; message: string; fieldErrors: Record<string, string> };

/** Path of the upload endpoint for a file; it ends in the file's extension. */
export function uploadEndpoint(kind: "image" | "glb", fileName: string): string {
  const ext =
    kind === "glb" ? "glb" : (/\.(jpe?g|png|webp|avif)$/i.exec(fileName)?.[1] ?? "jpg");
  return `/admin/media/upload/upload.${ext.toLowerCase()}`;
}
