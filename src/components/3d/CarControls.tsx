"use client";

import type { ReactNode } from "react";
import {
  Boxes,
  Crosshair,
  Gauge,
  Maximize,
  Minimize,
  Move,
  Orbit,
  Palette,
  Rotate3d,
  RotateCcw,
  Ruler,
  ScanEye,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { Kbd } from "@/components/ui/Kbd";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/lib/utils";
import { LIGHTING, LIGHTING_IDS, type LightingId } from "@/lib/viewer-lighting";
import { PRESET_LABELS, type PresetId } from "@/lib/viewer-presets";
import {
  QUALITY_LABELS,
  QUALITY_SETTINGS,
  type QualityLevel,
  type QualitySetting,
} from "@/lib/viewer-quality";

/**
 * The viewer's controls. Every one is a real button with a name, a tooltip
 * and (for toggles) a pressed state, reachable by keyboard; nothing here
 * exists only as a gesture on the canvas. 44 px targets throughout.
 */

function ToolButton({
  label,
  hint,
  shortcut,
  pressed,
  disabled,
  onClick,
  children,
}: {
  label: string;
  /** Extra line in the tooltip, e.g. why the control is disabled. */
  hint?: string;
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip
      content={
        <span className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            {label}
            {shortcut ? <Kbd>{shortcut}</Kbd> : null}
          </span>
          {hint ? <span className="text-ink-400">{hint}</span> : null}
        </span>
      }
    >
      <IconButton
        label={label}
        pressed={pressed}
        onClick={disabled ? undefined : onClick}
        // Not the native `disabled`: an unavailable control stays focusable
        // so its tooltip can say why.
        aria-disabled={disabled || undefined}
        className={cn(
          "border border-transparent",
          pressed && "border-gold-600",
          disabled &&
            "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-ink-300",
        )}
      >
        {children}
      </IconButton>
    </Tooltip>
  );
}

function Divider() {
  return <span aria-hidden="true" className="mx-1 h-6 w-px bg-line max-sm:hidden" />;
}

export type ViewerToggles = {
  panMode: boolean;
  autoRotate: boolean;
  exploded: boolean;
  xray: boolean;
  hotspots: boolean;
  dimensions: boolean;
  hud: boolean;
};

export function CarControls({
  toggles,
  onToggle,
  onZoom,
  onReset,
  autoRotateBlocked,
  dimensionsAvailable,
  hudAvailable,
  fullscreen,
  onFullscreen,
  configOpen,
  onConfig,
}: {
  toggles: ViewerToggles;
  onToggle: (key: keyof ViewerToggles, value: boolean) => void;
  onZoom: (direction: 1 | -1) => void;
  onReset: () => void;
  /** Reduced motion is on: no turntable. */
  autoRotateBlocked: boolean;
  dimensionsAvailable: boolean;
  hudAvailable: boolean;
  fullscreen: boolean;
  onFullscreen: () => void;
  configOpen: boolean;
  onConfig: () => void;
}) {
  const dimensionsHint = !dimensionsAvailable
    ? "No dimensions are published for this car"
    : toggles.exploded
      ? "Close the exploded view to measure"
      : undefined;
  return (
    <div className="flex flex-wrap items-center gap-1 px-1.5 py-1.5">
      <div role="group" aria-label="Camera" className="flex flex-wrap items-center gap-1">
        <ToolButton
          label="Rotate"
          hint="Drag to orbit the car"
          pressed={!toggles.panMode}
          onClick={() => onToggle("panMode", false)}
        >
          <Rotate3d className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Pan"
          hint="Drag to move the view"
          pressed={toggles.panMode}
          onClick={() => onToggle("panMode", true)}
        >
          <Move className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Zoom out" shortcut="−" onClick={() => onZoom(-1)}>
          <ZoomOut className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Zoom in" shortcut="+" onClick={() => onZoom(1)}>
          <ZoomIn className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Reset view" shortcut="R" onClick={onReset}>
          <RotateCcw className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="360° turntable"
          hint={
            autoRotateBlocked ? "Off while reduced motion is on" : "Turn the car slowly"
          }
          pressed={toggles.autoRotate && !autoRotateBlocked}
          disabled={autoRotateBlocked}
          onClick={() =>
            !autoRotateBlocked && onToggle("autoRotate", !toggles.autoRotate)
          }
        >
          <Orbit className="size-[18px]" aria-hidden="true" />
        </ToolButton>
      </div>

      <Divider />

      <div
        role="group"
        aria-label="Display"
        className="flex flex-wrap items-center gap-1"
      >
        <ToolButton
          label="Explode"
          hint="Separate the car into its systems"
          pressed={toggles.exploded}
          onClick={() => onToggle("exploded", !toggles.exploded)}
        >
          <Boxes className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="X-ray"
          hint="See through the body to the powertrain"
          pressed={toggles.xray}
          onClick={() => onToggle("xray", !toggles.xray)}
        >
          <ScanEye className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Parts"
          hint="Show component markers"
          pressed={toggles.hotspots}
          onClick={() => onToggle("hotspots", !toggles.hotspots)}
        >
          <Crosshair className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="Dimensions"
          hint={dimensionsHint ?? "Published measurements"}
          pressed={toggles.dimensions && dimensionsAvailable && !toggles.exploded}
          disabled={!dimensionsAvailable || toggles.exploded}
          onClick={() =>
            dimensionsAvailable &&
            !toggles.exploded &&
            onToggle("dimensions", !toggles.dimensions)
          }
        >
          <Ruler className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label="HUD"
          hint={hudAvailable ? "Technical read-out" : "Camera read-out"}
          pressed={toggles.hud}
          onClick={() => onToggle("hud", !toggles.hud)}
        >
          <Gauge className="size-[18px]" aria-hidden="true" />
        </ToolButton>
      </div>

      <div className="ml-auto flex items-center gap-1">
        <ToolButton
          label="Configure"
          hint="Paint, wheels and brakes"
          pressed={configOpen}
          onClick={onConfig}
        >
          <Palette className="size-[18px]" aria-hidden="true" />
        </ToolButton>
        <ToolButton
          label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          shortcut="F"
          pressed={fullscreen}
          onClick={onFullscreen}
        >
          {fullscreen ? (
            <Minimize className="size-[18px]" aria-hidden="true" />
          ) : (
            <Maximize className="size-[18px]" aria-hidden="true" />
          )}
        </ToolButton>
      </div>
    </div>
  );
}

/** Camera presets, in toolbar order. */
export function PresetBar({
  presets,
  value,
  onChange,
}: {
  presets: PresetId[];
  value: PresetId;
  onChange: (id: PresetId) => void;
}) {
  return (
    <SegmentedControl
      label="Camera view"
      size="sm"
      value={value}
      onChange={onChange}
      options={presets.map((id) => ({ value: id, label: PRESET_LABELS[id] }))}
      className="max-w-full"
    />
  );
}

/** Lighting and quality: display settings, beside the presets or in the sheet. */
export function DisplaySettings({
  lighting,
  onLighting,
  quality,
  onQuality,
  effective,
  stacked = false,
}: {
  lighting: LightingId;
  onLighting: (id: LightingId) => void;
  quality: QualitySetting;
  onQuality: (setting: QualitySetting) => void;
  /** The level AUTO resolved to, shown beside it. */
  effective: QualityLevel;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-3",
        stacked && "flex-col items-stretch",
      )}
    >
      <div className={cn("flex gap-2.5", stacked ? "flex-col" : "items-center")}>
        <span className="text-hud">Light</span>
        <SegmentedControl
          label="Lighting"
          size="sm"
          // In the sheet the options wrap rather than scroll: a phone-width
          // panel cannot hold all four on one line.
          wrap={stacked}
          value={lighting}
          onChange={onLighting}
          options={LIGHTING_IDS.map((id) => ({
            value: id,
            label: LIGHTING[id].label,
            title: LIGHTING[id].description,
          }))}
        />
      </div>
      <div className={cn("flex gap-2.5", stacked ? "flex-col" : "items-center")}>
        <span className="text-hud">Quality</span>
        <SegmentedControl
          wrap={stacked}
          label={`Render quality${quality === "auto" ? `, automatic (currently ${QUALITY_LABELS[effective]})` : ""}`}
          size="sm"
          value={quality}
          onChange={onQuality}
          options={QUALITY_SETTINGS.map((setting) => ({
            value: setting,
            label:
              setting === "auto" && quality === "auto"
                ? `Auto · ${QUALITY_LABELS[effective]}`
                : QUALITY_LABELS[setting],
          }))}
        />
      </div>
    </div>
  );
}
