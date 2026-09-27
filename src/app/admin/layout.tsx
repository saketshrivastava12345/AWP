import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminDenied, AdminShell } from "@/components/admin/AdminChrome";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin — AURIX" },
  description: "Catalogue administration.",
  robots: { index: false, follow: false, nocache: true },
};

/**
 * Navigations into the admin area wait for the role check: it decides between
 * two entirely different screens (the tools or the denial), so there is no
 * meaningful instant UI to show before it answers. Navigations between admin
 * pages reuse this layout and stream each page behind admin/loading.tsx.
 */
export const instant = false;

/**
 * Gate and frame for every /admin page. The role check decides whether the
 * admin frame renders at all; each page checks again itself (and so does
 * every server action), because layouts are not re-run on client navigation
 * and an action is a public endpoint.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) return <AdminDenied />;
  return <AdminShell admin={admin.user}>{children}</AdminShell>;
}
