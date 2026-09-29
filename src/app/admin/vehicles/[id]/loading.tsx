import { AdminSkeleton } from "@/components/admin/AdminSkeleton";

/** Keeps the vehicle header and section tabs in place while a section loads. */
export default function VehicleSectionLoading() {
  return <AdminSkeleton header={false} rows={6} />;
}
