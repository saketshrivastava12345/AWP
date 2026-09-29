import Link from "next/link";
import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmAction } from "@/components/admin/ActionButtons";
import { Panel, TableFrame, TD, TH } from "@/components/admin/AdminChrome";
import { SelectField, TextField } from "@/components/admin/fields";
import {
  attachPart,
  detachAttachment,
  updateAttachment,
} from "@/lib/admin/actions/specs";
import { adminPage, routeId } from "@/lib/admin/page";
import { getVehicleParts } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Parts" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function VehiclePartsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const { attached, all } = await getVehicleParts(supabase, id);
  const attachedIds = new Set(attached.map((entry) => entry.partId));
  const byCategory = new Map<string, { value: string; label: string }[]>();
  for (const part of all) {
    if (attachedIds.has(part.id)) continue;
    byCategory.set(part.category, [
      ...(byCategory.get(part.category) ?? []),
      { value: part.id, label: part.name },
    ]);
  }
  const groups = [...byCategory.entries()].map(([label, options]) => ({
    label,
    options,
  }));

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="attached-parts">
        <h2 id="attached-parts" className="mb-2 text-h4">
          Parts recorded for this vehicle ({attached.length})
        </h2>
        <p className="mb-4 max-w-2xl text-xs leading-relaxed text-ink-500">
          Link a part from the encyclopedia when this vehicle&apos;s specific version of
          it is documented; the detail says how (“Carbon-ceramic discs, 420 mm front”).
          The 3D viewer lists these under the matching subsystem.
        </p>
        {attached.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No parts recorded for this vehicle.
          </p>
        ) : (
          <TableFrame label="Parts recorded for this vehicle">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Part
                  </th>
                  <th scope="col" className={TH}>
                    Detail for this vehicle
                  </th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Remove</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {attached.map((entry) => (
                  <tr key={entry.partId}>
                    <td className={TD}>
                      <Link
                        href={`/parts/${entry.slug}`}
                        className="block text-ink-50 underline-offset-4 hover:underline"
                      >
                        {entry.name}
                      </Link>
                      <span className="text-xs text-ink-500">{entry.category}</span>
                    </td>
                    <td className={TD}>
                      <ActionForm
                        action={updateAttachment}
                        status={false}
                        className="flex items-end gap-2"
                      >
                        <input type="hidden" name="variant_id" value={id} />
                        <input type="hidden" name="kind" value="part" />
                        <input type="hidden" name="target_id" value={entry.partId} />
                        <TextField
                          name="detail"
                          label={`Detail for ${entry.name}`}
                          defaultValue={entry.detail}
                          className="min-w-0 flex-1 [&>label]:sr-only"
                        />
                        <SubmitButton size="sm" variant="secondary">
                          Save
                        </SubmitButton>
                      </ActionForm>
                    </td>
                    <td className={`${TD} w-0 text-right`}>
                      <ConfirmAction
                        action={detachAttachment}
                        fields={{ variant_id: id, kind: "part", target_id: entry.partId }}
                        trigger="Remove"
                        triggerVariant="ghost"
                        triggerLabel={`Remove ${entry.name}`}
                        title={`Remove ${entry.name}?`}
                        description="The part stays in the encyclopedia; it is only detached from this vehicle."
                        confirmLabel="Remove"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableFrame>
        )}
      </section>
      <Panel title="Add a part">
        {groups.length === 0 ? (
          <p className="text-sm text-ink-400">
            Every part in the encyclopedia is already linked.
          </p>
        ) : (
          <ActionForm
            action={attachPart}
            resetOnSuccess
            className="flex flex-col gap-4"
            aria-label="Add a part"
          >
            <input type="hidden" name="variant_id" value={id} />
            <SelectField
              name="part_id"
              label="Part"
              required
              placeholder="Choose a part"
              groups={groups}
            />
            <TextField
              name="detail"
              label="Detail for this vehicle"
              hint="Optional but recommended."
            />
            <div>
              <SubmitButton size="sm">Add part</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Panel>
    </div>
  );
}
