"use server";

import type { TablesUpdate } from "@/types/database";
import { adminAction, dbFailed } from "../action-helpers";
import { CHECK_FIELDS, failed, succeeded, type ActionState } from "../action-state";
import { readMediaMeta, readModelMeta } from "../media-input";
import { afterWrite, CACHE_TAGS } from "../revalidate";

/**
 * Photograph and 3D-model records: edit provenance, choose the primary image
 * and delete. Uploads arrive through the upload route handler, because a
 * 50 MB model cannot travel through a server action's body limit.
 */

export async function updateMedia(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("media_id", "Media", { required: true });
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);
    const { data: media } = await supabase
      .from("car_media")
      .select("id, type")
      .eq("id", id)
      .maybeSingle();
    if (!media) return failed("That file no longer exists.", {}, values);

    const meta = readMediaMeta(reader, media.type);
    const model = media.type === "glb" ? readModelMeta(reader) : null;
    if (!reader.ok || !meta) return failed(CHECK_FIELDS, reader.errors, values);

    const update: TablesUpdate<"car_media"> = { ...meta, ...(model ?? {}) };
    const { data, error } = await supabase
      .from("car_media")
      .update(update)
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was saved.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Details saved.", values);
  });
}

/**
 * Makes one image the primary. The database allows one primary per vehicle
 * or model, so the current primary is cleared first; if setting the new one
 * then fails, the old primary is restored.
 */
export async function setPrimaryMedia(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("media_id", "Media", { required: true });
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);
    const { data: media } = await supabase
      .from("car_media")
      .select("id, type, variant_id, model_id, is_primary")
      .eq("id", id)
      .maybeSingle();
    if (!media) return failed("That image no longer exists.", {}, values);
    if (media.type !== "image")
      return failed("Only photographs can be primary.", {}, values);
    if (media.is_primary) return succeeded("Already the primary image.");

    const ownerColumn = media.variant_id ? "variant_id" : "model_id";
    const ownerId = (media.variant_id ?? media.model_id)!;
    const { data: previous } = await supabase
      .from("car_media")
      .select("id")
      .eq(ownerColumn, ownerId)
      .eq("is_primary", true);

    const cleared = await supabase
      .from("car_media")
      .update({ is_primary: false })
      .eq(ownerColumn, ownerId)
      .eq("is_primary", true);
    if (cleared.error) return dbFailed(cleared.error, values);

    const { error } = await supabase
      .from("car_media")
      .update({ is_primary: true })
      .eq("id", id);
    if (error) {
      for (const row of previous ?? []) {
        await supabase.from("car_media").update({ is_primary: true }).eq("id", row.id);
      }
      return dbFailed(error, values);
    }
    afterWrite(CACHE_TAGS.catalogue);
    return succeeded("Primary image changed.");
  });
}

/**
 * Deletes the record, then its stored file. In that order: a record whose file
 * is gone would show a broken image on the public site, while a file whose
 * record is gone is merely unused — and is reported so it can be removed.
 */
export async function deleteMedia(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return adminAction(formData, async ({ supabase, reader, values }) => {
    const id = reader.uuid("media_id", "Media", { required: true });
    if (!id) return failed(CHECK_FIELDS, reader.errors, values);
    const { data: media } = await supabase
      .from("car_media")
      .select("id, type, storage_path")
      .eq("id", id)
      .maybeSingle();
    if (!media) return failed("That file no longer exists.", {}, values);

    const { data, error } = await supabase
      .from("car_media")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) return dbFailed(error, values);
    if (!data?.length) return failed("Nothing was deleted.", {}, values);
    afterWrite(CACHE_TAGS.catalogue);

    if (media.storage_path) {
      const bucket = media.type === "glb" ? "models-3d" : "cars";
      const removed = await supabase.storage.from(bucket).remove([media.storage_path]);
      if (removed.error) {
        return succeeded(
          `Record deleted, but the stored file could not be removed (${removed.error.message}). Remove ${bucket}/${media.storage_path} from Storage.`,
        );
      }
      return succeeded(
        media.type === "glb"
          ? "3D model and its file deleted."
          : "Photograph and its file deleted.",
      );
    }
    return succeeded(
      "Record deleted. It pointed at a file in the repository, which is unchanged.",
    );
  });
}
