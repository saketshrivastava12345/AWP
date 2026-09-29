"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, CircleCheck, FileUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Progress } from "@/components/ui/Progress";
import { useToast } from "@/components/ui/Toast";
import { IDLE_STATE, type ActionState } from "@/lib/admin/action-state";
import {
  GLB_MAX_BYTES,
  IMAGE_MAX_BYTES,
  formatBytes,
  inspectGlb,
  inspectImage,
  type GlbInfo,
  type ImageInfo,
} from "@/lib/admin/files";
import { LICENCE_OPTIONS, SHOT_OPTIONS } from "@/lib/admin/labels";
import { uploadEndpoint, type UploadResult } from "@/lib/admin/upload-result";
import { cn } from "@/lib/utils";
import { FormStateProvider } from "./ActionForm";
import { CheckboxField, FieldSet, RadioQuestion, SelectField, TextField } from "./fields";

type Inspected =
  | { status: "none" }
  | { status: "reading" }
  | { status: "error"; message: string }
  | { status: "ok"; size: number; image?: ImageInfo; glb?: GlbInfo };

/**
 * Upload a photograph or a GLB model with its provenance.
 *
 * The file is inspected in the browser first (the same parsers the server
 * runs) so a wrong file is caught before it is sent; the server then checks
 * everything again. Sent with XMLHttpRequest for a real progress bar — a 3D
 * model can be 50 MB.
 */
export function MediaUploadForm({
  kind,
  owner,
  ownerId,
  defaultAlt,
  hasExisting = false,
  firstImage = false,
}: {
  kind: "image" | "glb";
  owner: "variant" | "model";
  ownerId: string;
  defaultAlt: string;
  /** A GLB already exists: uploading replaces it (after confirmation). */
  hasExisting?: boolean;
  /** No image yet: the upload becomes primary by default. */
  firstImage?: boolean;
}) {
  const router = useRouter();
  const push = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const [inspected, setInspected] = useState<Inspected>({ status: "none" });
  const [preview, setPreview] = useState<string | null>(null);
  const [licence, setLicence] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [state, setState] = useState<ActionState>(IDLE_STATE);
  const [formKey, setFormKey] = useState(0);
  const limit = kind === "glb" ? GLB_MAX_BYTES : IMAGE_MAX_BYTES;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const onFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    setPreview(null);
    if (!file) {
      setInspected({ status: "none" });
      return;
    }
    if (file.size > limit) {
      setInspected({
        status: "error",
        message: `The file is ${formatBytes(file.size)}; the limit is ${formatBytes(limit)}.`,
      });
      return;
    }
    setInspected({ status: "reading" });
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (kind === "glb") {
      const result = inspectGlb(bytes);
      setInspected(
        result.ok
          ? { status: "ok", size: file.size, glb: result.value }
          : { status: "error", message: result.error },
      );
    } else {
      const result = inspectImage(bytes);
      if (result.ok) {
        setInspected({ status: "ok", size: file.size, image: result.value });
        setPreview(URL.createObjectURL(file));
      } else {
        setInspected({ status: "error", message: result.error });
      }
    }
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("file");
    if (!(file instanceof File) || file.size === 0) {
      setState({
        ...IDLE_STATE,
        status: "error",
        message: "Choose a file first.",
        fieldErrors: { file: "Choose a file." },
        at: Date.now(),
      });
      return;
    }
    if (inspected.status === "error") {
      setState({
        ...IDLE_STATE,
        status: "error",
        message: inspected.message,
        fieldErrors: { file: inspected.message },
        at: Date.now(),
      });
      return;
    }

    const request = new XMLHttpRequest();
    request.open("POST", uploadEndpoint(kind, file.name));
    request.responseType = "json";
    request.upload.onprogress = (progressEvent) => {
      if (progressEvent.lengthComputable)
        setProgress(progressEvent.loaded / progressEvent.total);
    };
    request.onerror = () => {
      setProgress(null);
      setState({
        ...IDLE_STATE,
        status: "error",
        message: "The upload failed: the connection was interrupted.",
        at: Date.now(),
      });
    };
    request.onload = () => {
      setProgress(null);
      const result = request.response as UploadResult | null;
      if (result?.ok) {
        push({ title: result.message, tone: "success" });
        setState({
          ...IDLE_STATE,
          status: "success",
          message: result.message,
          at: Date.now(),
        });
        setInspected({ status: "none" });
        setPreview(null);
        setLicence("");
        setFormKey((key) => key + 1);
        router.refresh();
      } else {
        const message =
          result?.message ??
          (request.status === 404
            ? "Not authorised. Sign in again."
            : `Upload failed (${request.status}).`);
        push({ title: message, tone: "error" });
        setState({
          ...IDLE_STATE,
          status: "error",
          message,
          fieldErrors: result && !result.ok ? result.fieldErrors : {},
          at: Date.now(),
        });
      }
    };
    setProgress(0);
    setState(IDLE_STATE);
    request.send(data);
  };

  const pending = progress !== null;

  return (
    <FormStateProvider state={state} pending={pending}>
      <form
        key={formKey}
        ref={formRef}
        onSubmit={onSubmit}
        noValidate
        aria-label={kind === "glb" ? "Upload a 3D model" : "Upload a photograph"}
        className="flex flex-col gap-6"
      >
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="owner" value={owner} />
        <input type="hidden" name="owner_id" value={ownerId} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <label
            className={cn(
              "flex min-h-28 flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-5 text-center transition-colors",
              "border-line-strong focus-within:border-gold-500 hover:border-gold-600",
              state.fieldErrors.file && "border-signal-negative/70",
            )}
          >
            <FileUp className="size-5 text-ink-400" aria-hidden="true" />
            <span className="text-sm text-ink-100">
              {kind === "glb" ? "Choose a .glb file" : "Choose a photograph"}
            </span>
            <span className="text-xs text-ink-500">
              {kind === "glb"
                ? `Binary glTF 2.0, up to ${formatBytes(limit)}. Draco, KTX2 and meshopt are detected.`
                : `JPEG, PNG, WebP or AVIF, up to ${formatBytes(limit)}. Checked by content, not by name.`}
            </span>
            <input
              type="file"
              name="file"
              accept={
                kind === "glb"
                  ? ".glb,model/gltf-binary"
                  : "image/jpeg,image/png,image/webp,image/avif"
              }
              onChange={onFile}
              className="sr-only"
              aria-describedby="upload-file-status"
            />
          </label>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- a local object URL preview; next/image cannot load blob: URLs
            <img
              src={preview}
              alt="Preview of the chosen photograph"
              className="h-28 w-44 rounded-md border border-line object-cover"
            />
          ) : null}
        </div>
        <div id="upload-file-status" aria-live="polite" className="-mt-3 text-xs">
          {inspected.status === "reading" ? (
            <p className="text-ink-400">Reading the file…</p>
          ) : null}
          {inspected.status === "error" ? (
            <p className="flex items-center gap-1.5 text-signal-negative">
              <CircleAlert className="size-3.5" aria-hidden="true" />
              {inspected.message}
            </p>
          ) : null}
          {inspected.status === "ok" ? (
            <p className="flex items-center gap-1.5 text-signal-positive">
              <CircleCheck className="size-3.5" aria-hidden="true" />
              {inspected.image
                ? `${inspected.image.mime.replace("image/", "").toUpperCase()} · ${inspected.image.width} × ${inspected.image.height} px · ${formatBytes(inspected.size)}`
                : inspected.glb
                  ? `glTF ${inspected.glb.assetVersion} · ${formatBytes(inspected.size)} · ${inspected.glb.meshCount} mesh${inspected.glb.meshCount === 1 ? "" : "es"} · compression: ${inspected.glb.compression.length ? inspected.glb.compression.join(", ") : "none"}`
                  : null}
            </p>
          ) : null}
          {state.fieldErrors.file && inspected.status !== "error" ? (
            <p role="alert" className="text-signal-negative">
              {state.fieldErrors.file}
            </p>
          ) : null}
        </div>

        {kind === "glb" ? (
          <RadioQuestion
            name="is_exact_model"
            legend="Is this the exact vehicle (this generation and variant), or a representation?"
            hint="The public viewer states this next to the model. There is no default: answer it."
            options={[
              {
                value: "true",
                label: "The exact vehicle",
                description: "Modelled from this generation and variant.",
              },
              {
                value: "false",
                label: "A representation",
                description: "A similar car, a generic body or an earlier generation.",
              },
            ]}
          />
        ) : null}

        <FieldSet legend="Description" columns={kind === "image" ? 3 : 2}>
          <TextField
            name="alt"
            label="Alt text"
            required
            defaultValue={defaultAlt}
            hint="What the image shows, for people who cannot see it."
            className={kind === "image" ? "sm:col-span-2" : ""}
          />
          {kind === "image" ? (
            <SelectField
              name="shot"
              label="Shot"
              placeholder="Not specified"
              options={SHOT_OPTIONS}
            />
          ) : (
            <TextField
              name="model_version"
              label="Model version"
              hint="Optional, e.g. “v2 — lower-poly”."
            />
          )}
          <TextField
            name="display_order"
            label="Display order"
            inputMode="numeric"
            mono
            defaultValue="0"
          />
          {kind === "image" ? (
            <CheckboxField
              name="is_primary"
              label="Make this the primary image"
              defaultChecked={firstImage}
              className="self-end sm:col-span-2"
            />
          ) : null}
        </FieldSet>

        <FieldSet
          legend="Provenance"
          description="All four are required: where the file came from, the page it came from, its licence and who made it."
        >
          <TextField
            name="source"
            label="Source"
            required
            placeholder="e.g. Wikimedia Commons, Porsche Newsroom"
          />
          <TextField
            name="source_url"
            label="Source URL"
            type="url"
            required
            placeholder="https://"
          />
          <SelectField
            name="license"
            label="Licence"
            required
            value={licence}
            onChange={setLicence}
            placeholder="Choose a licence"
            options={LICENCE_OPTIONS}
          />
          {licence === "other" ? (
            <TextField name="license_other" label="Licence (other)" required />
          ) : null}
          <TextField
            name="author"
            label={kind === "glb" ? "Author (credit)" : "Author / photographer"}
            required
          />
        </FieldSet>

        {kind === "glb" && hasExisting ? (
          <CheckboxField
            name="replace"
            label="Replace the current model"
            hint="A vehicle has at most one 3D model. The current file is deleted once the new one is stored."
          />
        ) : null}

        <div className="flex flex-col gap-3 border-t border-line pt-5">
          {progress !== null ? (
            <Progress value={progress * 100} label="Uploading" />
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={pending}>
              {kind === "glb"
                ? hasExisting
                  ? "Upload replacement"
                  : "Upload model"
                : "Upload photograph"}
            </Button>
            <div aria-live="polite" className="text-sm">
              {state.status === "error" && state.message ? (
                <span className="text-signal-negative">{state.message}</span>
              ) : state.status === "success" && state.message ? (
                <span className="text-signal-positive">{state.message}</span>
              ) : null}
            </div>
          </div>
        </div>
      </form>
    </FormStateProvider>
  );
}
