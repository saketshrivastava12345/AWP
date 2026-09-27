import type { Metadata } from "next";
import { SatelliteSection } from "@/components/admin/SatelliteSection";

export const metadata: Metadata = { title: "Fuel & efficiency" };

export default function FuelSectionPage({ params }: { params: Promise<{ id: string }> }) {
  return <SatelliteSection params={params} section="fuel" />;
}
