import type { Metadata } from "next";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import { VehicleCreateForm } from "@/components/admin/VehicleCreateForm";
import { adminPage, param } from "@/lib/admin/page";
import { isUuid, todayIso } from "@/lib/admin/validation";
import { getVehicleFormOptions } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "New vehicle" };

export default async function NewVehiclePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await adminPage();
  const [options, search] = await Promise.all([
    getVehicleFormOptions(supabase),
    searchParams,
  ]);
  const modelId = param(search, "model");
  const model = isUuid(modelId)
    ? options.models.find((entry) => entry.id === modelId)
    : undefined;

  return (
    <>
      <AdminPageHeader
        title="New vehicle"
        crumbs={[{ label: "Vehicles", href: "/admin/vehicles" }, { label: "New" }]}
        description="A vehicle is one variant of a model (a 911 Turbo S is a variant of the 911). Unknown figures stay empty: nothing is filled in on your behalf."
      />
      <VehicleCreateForm
        options={options}
        today={todayIso()}
        initialManufacturer={model?.manufacturer_id ?? null}
        initialModel={model?.id ?? null}
      />
    </>
  );
}
