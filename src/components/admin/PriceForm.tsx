"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { AdminCountry } from "@/lib/queries/admin";
import type { MarketPrice, PriceType } from "@/types/domain";
import { savePrice } from "@/lib/admin/actions/prices";
import { PRICE_TYPE_OPTIONS } from "@/lib/admin/labels";
import {
  AMOUNT_FIELDS,
  isListedType,
  previewPrice,
  type AmountField,
} from "@/lib/admin/price-input";
import { parseNumber } from "@/lib/admin/validation";
import {
  PRICE_TYPE_LABELS,
  PRICE_TYPE_NOTES,
  STALE_AFTER_DAYS,
  buildBreakdown,
  daysSince,
} from "@/lib/pricing/engine";
import { formatDate, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ActionForm, SubmitButton } from "./ActionForm";
import { CheckboxField, FieldSet, SelectField, TextareaField, TextField } from "./fields";

type Amounts = Record<AmountField["name"], string>;

const EMPTY_AMOUNTS: Amounts = {
  ex_showroom_price: "",
  rto_tax: "",
  registration_fee: "",
  insurance_estimate: "",
  handling_charges: "",
  fastag: "",
  other_charges: "",
  on_road_price: "",
};

function amountsFrom(price: MarketPrice | null): Amounts {
  if (!price) return EMPTY_AMOUNTS;
  const out = { ...EMPTY_AMOUNTS };
  for (const field of AMOUNT_FIELDS) {
    const value = price[field.name];
    out[field.name] = value === null || value === undefined ? "" : String(value);
  }
  return out;
}

/**
 * Add or edit one sourced price. The market cascades country -> state ->
 * city (a price may be national, state-level or city-level); the currency
 * follows the country until the admin changes it. The preview on the right
 * runs the public site's own pricing engine on the typed figures, so the
 * admin sees exactly how the price will be labelled before saving.
 */
export function PriceForm({
  variantId,
  countries,
  initial,
  mode,
  today,
}: {
  variantId: string;
  countries: AdminCountry[];
  /** The price being edited, or copied for "add newer price". */
  initial: MarketPrice | null;
  mode: "add" | "edit" | "copy";
  today: string;
}) {
  const [countryId, setCountryId] = useState(initial?.country_id ?? "");
  const [regionId, setRegionId] = useState(initial?.region_id ?? "");
  const [cityId, setCityId] = useState(initial?.city_id ?? "");
  const [priceType, setPriceType] = useState<PriceType | "">(initial?.price_type ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "");
  const [currencyTouched, setCurrencyTouched] = useState(Boolean(initial));
  const [amounts, setAmounts] = useState<Amounts>(() => amountsFrom(initial));
  const [verified, setVerified] = useState(initial?.last_verified_at ?? today);
  const [isVerified, setIsVerified] = useState(
    mode === "edit" ? (initial?.is_verified ?? false) : false,
  );

  const country = countries.find((entry) => entry.id === countryId) ?? null;
  const region = country?.regions.find((entry) => entry.id === regionId) ?? null;
  const city = region?.cities.find((entry) => entry.id === cityId) ?? null;
  const listed = priceType !== "" && isListedType(priceType);

  const chooseCountry = (id: string) => {
    setCountryId(id);
    setRegionId("");
    setCityId("");
    const next = countries.find((entry) => entry.id === id);
    if (!currencyTouched) setCurrency(next?.currency_code ?? "");
  };

  const marketLabel = country
    ? [city?.name, region?.name, country.name].filter(Boolean).join(", ")
    : null;

  const preview = useMemo(() => {
    if (!priceType || !country || !/^[A-Za-z]{3}$/.test(currency)) return null;
    const parsed = Object.fromEntries(
      AMOUNT_FIELDS.map((field) => {
        const value = parseNumber(amounts[field.name]);
        return [field.name, value !== null && value >= 0 ? value : null];
      }),
    ) as Record<AmountField["name"], number | null>;
    if (listed) parsed.on_road_price = null;
    return buildBreakdown(
      previewPrice({
        price_type: priceType,
        currency: currency.toUpperCase(),
        amounts: parsed,
        countryId: country.id,
        regionId: region?.id ?? null,
        cityId: city?.id ?? null,
      }),
    );
  }, [priceType, country, region, city, currency, amounts, listed]);

  const age = /^\d{4}-\d{2}-\d{2}$/.test(verified) ? daysSince(verified) : null;
  const heading =
    mode === "edit"
      ? "Edit price"
      : mode === "copy"
        ? "Add a newer price"
        : "Add a price";

  return (
    <ActionForm
      action={savePrice}
      aria-label={heading}
      className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_22rem]"
    >
      <div className="flex min-w-0 flex-col gap-8">
        <input type="hidden" name="variant_id" value={variantId} />
        {mode === "edit" && initial ? (
          <input type="hidden" name="price_id" value={initial.id} />
        ) : null}
        {mode === "copy" && initial ? (
          <input type="hidden" name="previous_id" value={initial.id} />
        ) : null}

        <FieldSet
          legend="Market"
          description="Leave state and city empty for a national price; choose a state for a state-wide price, or a city for a city price."
        >
          <SelectField
            name="country_id"
            label="Country"
            required
            value={countryId}
            onChange={chooseCountry}
            placeholder="Choose a country"
            options={countries.map((entry) => ({
              value: entry.id,
              label: `${entry.flag_emoji ? `${entry.flag_emoji} ` : ""}${entry.name}`,
            }))}
          />
          <SelectField
            name="region_id"
            label="State / region"
            value={regionId}
            onChange={(value) => {
              setRegionId(value);
              setCityId("");
            }}
            disabled={!country || country.regions.length === 0}
            placeholder={
              country && country.regions.length === 0
                ? "No states recorded"
                : "Whole country"
            }
            options={(country?.regions ?? []).map((entry) => ({
              value: entry.id,
              label: entry.name,
            }))}
          />
          <SelectField
            name="city_id"
            label="City"
            value={cityId}
            onChange={setCityId}
            disabled={!region || region.cities.length === 0}
            placeholder={
              region
                ? region.cities.length
                  ? "Whole state"
                  : "No cities recorded"
                : "Choose a state first"
            }
            options={(region?.cities ?? []).map((entry) => ({
              value: entry.id,
              label: entry.name,
            }))}
          />
          <p className="self-end pb-3 text-xs text-ink-500">
            Missing a state or city?{" "}
            <Link href="/admin/markets" className="text-gold-300 hover:text-gold-200">
              Manage markets
            </Link>
          </p>
        </FieldSet>

        <FieldSet legend="Figure">
          <SelectField
            name="price_type"
            label="Price type"
            required
            value={priceType}
            onChange={(value) => setPriceType(value as PriceType | "")}
            placeholder="Choose what the source published"
            options={PRICE_TYPE_OPTIONS}
            hint={priceType ? PRICE_TYPE_NOTES[priceType] : undefined}
          />
          <TextField
            name="currency"
            label="Currency"
            required
            value={currency}
            onChange={(value) => {
              setCurrencyTouched(true);
              setCurrency(value.toUpperCase());
            }}
            maxLength={3}
            mono
            hint={
              country?.currency_code
                ? `Defaults to ${country.currency_code}. Never converted.`
                : "Three-letter ISO code. Never converted."
            }
          />
        </FieldSet>

        <FieldSet
          legend="Amounts"
          description="Enter figures exactly as the source publishes them; leave anything it does not publish empty. Grouping commas are fine."
          columns={4}
        >
          {AMOUNT_FIELDS.map((field) => {
            const disabled = field.name === "on_road_price" && listed;
            return (
              <div
                key={field.name}
                className={cn(
                  field.name === "ex_showroom_price" || field.name === "on_road_price"
                    ? "sm:col-span-2"
                    : "",
                )}
              >
                <TextField
                  name={field.name}
                  label={field.label}
                  inputMode="decimal"
                  mono
                  disabled={disabled}
                  defaultValue={disabled ? "" : amounts[field.name]}
                  onChange={(value) =>
                    setAmounts((current) => ({ ...current, [field.name]: value }))
                  }
                  hint={
                    disabled
                      ? "Not for listed prices: record a published on-road total as an On-road row."
                      : field.hint
                  }
                  required={
                    (field.name === "ex_showroom_price" && listed) ||
                    (field.name === "on_road_price" && priceType !== "" && !listed)
                  }
                />
              </div>
            );
          })}
        </FieldSet>

        <FieldSet legend="Period">
          <TextField
            name="effective_from"
            label="Effective from"
            type="date"
            required
            defaultValue={mode === "edit" ? initial?.effective_from : today}
            hint="The date the source says this price applies from."
          />
          <TextField
            name="effective_to"
            label="Effective to"
            type="date"
            defaultValue={mode === "edit" ? initial?.effective_to : null}
            hint="Empty while the price is still in force."
          />
          {mode === "copy" ? (
            <CheckboxField
              name="close_previous"
              label="End the previous price the day before this one starts"
              defaultChecked
              className="sm:col-span-2"
            />
          ) : null}
        </FieldSet>

        <FieldSet
          legend="Source"
          description="Every price names its source, links to it and records when it was checked. Required."
        >
          <TextField
            name="source"
            label="Source"
            required
            defaultValue={initial?.source}
            placeholder="e.g. Porsche India price list"
          />
          <TextField
            name="source_url"
            label="Source URL"
            type="url"
            required
            defaultValue={initial?.source_url}
            placeholder="https://"
          />
          <TextField
            name="last_verified_at"
            label="Last verified"
            type="date"
            required
            defaultValue={verified}
            onChange={setVerified}
          />
          <div className="flex items-end">
            <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink-100">
              <input
                type="checkbox"
                name="is_verified"
                value="true"
                checked={isVerified}
                onChange={(event) => setIsVerified(event.currentTarget.checked)}
                className="size-4 accent-gold-500"
              />
              Verified against the source by an editor
            </label>
          </div>
          <TextareaField
            name="notes"
            label="Notes"
            defaultValue={initial?.notes}
            rows={2}
            className="sm:col-span-2"
          />
        </FieldSet>

        <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
          <SubmitButton>{mode === "edit" ? "Save changes" : "Save price"}</SubmitButton>
          {mode !== "add" ? (
            <Link
              href={`/admin/vehicles/${variantId}/prices`}
              className="text-sm text-ink-400 hover:text-ink-100"
            >
              Cancel
            </Link>
          ) : null}
        </div>
      </div>

      <aside
        aria-labelledby="price-preview-title"
        className="xl:sticky xl:top-24 xl:self-start"
      >
        <div className="rounded-md border border-line bg-surface-1/80">
          <h3
            id="price-preview-title"
            className="border-b border-line-subtle px-4 py-3 font-display text-micro tracking-hud text-ink-100 uppercase"
          >
            Public preview
          </h3>
          <div className="px-4 py-4 text-sm" aria-live="polite">
            {!preview ? (
              <p className="text-ink-500">
                Choose a country, a price type and a currency to preview how the price
                will read.
              </p>
            ) : (
              <PreviewBody
                breakdown={preview}
                marketLabel={marketLabel}
                verifiedAge={age}
                verifiedOn={verified}
                isVerified={isVerified}
              />
            )}
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Computed by the same engine as the vehicle page. A calculated total appears only
          when the ex-showroom price, RTO and insurance are all recorded — an incomplete
          sum would understate the price.
        </p>
      </aside>
    </ActionForm>
  );
}

function PreviewBody({
  breakdown,
  marketLabel,
  verifiedAge,
  verifiedOn,
  isVerified,
}: {
  breakdown: ReturnType<typeof buildBreakdown>;
  marketLabel: string | null;
  verifiedAge: number | null;
  verifiedOn: string;
  isVerified: boolean;
}) {
  const money = (amount: number) => formatPrice(amount, breakdown.currency, "—");
  const total = breakdown.total;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-ink-400">{marketLabel}</p>
      {total ? (
        <div>
          <p className="tabular font-display text-xl text-ink-50">
            {money(total.amount)}
          </p>
          <p className="mt-1 text-xs text-gold-300">
            {PRICE_TYPE_LABELS[total.type]}
            {total.kind === "calculated"
              ? " · sum of the components below, not a quotation"
              : ""}
          </p>
        </div>
      ) : breakdown.listed ? (
        <div>
          <p className="tabular font-display text-xl text-ink-50">
            {money(breakdown.listed.amount)}
          </p>
          <p className="mt-1 text-xs text-gold-300">
            {PRICE_TYPE_LABELS[breakdown.listed.type]}
          </p>
        </div>
      ) : (
        <p className="text-ink-500">No amount entered yet.</p>
      )}
      {breakdown.listed || breakdown.components.length ? (
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 border-t border-line-subtle pt-3 text-xs">
          {breakdown.listed ? (
            <>
              <dt className="text-ink-400">{PRICE_TYPE_LABELS[breakdown.listed.type]}</dt>
              <dd className="tabular text-right font-mono text-ink-100">
                {money(breakdown.listed.amount)}
              </dd>
            </>
          ) : null}
          {breakdown.components.map((line) => (
            <div key={line.key} className="contents">
              <dt className="text-ink-400">{line.label}</dt>
              <dd className="tabular text-right font-mono text-ink-100">
                {money(line.amount)}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}
      {!total && breakdown.missingForTotal.length && breakdown.listed ? (
        <p className="text-xs text-ink-500">
          No on-road total: {breakdown.missingForTotal.join(" and ")}{" "}
          {breakdown.missingForTotal.length === 1 ? "is" : "are"} not recorded.
        </p>
      ) : null}
      <p className="border-t border-line-subtle pt-3 text-xs text-ink-500">
        {isVerified ? "Verified" : "Not marked verified"} · checked{" "}
        {formatDate(verifiedOn, "—")}
        {verifiedAge !== null && verifiedAge > STALE_AFTER_DAYS
          ? " · will be flagged as possibly out of date"
          : ""}
      </p>
    </div>
  );
}
