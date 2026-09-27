import type { Metadata } from "next";
import { ComponentSection } from "@/components/admin/ComponentSection";

export const metadata: Metadata = { title: "Transmission" };

export default function TransmissionSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ComponentSection params={params} kind="transmission" />;
}
