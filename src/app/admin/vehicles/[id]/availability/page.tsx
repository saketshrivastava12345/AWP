import type { Metadata } from "next";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import {
  ConfirmAction,
  FormDialog,
  InlineAction,
} from "@/components/admin/ActionButtons";
import { Notice, Panel, TableFrame, TD, TH } from "@/components/admin/AdminChrome";
import { ProvenanceBadge, hostOf } from "@/components/admin/ProvenanceLine";
import { SelectField, TextareaField, TextField } from "@/components/admin/fields";
import {
  deleteAvailability,
  saveAvailability,
  verifyAvailability,
} from "@/lib/admin/actions/catalogue";
import { MARKET_STATUS_LABELS, MARKET_STATUS_OPTIONS } from "@/lib/admin/labels";
import { adminPage, routeId } from "@/lib/admin/page";
import { provenanceStatus } from "@/lib/admin/provenance";
import { todayIso } from "@/lib/admin/validation";
import { getCountryOptions, getVariantMarkets } from "@/lib/queries/admin";
import type { MarketStatus } from "@/types/domain";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Availability" };

const STATUS_TONES: Record<MarketStatus, BadgeTone> = {
  available: "positive",
  upcoming: "electric",
  discontinued: "neutral",
  not_available: "negative",
};

// Blocks on the admin role check, like the layout (see admin/layout.tsx).
export const instant = false;

export default async function VehicleAvailabilityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { supabase } = await adminPage();
  const id = routeId((await params).id);
  const [{ rows, error }, countries] = await Promise.all([
    getVariantMarkets(supabase, id),
    getCountryOptions(supabase),
  ]);
  const recorded = new Set(rows.map((row) => row.country_id));
  const free = countries.filter((country) => !recorded.has(country.id));
  const today = todayIso();

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <section aria-labelledby="availability">
        <h2 id="availability" className="mb-1 text-h4">
          Where it is sold ({rows.length})
        </h2>
        <p className="mb-4 text-xs text-ink-500">
          Per-country availability from a source. Countries not listed are simply not
          recorded — the public page does not assume either way.
        </p>
        {error ? (
          <Notice tone="error">Availability could not be loaded.</Notice>
        ) : rows.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No availability recorded.
          </p>
        ) : (
          <TableFrame label="Availability by country">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Country
                  </th>
                  <th scope="col" className={TH}>
                    Status
                  </th>
                  <th scope="col" className={TH}>
                    Source
                  </th>
                  <th scope="col" className={TH}>
                    Last verified
                  </th>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.country_id}>
                    <td className={TD}>
                      <span className="text-ink-50">
                        {row.country.flag_emoji ? `${row.country.flag_emoji} ` : ""}
                        {row.country.name}
                      </span>
                      {row.notes ? (
                        <span className="mt-1 block text-xs text-ink-500">
                          {row.notes}
                        </span>
                      ) : null}
                    </td>
                    <td className={TD}>
                      <Badge tone={STATUS_TONES[row.status]}>
                        {MARKET_STATUS_LABELS[row.status]}
                      </Badge>
                    </td>
                    <td className={`${TD} max-w-64 text-xs`}>
                      <span className="block truncate text-ink-200">{row.source}</span>
                      {row.source_url ? (
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-50 underline-offset-4 hover:underline"
                        >
                          {hostOf(row.source_url)}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : null}
                    </td>
                    <td className={`${TD} text-xs whitespace-nowrap`}>
                      <span className="block font-mono">
                        {formatDate(row.last_verified_at, "Never")}
                      </span>
                      <span className="mt-1 block">
                        <ProvenanceBadge
                          status={provenanceStatus(row.source, row.last_verified_at)}
                        />
                      </span>
                    </td>
                    <td className={`${TD} text-right`}>
                      <div className="flex flex-wrap justify-end gap-1">
                        <InlineAction
                          action={verifyAvailability}
                          fields={{ variant_id: id, country_id: row.country_id }}
                          variant="ghost"
                          label={`Mark ${row.country.name} verified today`}
                        >
                          Verify
                        </InlineAction>
                        <FormDialog
                          action={saveAvailability}
                          trigger="Edit"
                          triggerLabel={`Edit availability in ${row.country.name}`}
                          title={`Availability in ${row.country.name}`}
                        >
                          <input type="hidden" name="variant_id" value={id} />
                          <input
                            type="hidden"
                            name="original_country_id"
                            value={row.country_id}
                          />
                          <input type="hidden" name="country_id" value={row.country_id} />
                          <SelectField
                            name="status"
                            label="Status"
                            required
                            defaultValue={row.status}
                            options={MARKET_STATUS_OPTIONS}
                          />
                          <TextField
                            name="source"
                            label="Source"
                            required
                            defaultValue={row.source}
                          />
                          <TextField
                            name="source_url"
                            label="Source URL"
                            type="url"
                            defaultValue={row.source_url}
                          />
                          <TextField
                            name="last_verified_at"
                            label="Last verified"
                            type="date"
                            defaultValue={row.last_verified_at}
                          />
                          <TextareaField
                            name="notes"
                            label="Notes"
                            defaultValue={row.notes}
                            rows={2}
                          />
                        </FormDialog>
                        <ConfirmAction
                          action={deleteAvailability}
                          fields={{ variant_id: id, country_id: row.country_id }}
                          trigger="Delete"
                          triggerVariant="ghost"
                          triggerLabel={`Delete availability in ${row.country.name}`}
                          title={`Delete availability in ${row.country.name}?`}
                          description="The country goes back to “not recorded”."
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

      <Panel title="Record availability">
        {free.length === 0 ? (
          <p className="text-sm text-ink-400">Every country already has an entry.</p>
        ) : (
          <ActionForm
            action={saveAvailability}
            resetOnSuccess
            className="flex flex-col gap-4"
            aria-label="Record availability"
          >
            <input type="hidden" name="variant_id" value={id} />
            <SelectField
              name="country_id"
              label="Country"
              required
              placeholder="Choose a country"
              options={free.map((country) => ({
                value: country.id,
                label: `${country.flag_emoji ? `${country.flag_emoji} ` : ""}${country.name}`,
              }))}
            />
            <SelectField
              name="status"
              label="Status"
              required
              placeholder="Choose"
              options={MARKET_STATUS_OPTIONS}
            />
            <TextField name="source" label="Source" required />
            <TextField name="source_url" label="Source URL" type="url" />
            <TextField
              name="last_verified_at"
              label="Last verified"
              type="date"
              defaultValue={today}
            />
            <TextareaField name="notes" label="Notes" rows={2} />
            <div>
              <SubmitButton size="sm">Save availability</SubmitButton>
            </div>
          </ActionForm>
        )}
      </Panel>
    </div>
  );
}
