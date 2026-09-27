import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Notice } from "@/components/admin/AdminChrome";
import { MediaManager } from "@/components/admin/MediaManager";
import { adminPage, routeId } from "@/lib/admin/page";
import { getAdminVehicle, getOwnerMedia } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Media" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function VehicleMediaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const [vehicle, media] = await Promise.all([
    getAdminVehicle(supabase, id),
    getOwnerMedia(supabase, { variantId: id }),
  ]);
  if (!vehicle) notFound();

  return (
    <>
      {media.error ? (
        <Notice tone="error" className="mb-6">
          Media could not be loaded. Reload to try again.
        </Notice>
      ) : null}
      <MediaManager
        owner="variant"
        ownerId={id}
        title={vehicle.title}
        images={media.images}
        glb={media.glb}
        publicPath={vehicle.variant.is_published ? vehicle.publicPath : null}
      />
    </>
  );
}
