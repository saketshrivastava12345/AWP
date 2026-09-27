"use client";

import { useState } from "react";
import type { VehicleFormOptions } from "@/lib/queries/admin";
import {
  ASPIRATION_OPTIONS,
  BODY_OPTIONS,
  DRIVE_OPTIONS,
  ENGINE_POSITION_OPTIONS,
  FUEL_OPTIONS,
  LAYOUT_OPTIONS,
  TRANSMISSION_OPTIONS,
  VEHICLE_STATUS_OPTIONS,
} from "@/lib/admin/labels";
import { createVehicle } from "@/lib/admin/actions/vehicles";
import { ActionForm, SubmitButton } from "./ActionForm";
import {
  CheckboxField,
  FieldSet,
  NumberField,
  SelectField,
  SlugField,
  TextareaField,
  TextField,
} from "./fields";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

type Mode = "none" | "existing" | "new";

function ModeSwitch({
  name,
  label,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: Mode) => void;
  options: { value: Mode; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:col-span-2">
      <span className="text-label" id={`${name}-label`}>
        {label}
      </span>
      <SegmentedControl
        label={label}
        options={options}
        value={value as Mode}
        onChange={onChange}
        className="self-start"
      />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/**
 * New vehicle: manufacturer -> model (existing, or created here) -> the
 * variant's core record, with its engine and transmission chosen from the
 * shared records or created on the spot. Everything is validated again on
 * the server, which also creates the pieces in order and undoes them if a
 * later step fails.
 */
export function VehicleCreateForm({
  options,
  today,
  initialManufacturer,
  initialModel,
}: {
  options: VehicleFormOptions;
  today: string;
  initialManufacturer?: string | null;
  initialModel?: string | null;
}) {
  const [manufacturer, setManufacturer] = useState(initialManufacturer ?? "");
  const [modelMode, setModelMode] = useState<Mode>("existing");
  const [model, setModel] = useState(initialModel ?? "");
  const [modelName, setModelName] = useState("");
  const [variantName, setVariantName] = useState("");
  const [fuel, setFuel] = useState("");
  const [engineMode, setEngineMode] = useState<Mode>("none");
  const [transmissionMode, setTransmissionMode] = useState<Mode>("none");

  const models = options.models.filter((entry) => entry.manufacturer_id === manufacturer);
  const generations = options.generations.filter((entry) => entry.model_id === model);
  const electric = fuel === "electric";
  const effectiveEngineMode = electric ? "none" : engineMode;

  return (
    <ActionForm
      action={createVehicle}
      className="flex flex-col gap-10"
      aria-label="New vehicle"
    >
      <FieldSet legend="1 · Manufacturer and model">
        <SelectField
          name="manufacturer_id"
          label="Manufacturer"
          required
          value={manufacturer}
          onChange={(value) => {
            setManufacturer(value);
            setModel("");
          }}
          placeholder="Choose a manufacturer"
          options={options.manufacturers.map((maker) => ({
            value: maker.id,
            label: maker.name,
          }))}
        />
        <ModeSwitch
          name="model_mode"
          label="Model"
          value={modelMode}
          onChange={setModelMode}
          options={[
            { value: "existing", label: "Existing model" },
            { value: "new", label: "Create a model" },
          ]}
        />
        {modelMode === "existing" ? (
          <>
            <SelectField
              name="model_id"
              label="Model"
              required
              value={model}
              onChange={setModel}
              disabled={!manufacturer}
              placeholder={
                manufacturer
                  ? models.length
                    ? "Choose a model"
                    : "No models yet — create one"
                  : "Choose a manufacturer first"
              }
              options={models.map((entry) => ({
                value: entry.id,
                label: entry.generation
                  ? `${entry.name} (${entry.generation})`
                  : entry.name,
              }))}
            />
            <SelectField
              name="generation_id"
              label="Generation"
              hint="Optional. Generations are managed on the model's page."
              disabled={!model || generations.length === 0}
              placeholder={
                generations.length ? "Not recorded" : "No generations recorded"
              }
              options={generations.map((entry) => ({
                value: entry.id,
                label: [
                  entry.name,
                  entry.year_start ? `${entry.year_start}–${entry.year_end ?? ""}` : null,
                ]
                  .filter(Boolean)
                  .join(" · "),
              }))}
            />
          </>
        ) : (
          <>
            <TextField
              name="model_name"
              label="Model name"
              required
              onChange={setModelName}
              placeholder="e.g. 911"
            />
            <SlugField name="model_slug" label="Model slug" sourceValue={modelName} />
            <SelectField
              name="model_category_id"
              label="Category"
              required
              placeholder="Choose a category"
              options={options.categories.map((category) => ({
                value: category.id,
                label: category.name,
              }))}
            />
            <SelectField
              name="model_body_type"
              label="Body type"
              required
              placeholder="Choose a body type"
              options={BODY_OPTIONS}
            />
            <TextField
              name="model_generation"
              label="Generation"
              hint="e.g. 992. Also recorded as a generation row."
            />
            <SelectField
              name="model_engine_position"
              label="Engine position"
              hint="Leave empty for battery-electric models, or when not recorded."
              placeholder="Not recorded / no engine"
              options={ENGINE_POSITION_OPTIONS}
            />
            <NumberField
              name="model_production_start"
              label="Production start"
              placeholder="Year"
            />
            <NumberField
              name="model_production_end"
              label="Production end"
              placeholder="Year (empty if current)"
            />
            <TextareaField
              name="model_description"
              label="Model description"
              className="sm:col-span-2"
              rows={3}
            />
          </>
        )}
      </FieldSet>

      <FieldSet legend="2 · Variant" columns={3}>
        <TextField
          name="name"
          label="Variant name"
          required
          onChange={setVariantName}
          placeholder="e.g. Turbo S"
        />
        <SlugField name="slug" sourceValue={variantName} />
        <SelectField
          name="status"
          label="Status"
          placeholder="Not recorded"
          options={VEHICLE_STATUS_OPTIONS}
        />
        <NumberField
          name="year_start"
          label="First model year"
          required
          placeholder="e.g. 2024"
        />
        <NumberField
          name="year_end"
          label="Last model year"
          hint="Empty while in production."
        />
        <SelectField
          name="fuel_type"
          label="Fuel type"
          required
          value={fuel}
          onChange={setFuel}
          placeholder="Choose"
          options={FUEL_OPTIONS}
        />
        <SelectField
          name="drive_type"
          label="Drive"
          required
          placeholder="Choose"
          options={DRIVE_OPTIONS}
        />
        <TextareaField
          name="description"
          label="Description"
          className="sm:col-span-2 lg:col-span-3"
          rows={3}
        />
        <TextareaField
          name="notes"
          label="Notes"
          hint="Internal caveats (not shown as specifications)."
          className="sm:col-span-2 lg:col-span-3"
          rows={2}
        />
      </FieldSet>

      <FieldSet
        legend="3 · Powertrain"
        description={
          electric
            ? "A battery-electric vehicle has no combustion engine; add its motors and battery in the EV section after creating it."
            : "Engines and transmissions are shared records. Choose an existing one, or create one here — it will be recorded with this vehicle's source."
        }
      >
        <ModeSwitch
          name="engine_mode"
          label="Engine"
          value={effectiveEngineMode}
          onChange={setEngineMode}
          options={[
            { value: "none", label: "No engine" },
            { value: "existing", label: "Existing", disabled: electric },
            { value: "new", label: "Create", disabled: electric },
          ]}
        />
        {effectiveEngineMode === "existing" ? (
          <SelectField
            name="engine_id"
            label="Engine"
            required
            placeholder="Choose an engine"
            className="sm:col-span-2"
            options={options.engines.map((engine) => ({
              value: engine.id,
              label: `${engine.name}${engine.configuration ? ` · ${engine.configuration}` : ""} · used by ${engine.usage}`,
            }))}
          />
        ) : null}
        {effectiveEngineMode === "new" ? (
          <>
            <TextField
              name="engine_name"
              label="Engine name"
              required
              hint="Unique across the catalogue."
            />
            <SelectField
              name="engine_layout"
              label="Layout"
              required
              placeholder="Choose"
              options={LAYOUT_OPTIONS}
            />
            <NumberField name="engine_cylinders" label="Cylinders" />
            <NumberField name="engine_displacement_cc" label="Displacement" unit="cc" />
            <SelectField
              name="engine_aspiration"
              label="Aspiration"
              required
              placeholder="Choose"
              options={ASPIRATION_OPTIONS}
            />
          </>
        ) : null}

        <ModeSwitch
          name="transmission_mode"
          label="Transmission"
          value={transmissionMode}
          onChange={setTransmissionMode}
          options={[
            { value: "none", label: "Not recorded" },
            { value: "existing", label: "Existing" },
            { value: "new", label: "Create" },
          ]}
        />
        {transmissionMode === "existing" ? (
          <SelectField
            name="transmission_id"
            label="Transmission"
            required
            placeholder="Choose a transmission"
            className="sm:col-span-2"
            options={options.transmissions.map((gearbox) => ({
              value: gearbox.id,
              label: `${gearbox.name} · used by ${gearbox.usage}`,
            }))}
          />
        ) : null}
        {transmissionMode === "new" ? (
          <>
            <TextField
              name="transmission_name"
              label="Transmission name"
              required
              hint="Unique across the catalogue."
            />
            <SelectField
              name="transmission_type"
              label="Type"
              required
              placeholder="Choose"
              options={TRANSMISSION_OPTIONS}
            />
            <NumberField name="transmission_gears" label="Gears" />
          </>
        ) : null}
      </FieldSet>

      <FieldSet
        legend="4 · Source and visibility"
        description="Where these facts come from. A vehicle cannot be created without a source; the verification date is the day you last checked it against that source."
        columns={3}
      >
        <TextField
          name="source"
          label="Source"
          required
          placeholder="e.g. Porsche AG press kit, September 2025"
        />
        <TextField
          name="source_url"
          label="Source URL"
          type="url"
          placeholder="https://"
        />
        <TextField
          name="last_verified_at"
          label="Last verified"
          type="date"
          defaultValue={today}
        />
        <CheckboxField
          name="is_published"
          label="Publish immediately"
          hint="Leave unticked to create a draft. Drafts never appear on the public site."
          className="sm:col-span-2 lg:col-span-3"
        />
      </FieldSet>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-6">
        <SubmitButton>Create vehicle</SubmitButton>
        <p className="text-xs text-ink-500">
          Specifications, prices, photographs and availability are added after creation.
        </p>
      </div>
    </ActionForm>
  );
}
