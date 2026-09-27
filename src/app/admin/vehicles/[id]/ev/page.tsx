import type { Metadata } from "next";
import { SatelliteSection } from "@/components/admin/SatelliteSection";

export const metadata: Metadata = { title: "EV & charging" };

export default function EvSectionPage({ params }: { params: Promise<{ id: string }> }) {
  return <SatelliteSection params={params} section="ev" />;
}
