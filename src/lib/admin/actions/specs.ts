"use server";

import type { TablesInsert } from "@/types/database";
import { adminAction, dbFailed } from "../action-helpers";
import { CHECK_FIELDS, failed, succeeded, type ActionState } from "../action-state";
import type { AdminSupabase } from "../auth";
import { powertrainSections } from "../labels";
import { afterWrite, CACHE_TAGS } from "../revalidate";
import { SECTION_SCHEMAS, readSection, type SectionKey } from "../sections";
import { LONG_TEXT_MAX, slugify, todayIso } from "../validation";
import type { FuelType } from "@/types/domain";

/**
 * Specification sections of one vehicle: the four 1:1 satellites
 * (performance, dimensions, fuel, EV), the shared engine and transmission
 * records, and the vehicle's features and parts.
 */

const SATELLITES = ["performance", "dimensions", "fuel", "ev"] as const;
type Satellite = (typeof SATELLITES)[number];

const isSatellite = (value: string): value is Satellite =>
  (SATELLITES as readonly string[]).includes(value);

async function vehicleFuel(
  supabase: AdminSupabase,
  id: string,
): Promise<FuelType | null> {
  const { data } = await supabase
    .from("car_variants")
    .select("fuel_type")
    .eq("id", id)
    .maybeSingle();
  return data?.fuel_type ?? null;
}

export async function saveSpecSection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const section = reader.raw("section");
    if (!variantId || !isSatellite(section))
      return failed("Unknown section.", {}, values);

    const schema = SECTION_SCHEMAS[section];
    const { values: fields, hasFigures } = readSection(reader, schema, todayIso());
    if (!reader.ok) return failed(CHECK_FIELDS, reader.errors, values);

    const fuel = await vehicleFuel(supabase, variantId);
    if (!fuel) return failed("That vehicle no longer exists.", {}, values);
    const allowed = powertrainSections(fuel);
    if ((section === "fuel" && !allowed.fuel) || (section === "ev" && !allowed.ev)) {
      return failed(
        section === "fuel"
          ? "A battery-electric vehicle has no fuel specifications."
          : "EV specifications apply only to electric, plug-in hybrid and hybrid vehicles.",
        {},
        values,
      );
    }

    const hasAnything = hasFigures || fields.notes !== null || fields.source !== null;
    if (!hasAnything) {
      // Everything cleared: the section genuinely has no data, so no row.
      const { error } = await supabase
        .from(schema.table as "performance_specs")
        .delete()
        .eq("variant_id", variantId);
      if (error) return dbFailed(error, values);
      afterWrite(CACHE_TAGS.catalogue);
      return succeeded(
        `${schema.title} cleared. The public page will show “Not available”.`,
        values,
      );
    }

    const payload = { ...fields, variant_id: variantId };
    const result = await upsertSatellite(supabase, section, payload);
    if (result) return dbFailed(result, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(`${schema.title} saved.`, values);
  });
}

type SatellitePayload = Record<string, string | number | null> & { variant_id: string };

async function upsertSatellite(
  supabase: AdminSupabase,
  section: Satellite,
  payload: SatellitePayload,
) {
  // Each branch names its table literally so the typed client checks the columns.
  switch (section) {
    case "performance":
      return (
        await supabase
          .from("performance_specs")
          .upsert(payload as TablesInsert<"performance_specs">)
      ).error;
    case "dimensions":
      return (
        await supabase.from("dimensions").upsert(payload as TablesInsert<"dimensions">)
      ).error;
    case "fuel":
      return (
        await supabase.from("fuel_specs").upsert(payload as TablesInsert<"fuel_specs">)
      ).error;
    case "ev":
      return (await supabase.from("ev_specs").upsert(payload as TablesInsert<"ev_specs">))
        .error;
  }
}

export async function clearSpecSection(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const section = reader.raw("section");
    if (!variantId || !isSatellite(section))
      return failed("Unknown section.", {}, values);
    const table = SECTION_SCHEMAS[section].table as "performance_specs";
    const { error } = await supabase.from(table).delete().eq("variant_id", variantId);
    if (error) return dbFailed(error, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(`${SECTION_SCHEMAS[section].title} cleared.`);
  });
}

/**
 * "Mark verified today": records that an editor re-checked the section
 * against its source today. Refused when no source is recorded — a
 * verification date without a source would be meaningless.
 */
export async function markSectionVerified(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const section = reader.raw("section") as SectionKey | "variant";
    if (!variantId) return failed("Unknown vehicle.", {}, values);
    const today = todayIso();
    const noSource = "Record a source for this section before marking it verified.";

    const { data: vehicle } = await supabase
      .from("car_variants")
      .select("id, source, engine_id, transmission_id")
      .eq("id", variantId)
      .maybeSingle();
    if (!vehicle) return failed("That vehicle no longer exists.", {}, values);

    let error: { message: string; code?: string } | null = null;
    let updated = 0;
    if (section === "variant") {
      if (!vehicle.source) return failed(noSource, {}, values);
      const result = await supabase
        .from("car_variants")
        .update({ last_verified_at: today })
        .eq("id", variantId)
        .select("id");
      error = result.error;
      updated = result.data?.length ?? 0;
    } else if (section === "engine" || section === "transmission") {
      const id = section === "engine" ? vehicle.engine_id : vehicle.transmission_id;
      if (!id) return failed(`This vehicle has no ${section}.`, {}, values);
      const table = section === "engine" ? "engines" : "transmissions";
      const { data: record } = await supabase
        .from(table)
        .select("source")
        .eq("id", id)
        .maybeSingle();
      if (!record?.source) return failed(noSource, {}, values);
      const result = await supabase
        .from(table)
        .update({ last_verified_at: today })
        .eq("id", id)
        .select("id");
      error = result.error;
      updated = result.data?.length ?? 0;
    } else if (isSatellite(section)) {
      const table = SECTION_SCHEMAS[section].table as "performance_specs";
      const { data: record } = await supabase
        .from(table)
        .select("source")
        .eq("variant_id", variantId)
        .maybeSingle();
      if (!record) return failed("This section has no figures yet.", {}, values);
      if (!record.source) return failed(noSource, {}, values);
      const result = await supabase
        .from(table)
        .update({ last_verified_at: today })
        .eq("variant_id", variantId)
        .select("variant_id");
      error = result.error;
      updated = result.data?.length ?? 0;
    } else {
      return failed("Unknown section.", {}, values);
    }
    if (error) return dbFailed(error, values);
    if (!updated) return failed("Nothing was updated.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Marked verified today.");
  });
}

// ---------------------------------------------------------------------------
// Engine and transmission (shared records)
// ---------------------------------------------------------------------------

export async function assignComponent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const kind = reader.raw("kind") === "transmission" ? "transmission" : "engine";
    const componentId = reader.uuid(
      "component_id",
      kind === "engine" ? "Engine" : "Transmission",
    );
    if (!variantId || !reader.ok) return failed(CHECK_FIELDS, reader.errors, values);

    if (kind === "engine" && componentId) {
      const fuel = await vehicleFuel(supabase, variantId);
      if (fuel === "electric") {
        return failed("A battery-electric vehicle has no combustion engine.", {}, values);
      }
    }
    if (componentId) {
      const { data } = await supabase
        .from(kind === "engine" ? "engines" : "transmissions")
        .select("id")
        .eq("id", componentId)
        .maybeSingle();
      if (!data)
        return failed(
          CHECK_FIELDS,
          { component_id: "That record no longer exists." },
          values,
        );
    }
    const column =
      kind === "engine" ? { engine_id: componentId } : { transmission_id: componentId };
    const { data, error } = await supabase
      .from("car_variants")
      .update(column)
      .eq("id", variantId)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("That vehicle no longer exists.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(
      componentId
        ? `${kind === "engine" ? "Engine" : "Transmission"} assigned.`
        : "Removed from this vehicle.",
    );
  });
}

/**
 * Edits a shared engine/transmission record, or creates a new one and
 * assigns it to the vehicle (when no record id is given).
 */
export async function saveComponent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const kind = reader.raw("kind") === "transmission" ? "transmission" : "engine";
    const recordId = reader.uuid("record_id", "Record");
    const schema = SECTION_SCHEMAS[kind];
    const { values: fields } = readSection(reader, schema, todayIso());
    if (!reader.ok || !variantId) return failed(CHECK_FIELDS, reader.errors, values);

    if (kind === "engine") {
      const fuel = await vehicleFuel(supabase, variantId);
      if (fuel === "electric")
        return failed("A battery-electric vehicle has no combustion engine.", {}, values);
    }

    const table = kind === "engine" ? "engines" : "transmissions";
    // Names are unique; say so next to the field rather than as a DB error.
    let duplicate = supabase
      .from(table)
      .select("id")
      .ilike("name", String(fields.name).replace(/[%_\\]/g, "\\$&"));
    if (recordId) duplicate = duplicate.neq("id", recordId);
    const { data: taken } = await duplicate.limit(1);
    if (taken?.length) {
      return failed(
        CHECK_FIELDS,
        { name: `A ${kind} with that name already exists. Select it instead.` },
        values,
      );
    }

    if (recordId) {
      const result =
        kind === "engine"
          ? await supabase
              .from("engines")
              .update(fields as TablesInsert<"engines">)
              .eq("id", recordId)
              .select("id")
          : await supabase
              .from("transmissions")
              .update(fields as TablesInsert<"transmissions">)
              .eq("id", recordId)
              .select("id");
      if (result.error) return dbFailed(result.error, values);
      if (!result.data?.length)
        return failed("That record no longer exists.", {}, values);
      afterWrite(CACHE_TAGS.catalogue);
      return succeeded(`${schema.title} saved for every vehicle that uses it.`, values);
    }

    const inserted =
      kind === "engine"
        ? await supabase
            .from("engines")
            .insert(fields as TablesInsert<"engines">)
            .select("id")
            .single()
        : await supabase
            .from("transmissions")
            .insert(fields as TablesInsert<"transmissions">)
            .select("id")
            .single();
    if (inserted.error || !inserted.data) return dbFailed(inserted.error, values);
    const column =
      kind === "engine"
        ? { engine_id: inserted.data.id }
        : { transmission_id: inserted.data.id };
    const { error } = await supabase
      .from("car_variants")
      .update(column)
      .eq("id", variantId);
    if (error) {
      await supabase.from(table).delete().eq("id", inserted.data.id);
      return dbFailed(error, values);
    }
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(`${schema.title} created and assigned to this vehicle.`);
  });
}

// ---------------------------------------------------------------------------
// Features and parts
// ---------------------------------------------------------------------------

export async function attachFeature(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const mode = reader.raw("mode") === "new" ? "new" : "existing";
    const detail = reader.text("detail", "Detail", { max: 500 });
    let featureId =
      mode === "existing"
        ? reader.uuid("feature_id", "Feature", { required: true })
        : null;
    const name =
      mode === "new"
        ? reader.text("feature_name", "Feature name", { required: true, max: 120 })
        : null;
    const slug = mode === "new" ? reader.slug("feature_slug", "Feature slug") : null;
    const category =
      mode === "new" ? reader.text("feature_category", "Category", { max: 60 }) : null;
    const description =
      mode === "new"
        ? reader.text("feature_description", "Description", { max: LONG_TEXT_MAX })
        : null;
    if (!reader.ok || !variantId) return failed(CHECK_FIELDS, reader.errors, values);

    let createdId: string | null = null;
    if (mode === "new" && name) {
      const { data, error } = await supabase
        .from("features")
        .insert({ name, slug: slug ?? slugify(name), category, description })
        .select("id")
        .single();
      if (error || !data) {
        const state = dbFailed(error, values);
        return {
          ...state,
          fieldErrors: Object.fromEntries(
            Object.entries(state.fieldErrors).map(([k, v]) => [`feature_${k}`, v]),
          ),
        };
      }
      featureId = data.id;
      createdId = data.id;
    }
    if (!featureId)
      return failed(CHECK_FIELDS, { feature_id: "Choose a feature." }, values);

    const { error } = await supabase
      .from("variant_features")
      .insert({ variant_id: variantId, feature_id: featureId, detail });
    if (error) {
      if (createdId) await supabase.from("features").delete().eq("id", createdId);
      return dbFailed(error, values);
    }
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Feature added.");
  });
}

export async function updateAttachment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const kind = reader.raw("kind") === "part" ? "part" : "feature";
    const targetId = reader.uuid("target_id", kind === "part" ? "Part" : "Feature", {
      required: true,
    });
    const detail = reader.text("detail", "Detail", { max: 500 });
    if (!reader.ok || !variantId || !targetId)
      return failed(CHECK_FIELDS, reader.errors, values);
    const result =
      kind === "part"
        ? await supabase
            .from("variant_parts")
            .update({ detail })
            .eq("variant_id", variantId)
            .eq("part_id", targetId)
            .select("part_id")
        : await supabase
            .from("variant_features")
            .update({ detail })
            .eq("variant_id", variantId)
            .eq("feature_id", targetId)
            .select("feature_id");
    if (result.error) return dbFailed(result.error, values);
    if (!result.data?.length) return failed("That entry no longer exists.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Detail saved.", values);
  });
}

export async function detachAttachment(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const kind = reader.raw("kind") === "part" ? "part" : "feature";
    const targetId = reader.uuid("target_id", "Entry", { required: true });
    if (!variantId || !targetId) return failed(CHECK_FIELDS, reader.errors, values);
    const { error } =
      kind === "part"
        ? await supabase
            .from("variant_parts")
            .delete()
            .eq("variant_id", variantId)
            .eq("part_id", targetId)
        : await supabase
            .from("variant_features")
            .delete()
            .eq("variant_id", variantId)
            .eq("feature_id", targetId);
    if (error) return dbFailed(error, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(
      kind === "part"
        ? "Part removed from this vehicle."
        : "Feature removed from this vehicle.",
    );
  });
}

export async function attachPart(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const partId = reader.uuid("part_id", "Part", { required: true });
    const detail = reader.text("detail", "Detail", { max: 500 });
    if (!reader.ok || !variantId || !partId)
      return failed(CHECK_FIELDS, reader.errors, values);
    const { error } = await supabase
      .from("variant_parts")
      .insert({ variant_id: variantId, part_id: partId, detail });
    if (error) return dbFailed(error, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Part added.");
  });
}
