import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmAction } from "@/components/admin/ActionButtons";
import { Panel, TableFrame, TD, TH } from "@/components/admin/AdminChrome";
import { AttachFeatureForm } from "@/components/admin/AttachFeatureForm";
import { TextField } from "@/components/admin/fields";
import { detachAttachment, updateAttachment } from "@/lib/admin/actions/specs";
import { adminPage, routeId } from "@/lib/admin/page";
import { getVehicleFeatures } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Features" };

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function VehicleFeaturesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const { attached, all } = await getVehicleFeatures(supabase, id);
  const attachedIds = new Set(attached.map((entry) => entry.featureId));
  const byCategory = new Map<string, { value: string; label: string }[]>();
  for (const feature of all) {
    if (attachedIds.has(feature.id)) continue;
    const key = feature.category ?? "Other";
    byCategory.set(key, [
      ...(byCategory.get(key) ?? []),
      { value: feature.id, label: feature.name },
    ]);
  }
  const groups = [...byCategory.entries()].map(([label, options]) => ({
    label,
    options,
  }));

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="attached-features">
        <h2 id="attached-features" className="mb-3 text-h4">
          Features of this vehicle ({attached.length})
        </h2>
        {attached.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No features recorded. The public page lists none rather than guessing.
          </p>
        ) : (
          <TableFrame label="Features of this vehicle">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Feature
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
                  <tr key={entry.featureId}>
                    <td className={TD}>
                      <span className="block text-ink-50">{entry.name}</span>
                      <span className="text-xs text-ink-500">
                        {entry.category ?? "Other"}
                      </span>
                    </td>
                    <td className={TD}>
                      <ActionForm
                        action={updateAttachment}
                        status={false}
                        className="flex items-end gap-2"
                      >
                        <input type="hidden" name="variant_id" value={id} />
                        <input type="hidden" name="kind" value="feature" />
                        <input type="hidden" name="target_id" value={entry.featureId} />
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
                        fields={{
                          variant_id: id,
                          kind: "feature",
                          target_id: entry.featureId,
                        }}
                        trigger="Remove"
                        triggerVariant="ghost"
                        triggerLabel={`Remove ${entry.name}`}
                        title={`Remove ${entry.name}?`}
                        description="The feature stays in the catalogue; it is only detached from this vehicle."
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
      <Panel title="Add a feature">
        <AttachFeatureForm variantId={id} groups={groups} />
      </Panel>
    </div>
  );
}
