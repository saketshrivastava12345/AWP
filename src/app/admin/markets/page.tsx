import type { Metadata } from "next";
import { ActionForm, SubmitButton } from "@/components/admin/ActionForm";
import { ConfirmAction, FormDialog } from "@/components/admin/ActionButtons";
import { AdminPageHeader, Notice } from "@/components/admin/AdminChrome";
import { NameSlugFields, TextField } from "@/components/admin/fields";
import {
  deleteMarketPlace,
  saveCity,
  saveRegion,
  setCountryCurrency,
} from "@/lib/admin/actions/geography";
import { adminPage } from "@/lib/admin/page";
import { getAdminGeography, type AdminCity, type AdminRegion } from "@/lib/queries/admin";

export const metadata: Metadata = { title: "Markets" };

function BlockedDelete({ count, what }: { count: number; what: string }) {
  return (
    <span className="inline-flex min-h-9 items-center px-2 text-xs text-ink-500">
      {count} price{count === 1 ? "" : "s"} recorded for this {what} — cannot delete
    </span>
  );
}

function CityRow({ city, regionId }: { city: AdminCity; regionId: string }) {
  return (
    <li className="flex flex-wrap items-center gap-2 border-b border-line-subtle py-2 pl-4 last:border-b-0">
      <span className="min-w-0 flex-1 text-sm text-ink-100">
        {city.name} <span className="font-mono text-xs text-ink-500">{city.slug}</span>
      </span>
      <span className="font-mono text-xs text-ink-500">
        {city.priceCount} price{city.priceCount === 1 ? "" : "s"}
      </span>
      <FormDialog
        action={saveCity}
        trigger="Edit"
        triggerLabel={`Edit ${city.name}`}
        title={`Edit ${city.name}`}
        size="sm"
      >
        <input type="hidden" name="city_id" value={city.id} />
        <input type="hidden" name="region_id" value={regionId} />
        <NameSlugFields defaultName={city.name} defaultSlug={city.slug} />
        <TextField
          name="display_order"
          label="Display order"
          inputMode="numeric"
          mono
          defaultValue={city.display_order}
        />
      </FormDialog>
      {city.priceCount > 0 ? (
        <BlockedDelete count={city.priceCount} what="city" />
      ) : (
        <ConfirmAction
          action={deleteMarketPlace}
          fields={{ kind: "city", id: city.id }}
          trigger="Delete"
          triggerVariant="ghost"
          triggerLabel={`Delete ${city.name}`}
          title={`Delete ${city.name}?`}
          description="No prices use it, so nothing else changes."
        />
      )}
    </li>
  );
}

function RegionBlock({ region, countryId }: { region: AdminRegion; countryId: string }) {
  return (
    <details className="group border-b border-line-subtle last:border-b-0">
      <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center gap-2 px-4 py-2 marker:hidden hover:bg-surface-2/40 sm:px-5">
        <span
          className="text-gold-500 transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          ›
        </span>
        <span className="min-w-0 flex-1 text-sm text-ink-50">
          {region.name}{" "}
          <span className="font-mono text-xs text-ink-500">{region.slug}</span>
        </span>
        <span className="font-mono text-xs text-ink-500">
          {region.cities.length} cit{region.cities.length === 1 ? "y" : "ies"} ·{" "}
          {region.priceCount} price{region.priceCount === 1 ? "" : "s"}
        </span>
      </summary>
      <div className="px-4 pb-4 sm:px-5">
        <div className="flex flex-wrap gap-1 pb-2">
          <FormDialog
            action={saveRegion}
            trigger="Edit state"
            triggerLabel={`Edit ${region.name}`}
            title={`Edit ${region.name}`}
            size="sm"
            triggerVariant="secondary"
          >
            <input type="hidden" name="region_id" value={region.id} />
            <input type="hidden" name="country_id" value={countryId} />
            <NameSlugFields defaultName={region.name} defaultSlug={region.slug} />
            <TextField
              name="display_order"
              label="Display order"
              inputMode="numeric"
              mono
              defaultValue={region.display_order}
            />
          </FormDialog>
          {region.priceCount > 0 ? (
            <BlockedDelete count={region.priceCount} what="state" />
          ) : (
            <ConfirmAction
              action={deleteMarketPlace}
              fields={{ kind: "region", id: region.id }}
              trigger="Delete state"
              triggerVariant="ghost"
              triggerLabel={`Delete ${region.name}`}
              title={`Delete ${region.name}?`}
              description={`Its ${region.cities.length} cit${region.cities.length === 1 ? "y is" : "ies are"} deleted with it. No prices use them.`}
            />
          )}
        </div>
        {region.cities.length ? (
          <ul className="border-l border-line">
            {region.cities.map((city) => (
              <CityRow key={city.id} city={city} regionId={region.id} />
            ))}
          </ul>
        ) : (
          <p className="text-xs text-ink-500">No cities: prices here are state-wide.</p>
        )}
        <ActionForm
          action={saveCity}
          resetOnSuccess
          className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end"
          aria-label={`Add a city to ${region.name}`}
        >
          <input type="hidden" name="region_id" value={region.id} />
          <NameSlugFields nameLabel="New city" namePlaceholder="e.g. Pune" />
          <SubmitButton size="sm" variant="secondary">
            Add city
          </SubmitButton>
        </ActionForm>
      </div>
    </details>
  );
}

export default async function MarketsPage() {
  const { supabase } = await adminPage();
  const geography = await getAdminGeography(supabase);

  return (
    <>
      <AdminPageHeader
        title="Markets"
        crumbs={[{ label: "Prices", href: "/admin/prices" }, { label: "Markets" }]}
        description="Where a price can apply: each country, its states and their cities. A state or city that has prices cannot be deleted — delete or move the prices first."
      />
      {geography.error ? (
        <Notice tone="error">Markets could not be loaded.</Notice>
      ) : null}
      <div className="flex flex-col gap-6">
        {geography.countries.map((country) => (
          <section
            key={country.id}
            aria-labelledby={`country-${country.slug}`}
            className="rounded-md border border-line bg-surface-1/60"
          >
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line-subtle px-4 py-4 sm:px-5">
              <div>
                <h2
                  id={`country-${country.slug}`}
                  className="font-display text-xs tracking-hud text-ink-50 uppercase"
                >
                  {country.flag_emoji ? `${country.flag_emoji} ` : ""}
                  {country.name}
                </h2>
                <p className="mt-1 font-mono text-xs text-ink-500">
                  {country.regions.length} state{country.regions.length === 1 ? "" : "s"}{" "}
                  · {country.priceCount} price{country.priceCount === 1 ? "" : "s"}
                </p>
              </div>
              <ActionForm
                action={setCountryCurrency}
                className="flex items-end gap-2"
                aria-label={`Default currency for ${country.name}`}
              >
                <input type="hidden" name="country_id" value={country.id} />
                <TextField
                  name="currency_code"
                  label="Default currency"
                  mono
                  maxLength={3}
                  defaultValue={country.currency_code}
                  className="w-32"
                />
                <SubmitButton size="sm" variant="secondary">
                  Save
                </SubmitButton>
              </ActionForm>
            </div>
            {country.regions.length ? (
              <div>
                {country.regions.map((region) => (
                  <RegionBlock key={region.id} region={region} countryId={country.id} />
                ))}
              </div>
            ) : (
              <p className="px-4 py-4 text-sm text-ink-500 sm:px-5">
                No states recorded: prices here can only be national.
              </p>
            )}
            <details className="group/add border-t border-line-subtle">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm text-gold-300 sm:px-5">
                <span
                  aria-hidden="true"
                  className="leading-none transition-transform group-open/add:rotate-45"
                >
                  +
                </span>
                Add a state or region to {country.name}
              </summary>
              <ActionForm
                action={saveRegion}
                resetOnSuccess
                className="grid gap-3 px-4 pb-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end sm:px-5"
                aria-label={`Add a state to ${country.name}`}
              >
                <input type="hidden" name="country_id" value={country.id} />
                <NameSlugFields
                  nameLabel="New state / region"
                  namePlaceholder="e.g. Goa"
                />
                <SubmitButton size="sm" variant="secondary">
                  Add state
                </SubmitButton>
              </ActionForm>
            </details>
          </section>
        ))}
      </div>
    </>
  );
}
