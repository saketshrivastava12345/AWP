import { cn } from "@/lib/utils";
import type { DriveType, FuelType } from "@/types/domain";
import { powertrainKind } from "@/types/domain";

/**
 * Animated flow diagram of how power reaches the road.
 *
 * The chain is chosen from `fuel_type`, so an electric car shows
 * Battery → Inverter → Motor → Wheels and never a fuel tank. Driven wheels are
 * highlighted from `drive_type`, so the diagram matches the actual car rather
 * than a generic illustration.
 *
 * Pure SVG + CSS: no client component, no JavaScript, and the dash animation
 * stops under the reduced-motion rule in globals.css.
 */

type Stage = { id: string; label: string; tone: "fuel" | "electric" | "mech" };

function stagesFor(fuelType: FuelType | null): Stage[] {
  switch (powertrainKind(fuelType)) {
    case "electric":
      return [
        { id: "battery", label: "Battery", tone: "electric" },
        { id: "inverter", label: "Inverter", tone: "electric" },
        { id: "motor", label: "Motor", tone: "electric" },
        { id: "wheels", label: "Wheels", tone: "mech" },
      ];
    case "hybrid":
      return [
        { id: "battery", label: "Battery", tone: "electric" },
        { id: "engine", label: "Engine", tone: "fuel" },
        { id: "hybrid", label: "Hybrid System", tone: "electric" },
        { id: "transmission", label: "Transmission", tone: "mech" },
        { id: "wheels", label: "Wheels", tone: "mech" },
      ];
    default:
      return [
        { id: "fuel", label: "Fuel", tone: "fuel" },
        { id: "engine", label: "Engine", tone: "fuel" },
        { id: "transmission", label: "Transmission", tone: "mech" },
        { id: "differential", label: "Differential", tone: "mech" },
        { id: "wheels", label: "Wheels", tone: "mech" },
      ];
  }
}

const TONE_CLASSES: Record<Stage["tone"], string> = {
  fuel: "border-gold-700 text-gold-300",
  electric: "border-signal-electric/45 text-signal-electric",
  mech: "border-line-strong text-ink-200",
};

/** Which corners receive drive, for the wheel diagram. */
function drivenWheels(drive: DriveType | null): { front: boolean; rear: boolean } {
  switch (drive) {
    case "fwd":
      return { front: true, rear: false };
    case "rwd":
      return { front: false, rear: true };
    case "awd":
    case "4wd":
      return { front: true, rear: true };
    default:
      return { front: false, rear: false };
  }
}

function WheelDiagram({ drive }: { drive: DriveType | null }) {
  const { front, rear } = drivenWheels(drive);
  const driven = "fill-gold-500";
  const idle = "fill-surface-4";

  return (
    <svg
      viewBox="0 0 80 110"
      className="h-24 w-auto"
      role="img"
      aria-label={`Driven wheels: ${drive ?? "unknown"}`}
    >
      {/* Car outline */}
      <rect
        x="22"
        y="8"
        width="36"
        height="94"
        rx="10"
        className="fill-surface-2 stroke-line"
        strokeWidth="1"
      />
      {/* Axles */}
      <line
        x1="12"
        y1="28"
        x2="68"
        y2="28"
        className="stroke-line-strong"
        strokeWidth="1"
      />
      <line
        x1="12"
        y1="82"
        x2="68"
        y2="82"
        className="stroke-line-strong"
        strokeWidth="1"
      />
      {/* Wheels */}
      {[
        { x: 8, y: 20, on: front },
        { x: 64, y: 20, on: front },
        { x: 8, y: 74, on: rear },
        { x: 64, y: 74, on: rear },
      ].map((wheel, index) => (
        <rect
          key={index}
          x={wheel.x}
          y={wheel.y}
          width="8"
          height="16"
          rx="3"
          className={wheel.on ? driven : idle}
        />
      ))}
    </svg>
  );
}

export function PowertrainVisualizer({
  fuelType,
  driveType,
  className,
}: {
  fuelType: FuelType | null;
  driveType: DriveType | null;
  className?: string;
}) {
  const stages = stagesFor(fuelType);

  return (
    <section
      id="powertrain"
      aria-labelledby="powertrain-heading"
      className={cn("scroll-mt-32 pt-14", className)}
    >
      <h2
        id="powertrain-heading"
        className="border-b border-line pb-4 font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
      >
        Powertrain Flow
      </h2>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-14">
        <ol className="flex flex-1 flex-wrap items-center gap-y-4">
          {stages.map((stage, index) => (
            <li key={stage.id} className="flex items-center">
              <span
                className={cn(
                  "rounded-xs border px-3 py-2 font-display text-[10px] tracking-[0.14em] uppercase",
                  TONE_CLASSES[stage.tone],
                )}
              >
                {stage.label}
              </span>

              {index < stages.length - 1 ? (
                <svg
                  width="34"
                  height="10"
                  viewBox="0 0 34 10"
                  aria-hidden="true"
                  className="mx-1 shrink-0"
                >
                  <line
                    x1="0"
                    y1="5"
                    x2="26"
                    y2="5"
                    className="stroke-line-strong"
                    strokeWidth="1"
                  />
                  {/* The moving dash is the "flow". strokeDashoffset animates
                      via CSS, so reduced motion stops it automatically. */}
                  <line
                    x1="0"
                    y1="5"
                    x2="26"
                    y2="5"
                    className="animate-flow stroke-gold-400"
                    strokeWidth="1.5"
                    strokeDasharray="4 10"
                  />
                  <path d="M26 1.5 L32 5 L26 8.5 Z" className="fill-line-strong" />
                </svg>
              ) : null}
            </li>
          ))}
        </ol>

        <div className="flex shrink-0 items-center gap-5">
          <WheelDiagram drive={driveType} />
          <div>
            <p className="text-label">Driven wheels</p>
            <p className="mt-2 font-mono text-xs text-ink-200">
              {driveType ? driveType.toUpperCase() : "Not available"}
            </p>
            <p className="mt-1 text-[11px] text-ink-600">Gold = driven</p>
          </div>
        </div>
      </div>
    </section>
  );
}
