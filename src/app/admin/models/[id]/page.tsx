import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, fuelTone } from "@/components/ui/Badge";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmAction, FormDialog } from "@/components/admin/ActionButtons";
import { Panel, TableFrame, TD, TH } from "@/components/admin/AdminChrome";
import {
  FieldSet,
  NameSlugFields,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
} from "@/components/admin/fields";
import {
  deleteGeneration,
  saveGeneration,
  saveModel,
} from "@/lib/admin/actions/catalogue";
import { BODY_OPTIONS, ENGINE_POSITION_OPTIONS, FUEL_SHORT } from "@/lib/admin/labels";
import { adminPage, routeId } from "@/lib/admin/page";
import { getAdminModel, getVehicleFormOptions } from "@/lib/queries/admin";
import { formatYearRange } from "@/lib/format";

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function ModelPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const [data, options] = await Promise.all([
    getAdminModel(supabase, id),
    getVehicleFormOptions(supabase),
  ]);
  if (!data) notFound();
  const { model, generations, variants } = data;
  const allElectric =
    variants.length > 0 && variants.every((variant) => variant.fuel_type === "electric");

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
      <ActionForm action={saveModel} className="flex flex-col gap-8" aria-label="Model">
        <input type="hidden" name="model_id" value={id} />
        <FieldSet legend="Model" columns={2}>
          <TextField name="name" label="Model name" required defaultValue={model.name} />
          <TextField
            name="slug"
            label="Slug"
            required
            mono
            defaultValue={model.slug}
            hint="Changing it changes every variant's public address."
          />
          <SelectField
            name="category_id"
            label="Category"
            required
            defaultValue={model.category_id}
            options={options.categories.map((category) => ({
              value: category.id,
              label: category.name,
            }))}
          />
          <SelectField
            name="body_type"
            label="Body type"
            required
            defaultValue={model.body_type}
            options={BODY_OPTIONS}
          />
          <TextField
            name="generation"
            label="Current generation (label)"
            defaultValue={model.generation}
            hint="Shown in the catalogue. Generation rows are managed alongside."
          />
          <SelectField
            name="engine_position"
            label="Engine position"
            placeholder={allElectric ? "No engine (battery-electric)" : "Not recorded"}
            defaultValue={model.engine_position}
            options={ENGINE_POSITION_OPTIONS}
            disabled={allElectric}
            hint={
              allElectric
                ? "Every variant is battery-electric."
                : "Where the combustion engine sits; the 3D viewer draws it there."
            }
          />
          <NumberField
            name="production_start"
            label="Production start"
            defaultValue={model.production_start}
          />
          <NumberField
            name="production_end"
            label="Production end"
            defaultValue={model.production_end}
            hint="Empty while in production."
          />
          <TextareaField
            name="description"
            label="Description"
            defaultValue={model.description}
            rows={4}
            className="sm:col-span-2"
          />
        </FieldSet>
        <div className="border-t border-line pt-6">
          <SubmitButton>Save model</SubmitButton>
        </div>
      </ActionForm>

      <div className="flex min-w-0 flex-col gap-6">
        <Panel title={`Generations (${generations.length})`} bodyClassName="p-0 sm:p-0">
          {generations.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ink-400">No generations recorded.</p>
          ) : (
            <ul>
              {generations.map((generation) => {
                const count = variants.filter(
                  (variant) => variant.generation_id === generation.id,
                ).length;
                return (
                  <li
                    key={generation.id}
                    className="flex flex-wrap items-center gap-3 border-b border-line-subtle px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-100">{generation.name}</p>
                      <p className="font-mono text-xs text-ink-500">
                        {generation.year_start
                          ? formatYearRange(generation.year_start, generation.year_end)
                          : "Years not recorded"}{" "}
                        · {count} variant{count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <FormDialog
                      action={saveGeneration}
                      trigger="Edit"
                      triggerLabel={`Edit generation ${generation.name}`}
                      title={`Edit generation ${generation.name}`}
                    >
                      <input type="hidden" name="generation_id" value={generation.id} />
                      <input type="hidden" name="model_id" value={id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <NameSlugFields
                          defaultName={generation.name}
                          defaultSlug={generation.slug}
                        />
                        <NumberField
                          name="year_start"
                          label="First year"
                          defaultValue={generation.year_start}
                        />
                        <NumberField
                          name="year_end"
                          label="Last year"
                          defaultValue={generation.year_end}
                        />
                      </div>
                      <TextareaField
                        name="description"
                        label="Description"
                        defaultValue={generation.description}
                        rows={3}
                      />
                    </FormDialog>
                    <ConfirmAction
                      action={deleteGeneration}
                      fields={{ generation_id: generation.id }}
                      trigger="Delete"
                      triggerVariant="ghost"
                      triggerLabel={`Delete generation ${generation.name}`}
                      title={`Delete generation ${generation.name}?`}
                      description={
                        count
                          ? `${count} variant(s) keep existing but no longer name a generation.`
                          : "No variant uses it."
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <details className="group border-t border-line-subtle">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-5 text-body-s text-ink-50 hover:underline hover:underline-offset-4">
              <span
                aria-hidden="true"
                className="leading-none transition-transform group-open:rotate-45"
              >
                +
              </span>
              Add a generation
            </summary>
            <ActionForm
              action={saveGeneration}
              resetOnSuccess
              className="flex flex-col gap-4 px-5 pb-5"
              aria-label="Add a generation"
            >
              <input type="hidden" name="model_id" value={id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <NameSlugFields namePlaceholder="e.g. 992" />
                <NumberField name="year_start" label="First year" />
                <NumberField name="year_end" label="Last year" />
              </div>
              <div>
                <SubmitButton size="sm">Add generation</SubmitButton>
              </div>
            </ActionForm>
          </details>
        </Panel>

        <Panel title={`Variants (${variants.length})`} bodyClassName="p-0 sm:p-0">
          {variants.length === 0 ? (
            <p className="px-5 py-5 text-sm text-ink-400">No variants yet.</p>
          ) : (
            <TableFrame
              label="Variants of this model"
              maxHeight={false}
              className="rounded-none border-0"
            >
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th scope="col" className={TH}>
                      Variant
                    </th>
                    <th scope="col" className={TH}>
                      Years
                    </th>
                    <th scope="col" className={TH}>
                      Fuel
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((variant) => (
                    <tr key={variant.id}>
                      <td className={TD}>
                        <Link
                          href={`/admin/vehicles/${variant.id}`}
                          className="text-ink-50 underline-offset-4 hover:underline"
                        >
                          {variant.name}
                        </Link>
                        {!variant.is_published ? (
                          <Badge className="ml-2">Draft</Badge>
                        ) : null}
                      </td>
                      <td
                        className={`${TD} text-xs whitespace-nowrap text-ink-400 tabular-nums`}
                      >
                        {formatYearRange(variant.year_start, variant.year_end)}
                      </td>
                      <td className={TD}>
                        <Badge tone={fuelTone(variant.fuel_type)}>
                          {FUEL_SHORT[variant.fuel_type]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableFrame>
          )}
        </Panel>
      </div>
    </div>
  );
}
