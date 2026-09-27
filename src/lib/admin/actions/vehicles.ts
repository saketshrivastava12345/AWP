"use server";

import { redirect } from "next/navigation";
import type { TablesInsert, TablesUpdate } from "@/types/database";
import { adminAction, dbFailed } from "../action-helpers";
import { CHECK_FIELDS, failed, succeeded, type ActionState } from "../action-state";
import { ASPIRATIONS, ENGINE_LAYOUTS, TRANSMISSION_TYPES } from "../labels";
import { afterWrite, CACHE_TAGS } from "../revalidate";
import { powertrainConflicts, readModel, readVariantCore } from "../vehicle-input";
import { slugify, todayIso } from "../validation";
import type { AdminSupabase } from "../auth";

/**
 * Vehicle lifecycle: create (optionally with a new model, engine and
 * transmission), edit the core record, publish/unpublish and delete.
 */

async function removeCreated(
  supabase: AdminSupabase,
  created: {
    model?: string;
    generation?: string;
    engine?: string;
    transmission?: string;
  },
) {
  // Compensation when a later step fails: undo what this request created,
  // newest first, so a failed "new vehicle" leaves nothing half-made behind.
  if (created.transmission)
    await supabase.from("transmissions").delete().eq("id", created.transmission);
  if (created.engine) await supabase.from("engines").delete().eq("id", created.engine);
  if (created.generation)
    await supabase.from("car_generations").delete().eq("id", created.generation);
  if (created.model) await supabase.from("car_models").delete().eq("id", created.model);
}

export async function createVehicle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const today = todayIso();
    const manufacturerId = reader.uuid("manufacturer_id", "Manufacturer", {
      required: true,
    });
    const modelMode = reader.raw("model_mode") === "new" ? "new" : "existing";
    const existingModelId =
      modelMode === "existing"
        ? reader.uuid("model_id", "Model", { required: true })
        : null;
    const newModel = modelMode === "new" ? readModel(reader, "model_") : null;
    const generationId =
      modelMode === "existing" ? reader.uuid("generation_id", "Generation") : null;
    const core = readVariantCore(reader, today);

    const engineMode = reader.raw("engine_mode") || "none";
    const transmissionMode = reader.raw("transmission_mode") || "none";
    const engineId =
      engineMode === "existing"
        ? reader.uuid("engine_id", "Engine", { required: true })
        : null;
    const newEngine =
      engineMode === "new"
        ? {
            name: reader.text("engine_name", "Engine name", { required: true, max: 120 }),
            layout: reader.choice("engine_layout", "Engine layout", ENGINE_LAYOUTS, {
              required: true,
            }),
            cylinders: reader.number("engine_cylinders", "Cylinders", {
              min: 1,
              max: 16,
            }),
            displacement_cc: reader.number("engine_displacement_cc", "Displacement", {
              above: 0,
              max: 20000,
              unit: "cc",
            }),
            aspiration: reader.choice("engine_aspiration", "Aspiration", ASPIRATIONS, {
              required: true,
            }),
          }
        : null;
    const transmissionId =
      transmissionMode === "existing"
        ? reader.uuid("transmission_id", "Transmission", { required: true })
        : null;
    const newTransmission =
      transmissionMode === "new"
        ? {
            name: reader.text("transmission_name", "Transmission name", {
              required: true,
              max: 120,
            }),
            type: reader.choice(
              "transmission_type",
              "Transmission type",
              TRANSMISSION_TYPES,
              {
                required: true,
              },
            ),
            gears: reader.number("transmission_gears", "Gears", { min: 1, max: 12 }),
          }
        : null;
    if (
      newTransmission?.type === "single_speed" &&
      newTransmission.gears !== null &&
      newTransmission.gears !== 1
    ) {
      reader.fail(
        "transmission_gears",
        "A single-speed transmission has exactly one gear.",
      );
    }

    if (core) {
      for (const conflict of powertrainConflicts({
        fuel: core.fuel_type,
        hasEngine: engineMode !== "none",
        hasFuelSpecs: false,
        hasEvSpecs: false,
      })) {
        reader.fail(
          conflict.field === "engine_id" ? "engine_mode" : conflict.field,
          conflict.message,
        );
      }
    }
    if (!reader.ok || !core || !manufacturerId)
      return failed(CHECK_FIELDS, reader.errors, values);

    // Relations exist and belong together.
    const { data: maker } = await supabase
      .from("manufacturers")
      .select("id")
      .eq("id", manufacturerId)
      .maybeSingle();
    if (!maker)
      return failed(
        CHECK_FIELDS,
        { manufacturer_id: "That manufacturer no longer exists." },
        values,
      );

    let modelId = existingModelId;
    if (existingModelId) {
      const { data: model } = await supabase
        .from("car_models")
        .select("id, manufacturer_id")
        .eq("id", existingModelId)
        .maybeSingle();
      if (!model || model.manufacturer_id !== manufacturerId) {
        return failed(
          CHECK_FIELDS,
          { model_id: "Choose a model of the selected manufacturer." },
          values,
        );
      }
      if (generationId) {
        const { data: generation } = await supabase
          .from("car_generations")
          .select("id")
          .eq("id", generationId)
          .eq("model_id", existingModelId)
          .maybeSingle();
        if (!generation) {
          return failed(
            CHECK_FIELDS,
            { generation_id: "That generation belongs to another model." },
            values,
          );
        }
      }
      const [{ data: slugTaken }, { data: nameTaken }] = await Promise.all([
        supabase
          .from("car_variants")
          .select("id")
          .eq("model_id", existingModelId)
          .eq("slug", core.slug)
          .maybeSingle(),
        supabase
          .from("car_variants")
          .select("id")
          .eq("model_id", existingModelId)
          .eq("year_start", core.year_start)
          .ilike("name", core.name.replace(/[%_\\]/g, "\\$&"))
          .maybeSingle(),
      ]);
      const errors: Record<string, string> = {};
      if (slugTaken)
        errors.slug = "Another variant of this model already uses that slug.";
      if (nameTaken)
        errors.name =
          "This model already has a variant with that name starting in that year.";
      if (Object.keys(errors).length) return failed(CHECK_FIELDS, errors, values);
    } else if (newModel) {
      const [{ data: slugTaken }, { data: category }] = await Promise.all([
        supabase
          .from("car_models")
          .select("id")
          .eq("manufacturer_id", manufacturerId)
          .eq("slug", newModel.slug)
          .maybeSingle(),
        supabase
          .from("categories")
          .select("id")
          .eq("id", newModel.category_id)
          .maybeSingle(),
      ]);
      const errors: Record<string, string> = {};
      if (slugTaken)
        errors.model_slug = "This manufacturer already has a model with that slug.";
      if (!category) errors.model_category_id = "That category no longer exists.";
      if (Object.keys(errors).length) return failed(CHECK_FIELDS, errors, values);
    }
    if (engineId) {
      const { data } = await supabase
        .from("engines")
        .select("id")
        .eq("id", engineId)
        .maybeSingle();
      if (!data)
        return failed(
          CHECK_FIELDS,
          { engine_id: "That engine no longer exists." },
          values,
        );
    }
    if (transmissionId) {
      const { data } = await supabase
        .from("transmissions")
        .select("id")
        .eq("id", transmissionId)
        .maybeSingle();
      if (!data)
        return failed(
          CHECK_FIELDS,
          { transmission_id: "That transmission no longer exists." },
          values,
        );
    }

    const created: {
      model?: string;
      generation?: string;
      engine?: string;
      transmission?: string;
    } = {};
    let finalGenerationId = generationId;

    if (newModel) {
      const insert: TablesInsert<"car_models"> = {
        ...newModel,
        manufacturer_id: manufacturerId,
      };
      const { data, error } = await supabase
        .from("car_models")
        .insert(insert)
        .select("id")
        .single();
      if (error || !data) return prefixFailure(dbFailed(error, values), "model_");
      created.model = data.id;
      modelId = data.id;
      if (newModel.generation) {
        const genSlug = slugify(newModel.generation) || "generation";
        const { data: generation, error: genError } = await supabase
          .from("car_generations")
          .insert({
            model_id: data.id,
            name: newModel.generation,
            slug: genSlug,
            year_start: newModel.production_start,
            year_end: newModel.production_end,
          })
          .select("id")
          .single();
        if (genError || !generation) {
          await removeCreated(supabase, created);
          return prefixFailure(dbFailed(genError, values), "model_");
        }
        created.generation = generation.id;
        finalGenerationId = generation.id;
      }
    }
    if (!modelId) return failed(CHECK_FIELDS, { model_id: "Choose a model." }, values);

    let finalEngineId = engineId;
    if (newEngine?.name && newEngine.layout && newEngine.aspiration) {
      const { data, error } = await supabase
        .from("engines")
        .insert({
          name: newEngine.name,
          layout: newEngine.layout,
          cylinders: newEngine.cylinders,
          displacement_cc: newEngine.displacement_cc,
          aspiration: newEngine.aspiration,
          source: core.source,
          source_url: core.source_url,
          last_verified_at: core.last_verified_at,
        })
        .select("id")
        .single();
      if (error || !data) {
        await removeCreated(supabase, created);
        return prefixFailure(dbFailed(error, values), "engine_");
      }
      created.engine = data.id;
      finalEngineId = data.id;
    }

    let finalTransmissionId = transmissionId;
    if (newTransmission?.name && newTransmission.type) {
      const { data, error } = await supabase
        .from("transmissions")
        .insert({
          name: newTransmission.name,
          type: newTransmission.type,
          gears: newTransmission.gears,
          source: core.source,
          source_url: core.source_url,
          last_verified_at: core.last_verified_at,
        })
        .select("id")
        .single();
      if (error || !data) {
        await removeCreated(supabase, created);
        return prefixFailure(dbFailed(error, values), "transmission_");
      }
      created.transmission = data.id;
      finalTransmissionId = data.id;
    }

    const variant: TablesInsert<"car_variants"> = {
      ...core,
      model_id: modelId,
      generation_id: finalGenerationId,
      engine_id: finalEngineId,
      transmission_id: finalTransmissionId,
    };
    const { data: inserted, error } = await supabase
      .from("car_variants")
      .insert(variant)
      .select("id")
      .single();
    if (error || !inserted) {
      await removeCreated(supabase, created);
      return dbFailed(error, values);
    }

    afterWrite(CACHE_TAGS.catalogue);
    redirect(`/admin/vehicles/${inserted.id}?created=1`);
  });
}

/** Moves a nested form's error ("name" -> "model_name") onto the right field. */
function prefixFailure(state: ActionState, prefix: string): ActionState {
  const fieldErrors = Object.fromEntries(
    Object.entries(state.fieldErrors).map(([field, message]) => [
      `${prefix}${field}`,
      message,
    ]),
  );
  return { ...state, fieldErrors };
}

export async function updateVehicleCore(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("variant_id", "Vehicle", { required: true });
    const core = readVariantCore(reader, todayIso());
    const generationId = reader.uuid("generation_id", "Generation");
    const engineId = reader.uuid("engine_id", "Engine");
    const transmissionId = reader.uuid("transmission_id", "Transmission");
    const basePrice = reader.number("base_price", "Base price", {
      min: 0,
      max: 999_999_999_999.99,
      scale: 2,
    });
    const currency = reader.currency("price_currency", "Base price currency");
    if ((basePrice === null) !== (currency === null)) {
      reader.fail(
        basePrice === null ? "base_price" : "price_currency",
        "A base price needs its currency, and a currency needs a price.",
      );
    }
    if (!reader.ok || !id || !core) return failed(CHECK_FIELDS, reader.errors, values);

    const { data: current } = await supabase
      .from("car_variants")
      .select("id, model_id, fuel_specs ( variant_id ), ev_specs ( variant_id )")
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<
        {
          id: string;
          model_id: string;
          fuel_specs: { variant_id: string } | null;
          ev_specs: { variant_id: string } | null;
        } | null,
        { merge: false }
      >();
    if (!current) return failed("That vehicle no longer exists.", {}, values);

    const errors: Record<string, string> = {};
    for (const conflict of powertrainConflicts({
      fuel: core.fuel_type,
      hasEngine: engineId !== null,
      hasFuelSpecs: current.fuel_specs !== null,
      hasEvSpecs: current.ev_specs !== null,
    })) {
      errors[conflict.field] ??= conflict.message;
    }
    const [{ data: slugTaken }, { data: nameTaken }, generation] = await Promise.all([
      supabase
        .from("car_variants")
        .select("id")
        .eq("model_id", current.model_id)
        .eq("slug", core.slug)
        .neq("id", id)
        .maybeSingle(),
      supabase
        .from("car_variants")
        .select("id")
        .eq("model_id", current.model_id)
        .eq("year_start", core.year_start)
        .ilike("name", core.name.replace(/[%_\\]/g, "\\$&"))
        .neq("id", id)
        .maybeSingle(),
      generationId
        ? supabase
            .from("car_generations")
            .select("id")
            .eq("id", generationId)
            .eq("model_id", current.model_id)
            .maybeSingle()
        : Promise.resolve({ data: { id: "" } }),
    ]);
    if (slugTaken) errors.slug = "Another variant of this model already uses that slug.";
    if (nameTaken)
      errors.name =
        "This model already has a variant with that name starting in that year.";
    if (!generation.data)
      errors.generation_id = "That generation belongs to another model.";
    if (Object.keys(errors).length) return failed(CHECK_FIELDS, errors, values);

    const update: TablesUpdate<"car_variants"> = {
      ...core,
      generation_id: generationId,
      engine_id: engineId,
      transmission_id: transmissionId,
      base_price: basePrice,
      price_currency: currency,
    };
    const { data, error } = await supabase
      .from("car_variants")
      .update(update)
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length)
      return failed(
        "Nothing was saved: the vehicle no longer exists or you lack permission.",
        {},
        values,
      );

    afterWrite(CACHE_TAGS.catalogue, CACHE_TAGS.prices);
    return succeeded("Vehicle saved.", values);
  });
}

export async function setPublished(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("variant_id", "Vehicle", { required: true });
    const publish = reader.raw("publish") === "true";
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);
    const { data, error } = await supabase
      .from("car_variants")
      .update({ is_published: publish })
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("That vehicle no longer exists.", {}, values);
    afterWrite(CACHE_TAGS.catalogue, CACHE_TAGS.prices);
    return succeeded(
      publish
        ? "Published. The vehicle is now visible on the public site."
        : "Unpublished. The vehicle is now a draft.",
    );
  });
}

export async function deleteVehicle(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("variant_id", "Vehicle", { required: true });
    const typed = reader.raw("confirmation");
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);

    const { data: vehicle } = await supabase
      .from("car_variants")
      .select("id, name, car_models!inner ( name, manufacturers!inner ( name ) )")
      .eq("id", id)
      .maybeSingle()
      .overrideTypes<
        {
          id: string;
          name: string;
          car_models: { name: string; manufacturers: { name: string } };
        } | null,
        { merge: false }
      >();
    if (!vehicle) return failed("That vehicle no longer exists.", {}, values);
    // The typed confirmation is checked here too, not only in the dialog.
    if (typed !== vehicle.name) {
      return failed(
        CHECK_FIELDS,
        { confirmation: `Type the variant name “${vehicle.name}” exactly.` },
        values,
      );
    }

    const { data: media } = await supabase
      .from("car_media")
      .select("type, storage_path")
      .eq("variant_id", id)
      .not("storage_path", "is", null);

    const { data, error } = await supabase
      .from("car_variants")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length)
      return failed(
        "Nothing was deleted: you lack permission or it is already gone.",
        {},
        values,
      );

    // The rows are gone (cascade); now the stored files they pointed at.
    const images = (media ?? [])
      .filter((row) => row.type === "image")
      .map((row) => row.storage_path!);
    const models = (media ?? [])
      .filter((row) => row.type === "glb")
      .map((row) => row.storage_path!);
    if (images.length) await supabase.storage.from("cars").remove(images);
    if (models.length) await supabase.storage.from("models-3d").remove(models);

    afterWrite(CACHE_TAGS.catalogue, CACHE_TAGS.prices);
    const title = `${vehicle.car_models.manufacturers.name} ${vehicle.car_models.name} ${vehicle.name}`;
    redirect(`/admin/vehicles?deleted=${encodeURIComponent(title)}`);
  });
}
