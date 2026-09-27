import type { Metadata } from "next";
import { ComponentSection } from "@/components/admin/ComponentSection";

export const metadata: Metadata = { title: "Engine" };

export default function EngineSectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <ComponentSection params={params} kind="engine" />;
}
