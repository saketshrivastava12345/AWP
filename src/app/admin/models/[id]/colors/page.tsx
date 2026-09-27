import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmAction, FormDialog } from "@/components/admin/ActionButtons";
import { Notice, Panel, TableFrame, TD, TH } from "@/components/admin/AdminChrome";
import { hostOf } from "@/components/admin/ProvenanceLine";
import { SelectField, TextField } from "@/components/admin/fields";
import { deleteColor, saveColor } from "@/lib/admin/actions/catalogue";
import { FINISH_LABELS, FINISH_OPTIONS } from "@/lib/admin/labels";
import { adminPage, routeId } from "@/lib/admin/page";
import type { CarColor } from "@/types/domain";
import { getModelColors } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Colours" };

const HEX_HINT =
  "A rendering approximation of the paint for the 3D configurator — not a sourced fact. The paint's name is.";

function ColorFields({
  modelId,
  color,
  wide = false,
}: {
  modelId: string;
  color?: CarColor;
  wide?: boolean;
}) {
  return (
    <>
      {color ? <input type="hidden" name="color_id" value={color.id} /> : null}
      <input type="hidden" name="model_id" value={modelId} />
      <TextField
        name="name"
        label="Paint name (as published)"
        required
        defaultValue={color?.name}
        placeholder="e.g. Guards Red"
      />
      <div className={wide ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        <TextField
          name="hex"
          label="Rendering colour"
          required
          mono
          defaultValue={color?.hex}
          placeholder="#A1001C"
          hint={HEX_HINT}
        />
        <SelectField
          name="finish"
          label="Finish"
          required
          placeholder="Choose"
          defaultValue={color?.finish}
          options={FINISH_OPTIONS}
        />
        <TextField
          name="source"
          label="Source"
          required
          defaultValue={color?.source}
          placeholder="e.g. Porsche configurator"
        />
        <TextField
          name="source_url"
          label="Source URL"
          type="url"
          defaultValue={color?.source_url}
        />
        <TextField
          name="display_order"
          label="Display order"
          inputMode="numeric"
          mono
          defaultValue={color?.display_order ?? 0}
        />
      </div>
    </>
  );
}

export default async function ModelColorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const { rows, error } = await getModelColors(supabase, id);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="colours">
        <h2
          id="colours"
          className="mb-1 font-display text-micro tracking-hud text-ink-100 uppercase"
        >
          Catalogued paints ({rows.length})
        </h2>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-ink-500">
          Paints the maker offers for this model, from a source. They feed the 3D
          configurator; a model with none shows only neutral studio finishes, labelled as
          such.
        </p>
        {error ? (
          <Notice tone="error">Colours could not be loaded.</Notice>
        ) : rows.length === 0 ? (
          <p className="rounded-md border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No paints recorded.
          </p>
        ) : (
          <TableFrame label="Catalogued paints">
            <table className="w-full min-w-[680px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Paint
                  </th>
                  <th scope="col" className={TH}>
                    Finish
                  </th>
                  <th scope="col" className={TH}>
                    Rendering colour
                  </th>
                  <th scope="col" className={TH}>
                    Source
                  </th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((color) => (
                  <tr key={color.id}>
                    <td className={TD}>
                      <span className="flex items-center gap-3">
                        <span
                          className="size-6 shrink-0 rounded-full border border-line-strong"
                          style={{ backgroundColor: color.hex }}
                          aria-hidden="true"
                        />
                        <span className="text-ink-50">{color.name}</span>
                      </span>
                    </td>
                    <td className={`${TD} text-xs`}>{FINISH_LABELS[color.finish]}</td>
                    <td className={`${TD} font-mono text-xs`}>{color.hex}</td>
                    <td className={`${TD} max-w-56 text-xs`}>
                      <span className="block truncate">{color.source}</span>
                      {color.source_url ? (
                        <a
                          href={color.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-gold-300 hover:text-gold-200"
                        >
                          {hostOf(color.source_url)}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : null}
                    </td>
                    <td className={`${TD} text-right`}>
                      <div className="flex justify-end gap-1">
                        <FormDialog
                          action={saveColor}
                          trigger="Edit"
                          triggerLabel={`Edit ${color.name}`}
                          title={`Edit ${color.name}`}
                        >
                          <ColorFields modelId={id} color={color} wide />
                        </FormDialog>
                        <ConfirmAction
                          action={deleteColor}
                          fields={{ color_id: color.id }}
                          trigger="Delete"
                          triggerVariant="ghost"
                          triggerLabel={`Delete ${color.name}`}
                          title={`Delete ${color.name}?`}
                          description="The configurator stops offering this paint."
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        )}
      </section>
      <Panel title="Add a paint">
        <ActionForm
          action={saveColor}
          resetOnSuccess
          className="flex flex-col gap-4"
          aria-label="Add a paint"
        >
          <ColorFields modelId={id} />
          <div>
            <SubmitButton size="sm">Add paint</SubmitButton>
          </div>
        </ActionForm>
      </Panel>
    </div>
  );
}
