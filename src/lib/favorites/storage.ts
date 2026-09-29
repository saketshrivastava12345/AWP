/**
 * Browser storage that never throws.
 *
 * Safari private mode, a full quota, a sandboxed iframe or storage blocked
 * by the user all make `localStorage` throw — on access, on read or on
 * write. Saved cars are a convenience, not a reason to crash a page, so
 * every access goes through these and reports failure as a value.
 */

type StorageKind = "localStorage" | "sessionStorage";

function storage(kind: StorageKind): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window[kind];
  } catch {
    return null;
  }
}

export function readStorage(kind: StorageKind, key: string): string | null {
  try {
    return storage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Write, or remove when `value` is null. Returns false when the browser refused. */
export function writeStorage(
  kind: StorageKind,
  key: string,
  value: string | null,
): boolean {
  const target = storage(kind);
  if (!target) return false;
  try {
    if (value === null) target.removeItem(key);
    else target.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

/** A cookie's value from document.cookie, or "" when absent. */
export function readCookie(name: string): string {
  if (typeof document === "undefined") return "";
  try {
    for (const part of document.cookie.split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key === name) return decodeURIComponent(rest.join("="));
    }
  } catch {
    // A malformed cookie string is as good as no cookie.
  }
  return "";
}
