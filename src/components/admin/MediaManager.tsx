import { ExternalLink, Star } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import type { CarMedia } from "@/types/domain";
import { deleteMedia, setPrimaryMedia, updateMedia } from "@/lib/admin/actions/media";
import { formatBytes } from "@/lib/admin/files";
import { LICENCE_OPTIONS, SHOT_LABELS, SHOT_OPTIONS } from "@/lib/admin/labels";
import { localFileMissing } from "@/lib/admin/local-files";
import { formatDate } from "@/lib/format";
import { ConfirmAction, FormDialog, InlineAction } from "./ActionButtons";
import { Notice, Panel } from "./AdminChrome";
import { MediaUploadForm } from "./MediaUploadForm";
import { hostOf } from "./ProvenanceLine";
import { RadioQuestion, SelectField, TextField } from "./fields";
import { VehicleThumb } from "./VehicleThumb";

function licenceDefaults(license: string | null) {
  if (!license) return { choice: "", other: "" };
  return LICENCE_OPTIONS.some((option) => option.value === license)
    ? { choice: license, other: "" }
    : { choice: "other", other: license };
}

function MediaFields({ media }: { media: CarMedia }) {
  const licence = licenceDefaults(media.license);
  return (
    <>
      <input type="hidden" name="media_id" value={media.id} />
      {media.type === "glb" ? (
        <RadioQuestion
          name="is_exact_model"
          legend="Exact vehicle or representation?"
          defaultValue={
            media.is_exact_model === null ? null : String(media.is_exact_model)
          }
          options={[
            { value: "true", label: "The exact vehicle" },
            { value: "false", label: "A representation" },
          ]}
        />
      ) : null}
      <TextField name="alt" label="Alt text" required defaultValue={media.alt} />
      <div className="grid gap-4 sm:grid-cols-2">
        {media.type === "image" ? (
          <SelectField
            name="shot"
            label="Shot"
            placeholder="Not specified"
            defaultValue={media.shot}
            options={SHOT_OPTIONS}
          />
        ) : (
          <TextField
            name="model_version"
            label="Model version"
            defaultValue={media.model_version}
          />
        )}
        <TextField
          name="display_order"
          label="Display order"
          inputMode="numeric"
          mono
          defaultValue={media.display_order}
        />
        <TextField name="source" label="Source" required defaultValue={media.source} />
        <TextField
          name="source_url"
          label="Source URL"
          type="url"
          required
          defaultValue={media.source_url}
        />
        <SelectField
          name="license"
          label="Licence"
          required
          placeholder="Choose"
          defaultValue={licence.choice}
          options={LICENCE_OPTIONS}
        />
        <TextField
          name="license_other"
          label="Licence (when Other)"
          defaultValue={licence.other}
        />
        <TextField
          name="author"
          label="Author"
          required
          defaultValue={media.author}
          className="sm:col-span-2"
        />
      </div>
    </>
  );
}

function MissingProvenance({ media }: { media: CarMedia }) {
  const missing = [
    !media.source && "source",
    !media.source_url && "source URL",
    !media.license && "licence",
    !media.author && "author",
  ].filter(Boolean);
  if (missing.length === 0) return null;
  return <Badge tone="negative">Missing {missing.join(", ")}</Badge>;
}

/**
 * Photographs (and, for a vehicle, its 3D model) with their provenance,
 * the actions on each, and the upload forms. Server component.
 */
export function MediaManager({
  owner,
  ownerId,
  title,
  images,
  glb,
  publicPath,
}: {
  owner: "variant" | "model";
  ownerId: string;
  title: string;
  images: CarMedia[];
  glb: CarMedia | null;
  publicPath: string | null;
}) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="photographs">
        <h2 id="photographs" className="mb-1 text-h4">
          Photographs ({images.length})
        </h2>
        <p className="mb-4 text-xs text-ink-500">
          {owner === "model"
            ? "Model photographs are used for every variant that has none of its own."
            : "The primary image leads the gallery and the catalogue card."}
        </p>
        {images.length === 0 ? (
          <p className="rounded-card border border-dashed border-line px-5 py-8 text-sm text-ink-400">
            No photographs. The public card shows a labelled silhouette instead of a
            stand-in picture.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {images.map((media) => {
              const missing = localFileMissing(media.url);
              return (
                <li
                  key={media.id}
                  className="flex flex-col rounded-card border border-line-subtle bg-surface-1"
                >
                  <div className="flex gap-4 p-4">
                    <VehicleThumb url={media.url} missing={missing} size="md" />
                    <div className="min-w-0 flex-1 text-xs">
                      <div className="flex flex-wrap gap-1">
                        {media.is_primary ? (
                          <Badge>
                            <Star className="mr-1 size-2.5" aria-hidden="true" />
                            Primary
                          </Badge>
                        ) : null}
                        {media.shot ? <Badge>{SHOT_LABELS[media.shot]}</Badge> : null}
                        <MissingProvenance media={media} />
                      </div>
                      <p className="mt-2 line-clamp-2 text-sm text-ink-100">
                        {media.alt ?? "No alt text"}
                      </p>
                      <p className="mt-1 text-ink-500 tabular-nums">
                        {media.width && media.height
                          ? `${media.width} × ${media.height} px`
                          : "Size not recorded"}
                        {media.file_size_bytes
                          ? ` · ${formatBytes(media.file_size_bytes)}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-line-subtle px-4 py-3 text-xs">
                    <dt className="text-ink-500">Licence</dt>
                    <dd className="text-ink-200">{media.license ?? "—"}</dd>
                    <dt className="text-ink-500">Author</dt>
                    <dd className="truncate text-ink-200">{media.author ?? "—"}</dd>
                    <dt className="text-ink-500">Source</dt>
                    <dd className="truncate text-ink-200">
                      {media.source_url ? (
                        <a
                          href={media.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ink-50 underline-offset-4 hover:underline"
                        >
                          {media.source ?? hostOf(media.source_url)}
                          <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                      ) : (
                        (media.source ?? media.credit ?? "—")
                      )}
                    </dd>
                    <dt className="text-ink-500">File</dt>
                    <dd className="truncate font-mono text-ink-400" title={media.url}>
                      {media.storage_path ? `cars/${media.storage_path}` : media.url}
                      {missing ? (
                        <span className="ml-1 text-signal-negative">(missing)</span>
                      ) : null}
                    </dd>
                  </dl>
                  <div className="mt-auto flex flex-wrap gap-1 border-t border-line-subtle px-3 py-2">
                    {!media.is_primary ? (
                      <InlineAction
                        action={setPrimaryMedia}
                        fields={{ media_id: media.id }}
                        variant="ghost"
                        label={`Make primary: ${media.alt ?? "photograph"}`}
                      >
                        Make primary
                      </InlineAction>
                    ) : null}
                    <FormDialog
                      action={updateMedia}
                      trigger="Edit"
                      triggerLabel={`Edit ${media.alt ?? "photograph"}`}
                      title="Edit photograph"
                      size="lg"
                    >
                      <MediaFields media={media} />
                    </FormDialog>
                    <ConfirmAction
                      action={deleteMedia}
                      fields={{ media_id: media.id }}
                      trigger="Delete"
                      triggerVariant="ghost"
                      triggerLabel={`Delete ${media.alt ?? "photograph"}`}
                      title="Delete this photograph?"
                      description={
                        media.storage_path
                          ? "The record is deleted and the file is removed from storage."
                          : "The record is deleted. It points at a file in the repository, which is not changed."
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Panel title="Upload a photograph">
        <MediaUploadForm
          kind="image"
          owner={owner}
          ownerId={ownerId}
          defaultAlt={title}
          firstImage={images.length === 0}
        />
      </Panel>

      {owner === "variant" ? (
        <section aria-labelledby="model-3d" className="flex flex-col gap-4">
          <h2 id="model-3d" className="text-h4">
            3D model
          </h2>
          {glb ? (
            <div className="rounded-card border border-line-subtle bg-surface-1">
              <dl className="grid gap-x-6 gap-y-3 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-caption">Fidelity</dt>
                  <dd className="mt-1">
                    {glb.is_exact_model ? (
                      <Badge tone="gold">Exact vehicle</Badge>
                    ) : (
                      <Badge>Representation</Badge>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption">Size and format</dt>
                  <dd className="mt-1 font-mono text-ink-100">
                    {formatBytes(glb.file_size_bytes)} ·{" "}
                    {(glb.model_format ?? "glb").toUpperCase()}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption">Compression</dt>
                  <dd className="mt-1 font-mono text-ink-100">
                    {glb.compression.length ? glb.compression.join(", ") : "None"}
                  </dd>
                </div>
                <div>
                  <dt className="text-caption">Version</dt>
                  <dd className="mt-1 text-ink-100">{glb.model_version ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption">Credit</dt>
                  <dd className="mt-1 text-ink-200">
                    {glb.credit ?? "—"} <MissingProvenance media={glb} />
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-caption">Updated</dt>
                  <dd className="mt-1 text-ink-200">{formatDate(glb.updated_at)}</dd>
                </div>
              </dl>
              <div className="flex flex-wrap gap-1 border-t border-line-subtle px-3 py-2">
                {publicPath ? (
                  <ButtonLink
                    href={publicPath}
                    target="_blank"
                    rel="noopener"
                    variant="ghost"
                    size="sm"
                  >
                    Preview on the car page
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </ButtonLink>
                ) : null}
                <FormDialog
                  action={updateMedia}
                  trigger="Edit"
                  title="Edit 3D model"
                  size="lg"
                >
                  <MediaFields media={glb} />
                </FormDialog>
                <ConfirmAction
                  action={deleteMedia}
                  fields={{ media_id: glb.id }}
                  trigger="Delete"
                  triggerVariant="ghost"
                  title="Delete this 3D model?"
                  description="The vehicle page falls back to the procedural model built from its dimensions."
                />
              </div>
            </div>
          ) : (
            <Notice>
              No 3D model. The vehicle page builds a procedural model from the published
              dimensions and labels it as such.
            </Notice>
          )}
          {!publicPath && glb ? (
            <p className="text-xs text-ink-500">
              This vehicle is a draft, so there is no public page to preview yet.
            </p>
          ) : null}
          <Panel title={glb ? "Replace the 3D model" : "Upload a 3D model"}>
            <MediaUploadForm
              kind="glb"
              owner="variant"
              ownerId={ownerId}
              defaultAlt={`3D model of the ${title}`}
              hasExisting={Boolean(glb)}
            />
          </Panel>
        </section>
      ) : null}
    </div>
  );
}
