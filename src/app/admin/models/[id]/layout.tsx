import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/Button";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import { SectionNav } from "@/components/admin/SectionNav";
import { requireAdmin } from "@/lib/admin/auth";
import { adminPage, routeId } from "@/lib/admin/page";
import { isUuid } from "@/lib/admin/validation";
import { getAdminModel } from "@/lib/queries/admin";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!admin || !isUuid(id)) return {};
  const model = await getAdminModel(admin.supabase, id.toLowerCase());
  if (!model) return {};
  return {
    title: {
      default: model.title,
      template: `%s · ${model.title} · Admin — AURIX`,
    },
  };
}

export default async function ModelEditorLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const model = await getAdminModel(supabase, id);
  if (!model) notFound();
  const base = `/admin/models/${id}`;

  return (
    <>
      <AdminPageHeader
        title={model.title}
        crumbs={[{ label: "Models", href: "/admin/models" }, { label: model.title }]}
        description={`${model.variants.length} variant${model.variants.length === 1 ? "" : "s"} · ${model.category.name}`}
        actions={
          <ButtonLink
            href={`/admin/vehicles/new?model=${id}`}
            size="sm"
            variant="secondary"
          >
            Add a variant
          </ButtonLink>
        }
      >
        <SectionNav
          label="Model sections"
          links={[
            { href: base, label: "Model & generations" },
            { href: `${base}/colors`, label: "Colours" },
            { href: `${base}/media`, label: "Photographs" },
          ]}
        />
      </AdminPageHeader>
      {children}
    </>
  );
}
