import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { AdminPageHeader } from "@/components/admin/AdminChrome";
import { InlineAction } from "@/components/admin/ActionButtons";
import { SectionNav, type SectionLink } from "@/components/admin/SectionNav";
import { setPublished } from "@/lib/admin/actions/vehicles";
import {
  FUEL_LABELS,
  VEHICLE_STATUS_LABELS,
  powertrainSections,
} from "@/lib/admin/labels";
import { requireAdmin } from "@/lib/admin/auth";
import { adminPage, routeId } from "@/lib/admin/page";
import { isUuid } from "@/lib/admin/validation";
import { getAdminVehicle } from "@/lib/queries/admin";
import { formatYearRange } from "@/lib/format";

/** Section titles read "Prices · Porsche 911 Turbo S". Non-admins get the generic title. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!admin || !isUuid(id)) return {};
  const vehicle = await getAdminVehicle(admin.supabase, id.toLowerCase());
  if (!vehicle) return {};
  return {
    title: {
      default: vehicle.title,
      template: `%s · ${vehicle.title} · Admin — AURIX`,
    },
  };
}

export default async function VehicleEditorLayout({
  params,
  children,
}: {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const vehicle = await getAdminVehicle(supabase, id);
  if (!vehicle) notFound();

  const { variant } = vehicle;
  const allowed = powertrainSections(variant.fuel_type);
  const base = `/admin/vehicles/${id}`;
  const links: SectionLink[] = [
    { href: base, label: "Core" },
    { href: `${base}/performance`, label: "Performance" },
    { href: `${base}/dimensions`, label: "Dimensions" },
    ...(allowed.engine ? [{ href: `${base}/engine`, label: "Engine" }] : []),
    { href: `${base}/transmission`, label: "Transmission" },
    ...(allowed.fuel ? [{ href: `${base}/fuel`, label: "Fuel" }] : []),
    ...(allowed.ev ? [{ href: `${base}/ev`, label: "EV & charging" }] : []),
    { href: `${base}/features`, label: "Features" },
    { href: `${base}/parts`, label: "Parts" },
    { href: `${base}/prices`, label: "Prices" },
    { href: `${base}/media`, label: "Media" },
    { href: `${base}/availability`, label: "Availability" },
    { href: `${base}/sources`, label: "Sources" },
  ];

  return (
    <>
      <AdminPageHeader
        title={vehicle.title}
        crumbs={[
          { label: "Vehicles", href: "/admin/vehicles" },
          { label: vehicle.title },
        ]}
        eyebrow={
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={variant.is_published ? "positive" : "neutral"}>
              {variant.is_published ? "Published" : "Draft"}
            </Badge>
            <Badge tone={fuelTone(variant.fuel_type)}>
              {FUEL_LABELS[variant.fuel_type]}
            </Badge>
            {variant.status ? (
              <Badge>{VEHICLE_STATUS_LABELS[variant.status]}</Badge>
            ) : null}
            <span className="font-mono text-xs text-ink-500">
              {formatYearRange(variant.year_start, variant.year_end)}
            </span>
          </div>
        }
        description={
          variant.is_published
            ? "Visible on the public site. Changes appear there on the next page load."
            : "Draft: not visible on the public site until it is published."
        }
        actions={
          <>
            <InlineAction
              action={setPublished}
              fields={{
                variant_id: id,
                publish: variant.is_published ? "false" : "true",
              }}
              variant={variant.is_published ? "secondary" : "primary"}
            >
              {variant.is_published ? "Unpublish" : "Publish"}
            </InlineAction>
            {variant.is_published ? (
              <ButtonLink
                href={vehicle.publicPath}
                variant="ghost"
                size="sm"
                target="_blank"
                rel="noopener"
              >
                Public page
                <ExternalLink className="size-3" aria-hidden="true" />
              </ButtonLink>
            ) : null}
          </>
        }
      >
        <SectionNav links={links} label="Vehicle sections" />
      </AdminPageHeader>
      {children}
    </>
  );
}
