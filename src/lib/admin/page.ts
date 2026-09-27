import "server-only";

import { notFound } from "next/navigation";
import { requireAdmin, type AdminContext } from "./auth";
import { isUuid } from "./validation";

/**
 * The gate for an admin page. The admin layout has already refused
 * non-admins (so this never shows them anything different); it is repeated
 * here so no page can ever render — or query — without the check.
 */
export async function adminPage(): Promise<AdminContext> {
  const admin = await requireAdmin();
  if (!admin) notFound();
  return admin;
}

/** A route id that must be a uuid; anything else is a 404, not a DB error. */
export function routeId(value: string): string {
  if (!isUuid(value)) notFound();
  return value.toLowerCase();
}

type Search = Record<string, string | string[] | undefined>;

/** The first value of a search param, trimmed, or "". */
export function param(search: Search, name: string): string {
  const value = search[name];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}
