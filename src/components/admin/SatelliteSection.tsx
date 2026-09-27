import { notFound } from "next/navigation";
import { ConfirmAction, InlineAction } from "./ActionButtons";
import { Notice, Panel } from "./AdminChrome";
import { ProvenanceLine } from "./ProvenanceLine";
import { SpecSectionForm } from "./SpecSectionForm";
import {
  clearSpecSection,
  markSectionVerified,
  saveSpecSection,
} from "@/lib/admin/actions/specs";
import { powertrainSections, FUEL_LABELS } from "@/lib/admin/labels";
import { adminPage, routeId } from "@/lib/admin/page";
import { SECTION_SCHEMAS } from "@/lib/admin/sections";
import { todayIso } from "@/lib/admin/validation";
import { getAdminVehicle } from "@/lib/queries/admin";

type Satellite = "performance" | "dimensions" | "fuel" | "ev";

/**
 * One of the four 1:1 specification sections of a vehicle. Server component
 * shared by the section routes.
 */
export async function SatelliteSection({
  params,
  section,
}: {
  params: Promise<{ id: string }>;
  section: Satellite;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const vehicle = await getAdminVehicle(supabase, id);
  if (!vehicle) notFound();

  const schema = SECTION_SCHEMAS[section];
  const record =
    section === "performance"
      ? vehicle.performance
      : section === "dimensions"
        ? vehicle.dimensions
        : section === "fuel"
          ? vehicle.fuel
          : vehicle.ev;
  const allowed = powertrainSections(vehicle.variant.fuel_type);
  const applicable =
    section === "fuel" ? allowed.fuel : section === "ev" ? allowed.ev : true;

  if (!applicable) {
    return (
      <Notice title={`${schema.title} does not apply`}>
        {section === "fuel"
          ? "A battery-electric vehicle burns no fuel, so it has no fuel specifications. Its battery and range belong in EV & charging."
          : `EV specifications apply to electric, plug-in hybrid and hybrid vehicles. This vehicle is recorded as ${FUEL_LABELS[vehicle.variant.fuel_type].toLowerCase()}.`}
        {record
          ? " A record exists from before the fuel type changed; clear it below."
          : null}
        {record ? (
          <div className="mt-3">
            <ConfirmAction
              action={clearSpecSection}
              fields={{ variant_id: id, section }}
              trigger="Clear section"
              title={`Clear ${schema.title}?`}
              description="Deletes this section's figures and source."
            />
          </div>
        ) : null}
      </Notice>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <SpecSectionForm
        section={section}
        action={saveSpecSection}
        record={record}
        hidden={{ variant_id: id, section }}
        submitLabel={`Save ${schema.title.toLowerCase()}`}
        today={todayIso()}
      />
      <aside className="flex flex-col gap-6">
        <Panel title="Provenance">
          {record ? (
            <>
              <ProvenanceLine
                source={record.source}
                sourceUrl={record.source_url}
                lastVerified={record.last_verified_at}
              />
              <InlineAction
                action={markSectionVerified}
                fields={{ variant_id: id, section }}
                className="mt-4"
              >
                Mark verified today
              </InlineAction>
            </>
          ) : (
            <p className="text-sm text-ink-400">
              Nothing recorded yet. The public page shows “Not available” for every figure
              in this section.
            </p>
          )}
        </Panel>
        {record ? (
          <Panel title="Clear section">
            <p className="text-sm leading-relaxed text-ink-400">
              Removes every figure in this section, for example when they came from an
              unreliable source.
            </p>
            <div className="mt-4">
              <ConfirmAction
                action={clearSpecSection}
                fields={{ variant_id: id, section }}
                trigger="Clear section"
                title={`Clear ${schema.title}?`}
                description="Deletes this section's figures and source. The public page will show “Not available”."
                confirmLabel="Clear"
              />
            </div>
          </Panel>
        ) : null}
      </aside>
    </div>
  );
}
