"use server";

import { adminAction, dbFailed } from "../action-helpers";
import { CHECK_FIELDS, failed, succeeded, type ActionState } from "../action-state";
import { FINISHES, MARKET_STATUSES } from "../labels";
import { afterWrite, CACHE_TAGS } from "../revalidate";
import { readModel } from "../vehicle-input";
import { LONG_TEXT_MAX, readProvenance, todayIso } from "../validation";

/** Models and their generations, paint colours, and per-market availability. */

export async function saveModel(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("model_id", "Model", { required: true });
    const model = readModel(reader);
    if (!reader.ok || !id || !model) return failed(CHECK_FIELDS, reader.errors, values);

    const { data: current } = await supabase
      .from("car_models")
      .select("id, manufacturer_id, car_variants ( fuel_type )")
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<
        {
          id: string;
          manufacturer_id: string;
          car_variants: { fuel_type: string }[];
        } | null,
        { merge: false }
      >();
    if (!current) return failed("That model no longer exists.", {}, values);
    const { data: slugTaken } = await supabase
      .from("car_models")
      .select("id")
      .eq("manufacturer_id", current.manufacturer_id)
      .eq("slug", model.slug)
      .neq("id", id)
      .maybeSingle();
    if (slugTaken) {
      return failed(
        CHECK_FIELDS,
        { slug: "This manufacturer already has a model with that slug." },
        values,
      );
    }
    const allElectric =
      current.car_variants.length > 0 &&
      current.car_variants.every((v) => v.fuel_type === "electric");
    if (model.engine_position && allElectric) {
      return failed(
        CHECK_FIELDS,
        {
          engine_position:
            "Every variant of this model is battery-electric: there is no engine to place.",
        },
        values,
      );
    }

    const { data, error } = await supabase
      .from("car_models")
      .update(model)
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was saved.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Model saved.", values);
  });
}

export async function saveGeneration(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("generation_id", "Generation");
    const modelId = reader.uuid("model_id", "Model", { required: true });
    const name = reader.text("name", "Name", { required: true, max: 60 });
    const slug = reader.slug("slug", "Slug", { required: true });
    const yearStart = reader.year("year_start", "First year");
    const yearEnd = reader.year("year_end", "Last year");
    const description = reader.text("description", "Description", { max: LONG_TEXT_MAX });
    if (yearStart !== null && yearEnd !== null && yearEnd < yearStart) {
      reader.fail("year_end", "A generation cannot end before it starts.");
    }
    if (!reader.ok || !modelId || !name || !slug)
      return failed(CHECK_FIELDS, reader.errors, values);

    const row = {
      model_id: modelId,
      name,
      slug,
      year_start: yearStart,
      year_end: yearEnd,
      description,
    };
    const result = id
      ? await supabase
          .from("car_generations")
          .update(row)
          .eq("id", id)
          .eq("model_id", modelId)
          .select("id")
      : await supabase.from("car_generations").insert(row).select("id");
    if (result.error) return dbFailed(result.error, values);
    if (!result.data?.length)
      return failed("That generation no longer exists.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(id ? "Generation saved." : "Generation added.", id ? values : null);
  });
}

export async function deleteGeneration(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("generation_id", "Generation", { required: true });
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);
    // Variants keep existing (generation_id is ON DELETE SET NULL); say so.
    const { count } = await supabase
      .from("car_variants")
      .select("id", { count: "exact", head: true })
      .eq("generation_id", id);
    const { data, error } = await supabase
      .from("car_generations")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was deleted.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(
      count
        ? `Generation deleted; ${count} variant(s) no longer name a generation.`
        : "Generation deleted.",
    );
  });
}

export async function saveColor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("color_id", "Colour");
    const modelId = reader.uuid("model_id", "Model", { required: true });
    const name = reader.text("name", "Paint name", { required: true, max: 120 });
    const hex = reader.hex("hex", "Rendering colour", { required: true });
    const finish = reader.choice("finish", "Finish", FINISHES, { required: true });
    const source = reader.text("source", "Source", { required: true, max: 300 });
    const sourceUrl = reader.url("source_url", "Source URL");
    const order = reader.number("display_order", "Display order", { min: 0, max: 32767 });
    if (!reader.ok || !modelId || !name || !hex || !finish || !source) {
      return failed(CHECK_FIELDS, reader.errors, values);
    }
    const row = {
      model_id: modelId,
      name,
      hex,
      finish,
      source,
      source_url: sourceUrl,
      display_order: order ?? 0,
    };
    const result = id
      ? await supabase
          .from("car_colors")
          .update(row)
          .eq("id", id)
          .eq("model_id", modelId)
          .select("id")
      : await supabase.from("car_colors").insert(row).select("id");
    if (result.error) return dbFailed(result.error, values);
    if (!result.data?.length) return failed("That colour no longer exists.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded(id ? `${name} saved.` : `${name} added.`, id ? values : null);
  });
}

export async function deleteColor(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("color_id", "Colour", { required: true });
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);
    const { data, error } = await supabase
      .from("car_colors")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was deleted.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Colour deleted.");
  });
}

export async function saveAvailability(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const countryId = reader.uuid("country_id", "Country", { required: true });
    const originalCountry = reader.uuid("original_country_id", "Country");
    const status = reader.choice("status", "Status", MARKET_STATUSES, { required: true });
    const provenance = readProvenance(reader, { hasData: true, today: todayIso() });
    const notes = reader.text("notes", "Notes", { max: LONG_TEXT_MAX });
    if (!reader.ok || !variantId || !countryId || !status || !provenance.source) {
      return failed(CHECK_FIELDS, reader.errors, values);
    }
    const row = {
      variant_id: variantId,
      country_id: countryId,
      status,
      source: provenance.source,
      source_url: provenance.source_url,
      last_verified_at: provenance.last_verified_at,
      notes,
    };
    const result = originalCountry
      ? await supabase
          .from("variant_markets")
          .update(row)
          .eq("variant_id", variantId)
          .eq("country_id", originalCountry)
          .select("country_id")
      : await supabase.from("variant_markets").insert(row).select("country_id");
    if (result.error) return dbFailed(result.error, values);
    if (!result.data?.length) return failed("That entry no longer exists.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Availability saved.", originalCountry ? values : null);
  });
}

export async function deleteAvailability(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const countryId = reader.uuid("country_id", "Country", { required: true });
    if (!variantId || !countryId) return failed(CHECK_FIELDS, reader.errors, values);
    const { data, error } = await supabase
      .from("variant_markets")
      .delete()
      .eq("variant_id", variantId)
      .eq("country_id", countryId)
      .select("country_id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was deleted.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Availability removed.");
  });
}

export async function verifyAvailability(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const variantId = reader.uuid("variant_id", "Vehicle", { required: true });
    const countryId = reader.uuid("country_id", "Country", { required: true });
    if (!variantId || !countryId) return failed(CHECK_FIELDS, reader.errors, values);
    const { data, error } = await supabase
      .from("variant_markets")
      .update({ last_verified_at: todayIso() })
      .eq("variant_id", variantId)
      .eq("country_id", countryId)
      .select("country_id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was updated.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Marked verified today.");
  });
}
