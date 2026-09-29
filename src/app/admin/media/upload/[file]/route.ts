import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import type { TablesInsert } from "@/types/database";
import { requireAdmin, type AdminSupabase } from "@/lib/admin/auth";
import { describeDbError, describeStorageError } from "@/lib/admin/errors";
import {
  GLB_MAX_BYTES,
  IMAGE_MAX_BYTES,
  formatBytes,
  inspectGlb,
  inspectImage,
} from "@/lib/admin/files";
import { readMediaMeta, readModelMeta } from "@/lib/admin/media-input";
import { FieldReader } from "@/lib/admin/validation";
import { CACHE_TAGS } from "@/lib/cache-tags";
import type { UploadResult } from "@/lib/admin/upload-result";

/**
 * POST /admin/media/upload/<name>.<ext> — uploads a photograph or a GLB.
 *
 * A route handler rather than a server action: server actions cap request
 * bodies at 1 MB, and a 3D model may be 50 MB. The URL deliberately ends in
 * the file's extension, which the proxy matcher (src/proxy.ts) skips like any
 * other asset path, so the body is streamed here untouched instead of being
 * buffered — and truncated at 10 MB — for the session-refresh proxy.
 *
 * Security is the same as every admin write: the session and admin role are
 * re-checked here, the request must come from this origin, and the file goes
 * to Storage through the admin's own cookie client, so the storage.objects
 * RLS policies (is_admin()) authorise the upload a second time. The bytes are
 * inspected (magic numbers, dimensions, glTF header) — the declared type and
 * the file name are never trusted.
 */

const notFound = () =>
  NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

function reply(result: UploadResult, status = 200) {
  return NextResponse.json(result, { status, headers: { "Cache-Control": "no-store" } });
}

function refused(
  message: string,
  fieldErrors: Record<string, string> = {},
  status = 422,
) {
  return reply({ ok: false, message, fieldErrors }, status);
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") === "same-origin";
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

type Owner = {
  column: "variant_id" | "model_id";
  id: string;
  folder: "variants" | "models";
};

async function ownerExists(supabase: AdminSupabase, owner: Owner): Promise<boolean> {
  const { data } =
    owner.column === "variant_id"
      ? await supabase.from("car_variants").select("id").eq("id", owner.id).maybeSingle()
      : await supabase.from("car_models").select("id").eq("id", owner.id).maybeSingle();
  return Boolean(data);
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return notFound();
  const admin = await requireAdmin();
  // Identical to a missing route for anyone who is not an admin.
  if (!admin) return notFound();
  const { supabase } = admin;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return refused(
      "The upload was interrupted or is not a valid form. Try again.",
      {},
      400,
    );
  }

  const reader = FieldReader.fromFormData(form);
  const kind = reader.raw("kind") === "glb" ? "glb" : "image";
  const ownerKind = reader.raw("owner") === "model" ? "model" : "variant";
  const ownerId = reader.uuid("owner_id", "Owner", { required: true });
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    reader.fail("file", kind === "glb" ? "Choose a .glb file." : "Choose a photograph.");
  }
  const limit = kind === "glb" ? GLB_MAX_BYTES : IMAGE_MAX_BYTES;
  if (file instanceof File && file.size > limit) {
    reader.fail(
      "file",
      `The file is ${formatBytes(file.size)}; the limit is ${formatBytes(limit)}.`,
    );
  }
  if (kind === "glb" && ownerKind === "model") {
    return refused("3D models are attached to a vehicle (variant), not to a model.");
  }

  const meta = readMediaMeta(reader, kind);
  const modelMeta = kind === "glb" ? readModelMeta(reader) : null;
  const makePrimary = kind === "image" && reader.boolean("is_primary");
  const replace = reader.boolean("replace");
  if (!reader.ok || !meta || !ownerId || !(file instanceof File)) {
    return refused("Some fields need attention.", reader.errors);
  }
  if (kind === "glb" && !modelMeta)
    return refused("Some fields need attention.", reader.errors);

  const owner: Owner =
    ownerKind === "model"
      ? { column: "model_id", id: ownerId, folder: "models" }
      : { column: "variant_id", id: ownerId, folder: "variants" };
  if (!(await ownerExists(supabase, owner))) {
    return refused("That vehicle or model no longer exists.", {}, 404);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  // A proxy or network hiccup can deliver fewer bytes than were declared.
  if (bytes.length !== file.size) {
    return refused(
      "The upload arrived incomplete. Try again.",
      { file: "Incomplete upload." },
      400,
    );
  }

  const inspected = kind === "glb" ? inspectGlb(bytes) : inspectImage(bytes);
  if (!inspected.ok) return refused(inspected.error, { file: inspected.error });

  const bucket = kind === "glb" ? "models-3d" : "cars";
  const ext =
    kind === "glb" ? "glb" : "ext" in inspected.value ? inspected.value.ext : "bin";
  const contentType =
    kind === "glb"
      ? "model/gltf-binary"
      : "mime" in inspected.value
        ? inspected.value.mime
        : "";
  const path = `${owner.folder}/${owner.id}/${randomUUID()}.${ext}`;

  // One GLB per variant (unique index): replacing is an explicit choice.
  let existingGlb: TablesInsert<"car_media"> | null = null;
  if (kind === "glb") {
    const { data } = await supabase
      .from("car_media")
      .select("*")
      .eq("variant_id", owner.id)
      .eq("type", "glb")
      .maybeSingle();
    if (data && !replace) {
      return refused(
        "This vehicle already has a 3D model. Tick “Replace the current model” to swap it.",
        {
          replace: "Confirm the replacement.",
        },
        409,
      );
    }
    existingGlb = data;
  }

  const upload = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    upsert: false,
    cacheControl: "31536000",
  });
  if (upload.error) {
    console.error("[admin] storage upload failed", upload.error);
    return refused(`${describeStorageError(upload.error)} Nothing was saved.`, {}, 502);
  }
  const url = supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  const removeUploaded = () => supabase.storage.from(bucket).remove([path]);

  let row: TablesInsert<"car_media">;
  const base = {
    variant_id: owner.column === "variant_id" ? owner.id : null,
    model_id: owner.column === "model_id" ? owner.id : null,
    url,
    alt: meta.alt,
    credit: meta.credit,
    source: meta.source,
    source_url: meta.source_url,
    license: meta.license,
    author: meta.author,
    display_order: meta.display_order,
    storage_path: path,
    file_size_bytes: bytes.length,
  };

  const clearedPrimaries: string[] = [];
  if (kind === "image" && "width" in inspected.value) {
    row = {
      ...base,
      type: "image",
      shot: meta.shot,
      width: inspected.value.width,
      height: inspected.value.height,
      is_primary: makePrimary,
    };
    if (makePrimary) {
      // One primary per owner (unique index): clear the current one first.
      const { data: previous } = await supabase
        .from("car_media")
        .update({ is_primary: false })
        .eq(owner.column, owner.id)
        .eq("is_primary", true)
        .select("id");
      clearedPrimaries.push(...(previous ?? []).map((entry) => entry.id));
    }
  } else if (kind === "glb" && "compression" in inspected.value && modelMeta) {
    row = {
      ...base,
      type: "glb",
      model_format: "glb",
      compression: inspected.value.compression,
      is_exact_model: modelMeta.is_exact_model,
      model_version: modelMeta.model_version,
    };
    if (existingGlb?.id) {
      const { error } = await supabase
        .from("car_media")
        .delete()
        .eq("id", existingGlb.id);
      if (error) {
        await removeUploaded();
        return refused(describeDbError(error), {}, 409);
      }
    }
  } else {
    await removeUploaded();
    return refused("Unexpected file type.");
  }

  const { data: inserted, error } = await supabase
    .from("car_media")
    .insert(row)
    .select("id")
    .single();
  if (error || !inserted) {
    // Put everything back the way it was.
    for (const id of clearedPrimaries) {
      await supabase.from("car_media").update({ is_primary: true }).eq("id", id);
    }
    if (existingGlb) await supabase.from("car_media").insert(existingGlb);
    await removeUploaded();
    return refused(describeDbError(error), {}, 409);
  }

  let note = "";
  if (existingGlb?.storage_path) {
    const removed = await supabase.storage
      .from(bucket)
      .remove([existingGlb.storage_path]);
    if (removed.error)
      note = ` The previous file could not be removed from Storage (${existingGlb.storage_path}).`;
  }

  revalidateTag(CACHE_TAGS.catalogue, { expire: 0 });

  const details =
    kind === "glb" && "compression" in inspected.value
      ? `${formatBytes(bytes.length)} · ${
          inspected.value.compression.length
            ? inspected.value.compression.join(", ")
            : "no compression"
        }`
      : "width" in inspected.value
        ? `${inspected.value.width} × ${inspected.value.height} px · ${formatBytes(bytes.length)}`
        : formatBytes(bytes.length);
  return reply({
    ok: true,
    message: `${kind === "glb" ? (existingGlb ? "3D model replaced" : "3D model uploaded") : "Photograph uploaded"} (${details}).${note}`,
    mediaId: inserted.id,
    url,
  });
}
