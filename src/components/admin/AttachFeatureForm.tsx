"use client";

import { useState } from "react";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { attachFeature } from "@/lib/admin/actions/specs";
import { ActionForm, SubmitButton } from "./ActionForm";
import {
  NameSlugFields,
  SelectField,
  TextareaField,
  TextField,
  type FieldOptionGroup,
} from "./fields";

/** Adds a catalogued feature to a vehicle, or creates the feature first. */
export function AttachFeatureForm({
  variantId,
  groups,
}: {
  variantId: string;
  groups: FieldOptionGroup[];
}) {
  const [mode, setMode] = useState<"existing" | "new">(
    groups.length ? "existing" : "new",
  );
  return (
    <ActionForm
      action={attachFeature}
      resetOnSuccess
      className="flex flex-col gap-4"
      aria-label="Add a feature"
    >
      <input type="hidden" name="variant_id" value={variantId} />
      <input type="hidden" name="mode" value={mode} />
      <SegmentedControl
        label="Feature source"
        className="self-start"
        value={mode}
        onChange={setMode}
        options={[
          { value: "existing", label: "Existing feature", disabled: groups.length === 0 },
          { value: "new", label: "New feature" },
        ]}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "existing" ? (
          <SelectField
            name="feature_id"
            label="Feature"
            required
            placeholder="Choose a feature"
            groups={groups}
          />
        ) : (
          <>
            <NameSlugFields
              nameField="feature_name"
              slugField="feature_slug"
              nameLabel="Feature name"
              slugLabel="Feature slug"
            />
            <TextField
              name="feature_category"
              label="Category"
              placeholder="e.g. Chassis"
            />
            <TextareaField
              name="feature_description"
              label="Description"
              rows={2}
              className="sm:col-span-2"
            />
          </>
        )}
        <TextField
          name="detail"
          label="Detail for this vehicle"
          hint="Optional, e.g. “Standard; carbon-ceramic discs 420 mm front”."
          className={mode === "existing" ? "" : "sm:col-span-2"}
        />
      </div>
      <div>
        <SubmitButton size="sm">Add feature</SubmitButton>
      </div>
    </ActionForm>
  );
}
