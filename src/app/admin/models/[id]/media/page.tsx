import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/AdminChrome";
import { MediaManager } from "@/components/admin/MediaManager";
import { adminPage, routeId } from "@/lib/admin/page";
import { getAdminModel, getOwnerMedia } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Model photographs" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function ModelMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const [model, media] = await Promise.all([
    getAdminModel(supabase, id),
    getOwnerMedia(supabase, { modelId: id }),
  ]);
  if (!model) notFound();
  return (
    <>
      {media.error ? (
        <Notice tone="error" className="mb-6">
          Photographs could not be loaded. Reload to try again.
        </Notice>
      ) : null}
      <MediaManager
        owner="model"
        ownerId={id}
        title={model.title}
        images={media.images}
        glb={null}
        publicPath={null}
      />
    </>
  );
}
