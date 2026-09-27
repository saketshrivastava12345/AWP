import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmAction, InlineAction } from "@/components/admin/ActionButtons";
import { Notice, Panel } from "@/components/admin/AdminChrome";
import { ProvenanceLine } from "@/components/admin/ProvenanceLine";
import {
  CheckboxField,
  FieldSet,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import { markSectionVerified } from "@/lib/admin/actions/specs";
import { deleteVehicle, updateVehicleCore } from "@/lib/admin/actions/vehicles";
import {
  BODY_LABELS,
  DRIVE_OPTIONS,
  ENGINE_POSITION_LABELS,
  FUEL_OPTIONS,
  VEHICLE_STATUS_OPTIONS,
} from "@/lib/admin/labels";
import { adminPage, param, routeId } from "@/lib/admin/page";
import { getAdminVehicle, getVehicleFormOptions } from "@/lib/queries/admin";

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function VehicleCorePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const [vehicle, options, search] = await Promise.all([
    getAdminVehicle(supabase, id),
    getVehicleFormOptions(supabase),
    searchParams,
  ]);
  if (!vehicle) notFound();
  const { variant, model } = vehicle;
  const generations = options.generations.filter((entry) => entry.model_id === model.id);

  return (
    <div className="flex flex-col gap-8">
      {param(search, "created") ? (
        <Notice tone="success" title="Vehicle created">
          It is {variant.is_published ? "published" : "a draft"}. Add its specifications
          section by section; anything not published by a source stays empty.
        </Notice>
      ) : null}

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <ActionForm
          action={updateVehicleCore}
          className="flex flex-col gap-8"
          aria-label="Core record"
        >
          <input type="hidden" name="variant_id" value={id} />
          <FieldSet legend="Identity" columns={3}>
            <TextField
              name="name"
              label="Variant name"
              required
              defaultValue={variant.name}
            />
            <TextField
              name="slug"
              label="Slug"
              required
              defaultValue={variant.slug}
              mono
              hint="Changing it changes the public address."
            />
            <SelectField
              name="status"
              label="Status"
              placeholder="Not recorded"
              defaultValue={variant.status}
              options={VEHICLE_STATUS_OPTIONS}
            />
            <NumberField
              name="year_start"
              label="First model year"
              required
              defaultValue={variant.year_start}
            />
            <NumberField
              name="year_end"
              label="Last model year"
              defaultValue={variant.year_end}
              hint="Empty while in production."
            />
            <SelectField
              name="generation_id"
              label="Generation"
              placeholder={
                generations.length ? "Not recorded" : "No generations recorded"
              }
              defaultValue={variant.generation_id}
              options={generations.map((entry) => ({
                value: entry.id,
                label: entry.name,
              }))}
            />
          </FieldSet>

          <FieldSet legend="Powertrain" columns={2}>
            <SelectField
              name="fuel_type"
              label="Fuel type"
              required
              defaultValue={variant.fuel_type}
              options={FUEL_OPTIONS}
            />
            <SelectField
              name="drive_type"
              label="Drive"
              required
              defaultValue={variant.drive_type}
              options={DRIVE_OPTIONS}
            />
            <SelectField
              name="engine_id"
              label="Engine"
              placeholder="No engine"
              defaultValue={variant.engine_id}
              hint="Battery-electric vehicles have none. Edit the engine itself in the Engine section."
              options={options.engines.map((engine) => ({
                value: engine.id,
                label: `${engine.name}${engine.configuration ? ` · ${engine.configuration}` : ""}`,
              }))}
            />
            <SelectField
              name="transmission_id"
              label="Transmission"
              placeholder="Not recorded"
              defaultValue={variant.transmission_id}
              options={options.transmissions.map((gearbox) => ({
                value: gearbox.id,
                label: gearbox.name,
              }))}
            />
          </FieldSet>

          <FieldSet
            legend="Base price (legacy)"
            description="A single price with no market. Shown only where no sourced market price exists — record real prices under Prices, with their market, type and source."
          >
            <NumberField
              name="base_price"
              label="Base price"
              defaultValue={variant.base_price}
            />
            <TextField
              name="price_currency"
              label="Currency"
              defaultValue={variant.price_currency}
              mono
              placeholder="e.g. EUR"
              maxLength={3}
            />
          </FieldSet>

          <FieldSet legend="Text" columns={1}>
            <TextareaField
              name="description"
              label="Description"
              defaultValue={variant.description}
              rows={4}
            />
            <TextareaField
              name="notes"
              label="Notes"
              defaultValue={variant.notes}
              rows={2}
              hint="Caveats about this record."
            />
          </FieldSet>

          <FieldSet legend="Source and visibility" columns={3}>
            <TextField
              name="source"
              label="Source"
              required
              defaultValue={variant.source}
            />
            <TextField
              name="source_url"
              label="Source URL"
              type="url"
              defaultValue={variant.source_url}
            />
            <TextField
              name="last_verified_at"
              label="Last verified"
              type="date"
              defaultValue={variant.last_verified_at}
            />
            <CheckboxField
              name="is_published"
              label="Published"
              defaultChecked={variant.is_published}
              hint="Unticked, the vehicle is a draft and hidden from the public site."
              className="sm:col-span-2 lg:col-span-3"
            />
          </FieldSet>

          <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
            <SubmitButton>Save core record</SubmitButton>
          </div>
        </ActionForm>

        <aside className="flex flex-col gap-6">
          <Panel title="Provenance">
            <ProvenanceLine
              source={variant.source}
              sourceUrl={variant.source_url}
              lastVerified={variant.last_verified_at}
            />
            <InlineAction
              action={markSectionVerified}
              fields={{ variant_id: id, section: "variant" }}
              className="mt-4"
            >
              Mark verified today
            </InlineAction>
          </Panel>

          <Panel
            title="Model"
            actions={
              <Link
                href={`/admin/models/${model.id}`}
                className="text-xs text-ink-50 underline-offset-4 hover:underline"
              >
                Edit model
              </Link>
            }
          >
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-500">Manufacturer</dt>
              <dd className="text-ink-100">{vehicle.manufacturer.name}</dd>
              <dt className="text-ink-500">Model</dt>
              <dd className="text-ink-100">{model.name}</dd>
              <dt className="text-ink-500">Category</dt>
              <dd className="text-ink-100">{vehicle.category.name}</dd>
              <dt className="text-ink-500">Body</dt>
              <dd className="text-ink-100">{BODY_LABELS[model.body_type]}</dd>
              <dt className="text-ink-500">Engine position</dt>
              <dd className="text-ink-100">
                {model.engine_position
                  ? ENGINE_POSITION_LABELS[model.engine_position]
                  : "Not recorded"}
              </dd>
            </dl>
          </Panel>

          <Panel title="Delete vehicle" className="border-signal-negative/30">
            <p className="text-sm leading-relaxed text-ink-400">
              Removes the vehicle with its specifications, prices, availability,
              photographs and 3D model. Shared engine and transmission records stay. This
              cannot be undone.
            </p>
            <div className="mt-4">
              <ConfirmAction
                action={deleteVehicle}
                fields={{ variant_id: id }}
                trigger="Delete vehicle"
                title={`Delete ${vehicle.title}?`}
                description="Everything recorded for this vehicle is deleted, and its uploaded files are removed from storage."
                confirmText={variant.name}
                confirmLabel="Delete permanently"
              />
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
