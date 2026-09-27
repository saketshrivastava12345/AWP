import type { Metadata } from "next";
import { SatelliteSection } from "@/components/admin/SatelliteSection";

export const metadata: Metadata = { title: "Performance" };

export default function PerformanceSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <SatelliteSection params={params} section="performance" />;
}
