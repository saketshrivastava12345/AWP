import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "./ActionForm";
import { InlineAction } from "./ActionButtons";
import { Notice, Panel } from "./AdminChrome";
import { ProvenanceLine } from "./ProvenanceLine";
import { SpecSectionForm } from "./SpecSectionForm";
import { SelectField } from "./fields";
import {
  assignComponent,
  markSectionVerified,
  saveComponent,
} from "@/lib/admin/actions/specs";
import { adminPage, routeId } from "@/lib/admin/page";
import { SECTION_SCHEMAS } from "@/lib/admin/sections";
import { todayIso } from "@/lib/admin/validation";
import { getAdminVehicle, getVehicleFormOptions } from "@/lib/queries/admin";

/**
 * The engine or transmission of a vehicle. Both are shared records: the page
 * edits the record itself (with a warning when other vehicles use it), lets
 * the admin assign a different one, or create a new one for this vehicle.
 */
export async function ComponentSection({
  params,
  kind,
}: {
  params: Promise<{ id: string }>;
  kind: "engine" | "transmission";
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const [vehicle, options] = await Promise.all([
    getAdminVehicle(supabase, id),
    getVehicleFormOptions(supabase),
  ]);
  if (!vehicle) notFound();

  if (kind === "engine" && vehicle.variant.fuel_type === "electric") {
    return (
      <Notice title="No combustion engine">
        This vehicle is battery-electric. Its motors and battery are recorded under EV
        &amp; charging.
      </Notice>
    );
  }

  const schema = SECTION_SCHEMAS[kind];
  const record = kind === "engine" ? vehicle.engine : vehicle.transmission;
  const choices =
    kind === "engine"
      ? options.engines.map((engine) => ({
          value: engine.id,
          label: `${engine.name}${engine.configuration ? ` · ${engine.configuration}` : ""} · ${engine.usage} vehicle${engine.usage === 1 ? "" : "s"}`,
        }))
      : options.transmissions.map((gearbox) => ({
          value: gearbox.id,
          label: `${gearbox.name} · ${gearbox.usage} vehicle${gearbox.usage === 1 ? "" : "s"}`,
        }));
  const usage = record
    ? kind === "engine"
      ? (options.engines.find((engine) => engine.id === record.id)?.usage ?? 1)
      : (options.transmissions.find((gearbox) => gearbox.id === record.id)?.usage ?? 1)
    : 0;
  const noun = kind === "engine" ? "engine" : "transmission";

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="flex min-w-0 flex-col gap-8">
        {record ? (
          <>
            {usage > 1 ? (
              <Notice tone="warning" title={`Shared by ${usage} vehicles`}>
                Editing this {noun} changes it for all of them. To record a different{" "}
                {noun} for this vehicle only, create a new one below.
              </Notice>
            ) : null}
            <SpecSectionForm
              section={kind}
              action={saveComponent}
              record={record}
              hidden={{ variant_id: id, kind, record_id: record.id }}
              submitLabel={`Save ${noun}`}
              today={todayIso()}
            />
          </>
        ) : (
          <Notice title={`No ${noun} recorded`}>
            Assign an existing {noun} or create one below. Until then the public page
            shows “Not available”.
          </Notice>
        )}

        <Panel
          title={
            record
              ? `Use a different ${noun}`
              : `Assign an ${noun === "engine" ? "engine" : "existing transmission"}`
          }
        >
          <ActionForm
            action={assignComponent}
            className="flex flex-col gap-4 sm:flex-row sm:items-end"
          >
            <input type="hidden" name="variant_id" value={id} />
            <input type="hidden" name="kind" value={kind} />
            <SelectField
              name="component_id"
              label={schema.title}
              placeholder={`No ${noun}`}
              defaultValue={record?.id ?? ""}
              options={choices}
              className="min-w-0 flex-1"
            />
            <SubmitButton variant="secondary">Assign</SubmitButton>
          </ActionForm>
        </Panel>

        <details className="group rounded-card border border-line-subtle bg-surface-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-5 text-body-s text-ink-50 hover:underline hover:underline-offset-4">
            <span
              aria-hidden="true"
              className="text-base leading-none text-ink-400 transition-transform group-open:rotate-45"
            >
              +
            </span>
            Create a new {noun} for this vehicle
          </summary>
          <div className="border-t border-line-subtle px-5 py-5">
            <SpecSectionForm
              section={kind}
              action={saveComponent}
              record={null}
              hidden={{ variant_id: id, kind }}
              submitLabel={`Create and assign ${noun}`}
              today={todayIso()}
            />
          </div>
        </details>
      </div>

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
                fields={{ variant_id: id, section: kind }}
                className="mt-4"
              >
                Mark verified today
              </InlineAction>
            </>
          ) : (
            <p className="text-sm text-ink-400">No {noun} recorded.</p>
          )}
        </Panel>
      </aside>
    </div>
  );
}
