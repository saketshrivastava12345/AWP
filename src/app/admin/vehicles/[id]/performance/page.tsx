import type { Metadata } from "next";
import { SatelliteSection } from "@/components/admin/SatelliteSection";

export const metadata: Metadata = { title: "Performance" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default function PerformanceSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SatelliteSection params={params} section="performance" />;
}
