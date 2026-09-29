import type { Metadata } from "next";
import { ComponentSection } from "@/components/admin/ComponentSection";

export const metadata: Metadata = { title: "Transmission" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default function TransmissionSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ComponentSection params={params} kind="transmission" />;
}
