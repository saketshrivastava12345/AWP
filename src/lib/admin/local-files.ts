import "server-only";

import { existsSync } from "node:fs";
import { join, normalize } from "node:path";

const PUBLIC_DIR = join(process.cwd(), "public");

/**
 * True when a media URL points at a file under /public that is not there
 * (for example a photograph listed in the database but never committed).
 * Remote URLs are not checked here.
 */
export function localFileMissing(url: string | null | undefined): boolean {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return false;
  const path = normalize(join(PUBLIC_DIR, decodeURIComponent(url.split("?")[0] ?? "")));
  if (!path.startsWith(PUBLIC_DIR)) return false;
  return !existsSync(path);
}
