import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";
import type { DriveType, FuelType } from "@/types/domain";
import { powertrainKind } from "@/types/domain";
import { Reveal } from "@/components/fx/Reveal";
import { DetailHeading } from "@/components/cars/detail/DetailHeading";

const DRIVE_LABELS: Record<DriveType | "none", string> = {
  fwd: "Front-wheel drive",
  rwd: "Rear-wheel drive",
  awd: "All-wheel drive",
  "4wd": "Four-wheel drive",
  none: "Driven wheels not recorded",
};

/**
 * Animated flow diagram of how power reaches the road.
 *
 * The chain is chosen from `fuel_type`, so an electric car shows
 * Battery → Inverter → Motor → Wheels and never a fuel tank. Driven wheels are
 * highlighted from `drive_type`, so the diagram matches the actual car rather
 * than a generic illustration.
 *
 * Pure SVG + CSS: no client component, no JavaScript. Energy runs along the
 * links as a dashed glow (`animate-flow`), which the reduced-motion rule in
 * globals.css stops.
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
        { id: "hybrid", label: "Hybrid system", tone: "electric" },
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

/** Each tone is a node colour: fuel gold, electric cyan, mechanical white. */
const TONE: Record<Stage["tone"], { dot: string; edge: string; glow: string }> = {
  fuel: {
    dot: "bg-gold-400",
    edge: "border-gold-500/50",
    glow: "shadow-[0_0_14px_-4px_var(--color-gold-400)]",
  },
  electric: {
    dot: "bg-cyan-300",
    edge: "border-cyan-400/60",
    glow: "shadow-[0_0_14px_-4px_var(--color-cyan-400)]",
  },
  mech: {
    dot: "bg-ink-100",
    edge: "border-line-strong",
    glow: "",
  },
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
  const driven = "fill-cyan-300";
  const idle = "fill-surface-4";

  return (
    <svg
      viewBox="0 0 80 110"
      className="h-28 w-auto"
      style={{ filter: "drop-shadow(0 0 6px rgb(34 211 238 / 0.35))" }}
      role="img"
      aria-label={`Driven wheels: ${DRIVE_LABELS[drive ?? "none"]}`}
    >
      {/* Car outline */}
      <rect
        x="22"
        y="8"
        width="36"
        height="94"
        rx="10"
        className="fill-surface-2 stroke-cyan-400/40"
        strokeWidth="1"
      />
      {/* Axles: a driven axle carries the flow. */}
      {[
        { y: 28, on: front },
        { y: 82, on: rear },
      ].map((axle) => (
        <g key={axle.y}>
          <line
            x1="12"
            y1={axle.y}
            x2="68"
            y2={axle.y}
            className="stroke-line-strong"
            strokeWidth="1"
          />
          {axle.on ? (
            <line
              x1="12"
              y1={axle.y}
              x2="68"
              y2={axle.y}
              className="animate-flow stroke-cyan-300"
              strokeWidth="1.5"
              strokeDasharray="3 7"
            />
          ) : null}
        </g>
      ))}
      {/* Drive shaft between driven axles (all-wheel drive). */}
      {front && rear ? (
        <line
          x1="40"
          y1="28"
          x2="40"
          y2="82"
          className="animate-flow stroke-cyan-300/70"
          strokeWidth="1.5"
          strokeDasharray="3 7"
        />
      ) : null}
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
  headingLevel = 3,
  className,
}: {
  fuelType: FuelType | null;
  driveType: DriveType | null;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const stages = stagesFor(fuelType);

  return (
    <section id="powertrain" aria-labelledby="powertrain-heading" className={className}>
      <DetailHeading
        id="powertrain-heading"
        level={headingLevel}
        title="How power reaches the road"
        note={`${stages.length} stages`}
      />

      <div className="relative mt-10 rounded-card p-5 hud-panel sm:p-7">
        <span aria-hidden="true" className="hud-brackets -m-px" />
        <span
          aria-hidden="true"
          className="absolute -top-[5px] left-5 bg-void px-1.5 hud-label leading-[10px]"
        >
          Flow // Powertrain
        </span>

        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
          <Reveal
            as="ol"
            stagger={90}
            className="flex flex-1 flex-wrap items-center gap-y-4"
          >
            {stages.map((stage, index) => {
              const tone = TONE[stage.tone];
              return (
                <li key={stage.id} className="flex items-center">
                  <span
                    className={cn(
                      "relative inline-flex h-10 items-center gap-2.5 border bg-void/50 px-4 font-mono text-[12px] leading-none tracking-hud whitespace-nowrap text-ink-50 uppercase chamfer-sm",
                      tone.edge,
                      tone.glow,
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "size-1.5 shrink-0 rounded-full",
                        tone.dot,
                        stage.tone !== "mech" && "animate-pulse-glow",
                      )}
                    />
                    <span aria-hidden="true" className="text-ink-500">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {stage.label}
                  </span>

                  {index < stages.length - 1 ? (
                    <svg
                      width="40"
                      height="12"
                      viewBox="0 0 40 12"
                      aria-hidden="true"
                      className="mx-1 shrink-0"
                      style={{ filter: "drop-shadow(0 0 4px rgb(34 211 238 / 0.6))" }}
                    >
                      <line
                        x1="0"
                        y1="6"
                        x2="32"
                        y2="6"
                        className="stroke-line-strong"
                        strokeWidth="1"
                      />
                      {/* The moving dash is the energy. strokeDashoffset
                          animates via CSS, so reduced motion stops it. */}
                      <line
                        x1="0"
                        y1="6"
                        x2="32"
                        y2="6"
                        className="animate-flow stroke-cyan-300"
                        strokeWidth="1.5"
                        strokeDasharray="5 9"
                      />
                      <path d="M32 2 L38 6 L32 10 Z" className="fill-cyan-300" />
                    </svg>
                  ) : null}
                </li>
              );
            })}
          </Reveal>

          <figure className="flex shrink-0 items-center gap-5">
            <WheelDiagram drive={driveType} />
            <figcaption>
              <p className="font-mono text-[12px] tracking-hud text-ink-50 uppercase">
                {driveType ? DRIVE_LABELS[driveType] : NOT_AVAILABLE}
              </p>
              <p className="mt-1 text-caption">
                {driveType ? "Driven wheels lit in cyan" : "Driven wheels not recorded"}
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
