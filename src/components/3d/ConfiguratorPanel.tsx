"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { ExternalLink, RotateCcw } from "lucide-react";
import type { CarColor } from "@/types/domain";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import {
  CALIPER_COLORS,
  DISC_LABELS,
  DISC_TYPES,
  FINISH_LABELS,
  STUDIO_COLORS,
  STUDIO_FINISHES,
  WHEEL_FINISHES,
  WHEEL_FINISH_LABELS,
  WHEEL_STYLES,
  WHEEL_STYLE_LABELS,
  catalogueSwatches,
  finishFromCatalogue,
  normaliseHex,
  resolvePaint,
  type FinishId,
  type ViewerConfig,
} from "@/lib/viewer-paint";

/**
 * Paint, wheels and brakes for the 3D car.
 *
 * Catalogued colours (with their source) come first; otherwise the AURIX
 * studio finishes are offered and labelled for what they are — visualisation
 * colours, not manufacturer paint names. For a real (GLB) model only the paint
 * can change, and only on materials the model marks as paint; its wheels and
 * calipers are shown as modelled rather than faked.
 */

type Swatch = {
  value: string;
  name: string;
  hex: string;
  tooltip: ReactNode;
};

/** A radio group of colour swatches: one tab stop, arrow keys to move. */
function SwatchGroup({
  label,
  swatches,
  value,
  onChange,
  disabled = false,
}: {
  label: string;
  swatches: Swatch[];
  value: string | null;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = swatches.findIndex((swatch) => swatch.value === value);

  const move = (event: KeyboardEvent, index: number) => {
    let next = -1;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = swatches.length - 1;
    else return;
    event.preventDefault();
    const target = (next + swatches.length) % swatches.length;
    const swatch = swatches[target];
    if (!swatch) return;
    onChange(swatch.value);
    refs.current[target]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled || undefined}
      className="flex flex-wrap gap-1.5"
    >
      {swatches.map((swatch, index) => {
        const checked = swatch.value === value;
        return (
          <Tooltip key={swatch.value} content={swatch.tooltip}>
            <button
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={swatch.name}
              tabIndex={checked || (selected === -1 && index === 0) ? 0 : -1}
              disabled={disabled}
              onClick={() => onChange(swatch.value)}
              onKeyDown={(event) => move(event, index)}
              className={cn(
                "grid size-11 place-items-center rounded-full transition-[box-shadow] duration-(--duration-fast) disabled:cursor-not-allowed disabled:opacity-40 sm:size-10",
                checked
                  ? "shadow-[0_0_0_1px_var(--color-gold-400)]"
                  : "hover:shadow-[0_0_0_1px_var(--color-line-strong)]",
              )}
            >
              <span
                aria-hidden="true"
                className="size-7 rounded-full border border-line-strong"
                style={{
                  background: `radial-gradient(circle at 32% 28%, rgb(255 255 255 / 0.5), transparent 46%), ${swatch.hex}`,
                }}
              />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}

function Section({
  title,
  children,
  note,
}: {
  title: string;
  children: ReactNode;
  note?: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h3 className="text-hud text-ink-200">{title}</h3>
      {children}
      {note ? <p className="text-xs leading-relaxed text-ink-400">{note}</p> : null}
    </section>
  );
}

export function ConfiguratorPanel({
  colors,
  config,
  onChange,
  onReset,
  model,
  paintable,
  carbonCeramic,
  display,
}: {
  colors: CarColor[];
  config: ViewerConfig;
  onChange: (config: ViewerConfig) => void;
  onReset: () => void;
  /** What is on screen: the procedural representation or a real model. */
  model: "procedural" | "glb";
  /** The real model has paintable materials. */
  paintable: boolean;
  carbonCeramic: boolean;
  /** Lighting and quality, shown here on small screens. */
  display?: ReactNode;
}) {
  const catalogued = catalogueSwatches(colors);
  const paint = resolvePaint(config.paint, colors);
  const paintLocked = model === "glb" && !paintable;
  const hardwareLocked = model === "glb";

  const catalogueSwatchList: Swatch[] = catalogued.map((color) => ({
    value: `catalogue:${color.id}`,
    name: `${color.name}, ${FINISH_LABELS[finishFromCatalogue(color.finish)].toLowerCase()}`,
    hex: normaliseHex(color.hex) ?? "#888888",
    tooltip: (
      <span className="flex flex-col gap-0.5">
        <span className="text-ink-50">{color.name}</span>
        <span>{FINISH_LABELS[finishFromCatalogue(color.finish)]}</span>
        <span className="text-ink-400">Source: {color.source}</span>
      </span>
    ),
  }));
  const studioSwatchList: Swatch[] = STUDIO_COLORS.map((color) => ({
    value: `studio:${color.id}`,
    name: `${color.name} (studio visualisation colour)`,
    hex: color.hex,
    tooltip: (
      <span className="flex flex-col gap-0.5">
        <span className="text-ink-50">{color.name}</span>
        <span className="text-ink-400">
          AURIX studio finish — not a manufacturer paint
        </span>
      </span>
    ),
  }));

  const paintValue =
    config.paint.source === "catalogue"
      ? `catalogue:${config.paint.id}`
      : `studio:${config.paint.id}`;
  const choosePaint = (value: string) => {
    const [source, id = ""] = value.split(":");
    if (source === "catalogue")
      onChange({ ...config, paint: { source: "catalogue", id } });
    else {
      const studio = STUDIO_COLORS.find((color) => color.id === id);
      if (!studio) return;
      const finish: FinishId =
        config.paint.source === "studio" ? config.paint.finish : studio.finish;
      onChange({ ...config, paint: { source: "studio", id: studio.id, finish } });
    }
  };

  return (
    <div className="space-y-7">
      <Section
        title="Paint"
        note={
          paintLocked
            ? "This model has no material marked as paint, so its colour is shown as modelled."
            : undefined
        }
      >
        {catalogued.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs text-ink-300">Catalogued colours</p>
            <SwatchGroup
              label="Catalogued colours"
              swatches={catalogueSwatchList}
              value={paintValue}
              onChange={choosePaint}
              disabled={paintLocked}
            />
            {paint.source === "catalogue" && paint.color ? (
              <p className="text-xs text-ink-400">
                {paint.name} · {FINISH_LABELS[paint.finish]} · Source:{" "}
                {paint.color.source_url ? (
                  <a
                    href={paint.color.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-ink-200 underline decoration-line-strong underline-offset-2 hover:text-gold-300"
                  >
                    {paint.color.source}
                    <ExternalLink className="size-3" aria-hidden="true" />
                  </a>
                ) : (
                  paint.color.source
                )}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs text-ink-300">
            AURIX studio finishes{" "}
            <span className="text-ink-400">
              — visualisation colours, not manufacturer paint names
            </span>
          </p>
          <SwatchGroup
            label="Studio finishes"
            swatches={studioSwatchList}
            value={paintValue}
            onChange={choosePaint}
            disabled={paintLocked}
          />
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className="text-hud">Finish</span>
            {config.paint.source === "studio" ? (
              <SegmentedControl
                label="Finish"
                size="sm"
                value={config.paint.finish}
                onChange={(finish) =>
                  config.paint.source === "studio" &&
                  onChange({ ...config, paint: { ...config.paint, finish } })
                }
                options={STUDIO_FINISHES.map((finish) => ({
                  value: finish,
                  label: FINISH_LABELS[finish],
                  disabled: paintLocked,
                }))}
              />
            ) : (
              <span className="text-xs text-ink-400">
                {FINISH_LABELS[paint.finish]}, as catalogued
              </span>
            )}
          </div>
        </div>
      </Section>

      <Section
        title="Wheels"
        note={hardwareLocked ? "Configuration unavailable for this model." : undefined}
      >
        {hardwareLocked ? null : (
          <div className="flex flex-col gap-3">
            <SegmentedControl
              label="Wheel style"
              size="sm"
              wrap
              value={config.wheelStyle}
              onChange={(wheelStyle) => onChange({ ...config, wheelStyle })}
              options={WHEEL_STYLES.map((style) => ({
                value: style,
                label: WHEEL_STYLE_LABELS[style],
              }))}
            />
            <SegmentedControl
              label="Wheel finish"
              size="sm"
              value={config.wheelFinish}
              onChange={(wheelFinish) => onChange({ ...config, wheelFinish })}
              options={WHEEL_FINISHES.map((finish) => ({
                value: finish,
                label: WHEEL_FINISH_LABELS[finish],
              }))}
            />
          </div>
        )}
      </Section>

      <Section
        title="Brakes"
        note={
          hardwareLocked
            ? "Configuration unavailable for this model."
            : carbonCeramic
              ? "This variant catalogues carbon-ceramic discs."
              : undefined
        }
      >
        {hardwareLocked ? null : (
          <div className="flex flex-col gap-3">
            <div className="space-y-2">
              <p className="text-xs text-ink-300">Caliper colour</p>
              <SwatchGroup
                label="Caliper colour"
                swatches={CALIPER_COLORS.map((color) => ({
                  value: color.id,
                  name: `${color.name} calipers`,
                  hex: color.hex,
                  tooltip: color.name,
                }))}
                value={config.caliper}
                onChange={(caliper) => {
                  const match = CALIPER_COLORS.find((color) => color.id === caliper);
                  if (match) onChange({ ...config, caliper: match.id });
                }}
              />
            </div>
            <SegmentedControl
              label="Disc"
              size="sm"
              value={config.disc}
              onChange={(disc) => onChange({ ...config, disc })}
              options={DISC_TYPES.map((disc) => ({
                value: disc,
                label: DISC_LABELS[disc],
              }))}
            />
          </div>
        )}
      </Section>

      {display ? <Section title="Display">{display}</Section> : null}

      <button
        type="button"
        onClick={onReset}
        className="flex min-h-11 items-center gap-2 text-xs text-ink-400 transition-colors hover:text-gold-300"
      >
        <RotateCcw className="size-3.5" aria-hidden="true" />
        Restore this car&apos;s defaults
      </button>
    </div>
  );
}
