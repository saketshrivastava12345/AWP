import { cn } from "@/lib/utils";
import { NOT_AVAILABLE } from "@/lib/format";
import type { DriveType, FuelType } from "@/types/domain";
import { powertrainKind } from "@/types/domain";
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

/** Tones are a leading dot, as on a Badge; the label stays ink-100. */
const TONE_DOTS: Record<Stage["tone"], string | null> = {
  fuel: "bg-ink-300",
  electric: "bg-signal-electric",
  mech: null,
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
      aria-label={`Driven wheels: ${DRIVE_LABELS[drive ?? "none"]}`}
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
      />

      <div className="mt-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
        <ol className="flex flex-1 flex-wrap items-center gap-y-4">
          {stages.map((stage, index) => {
            const dot = TONE_DOTS[stage.tone];
            return (
              <li key={stage.id} className="flex items-center">
                <span className="inline-flex h-9 items-center gap-2 rounded-pill border border-line-strong px-4 text-[13px] leading-none font-medium whitespace-nowrap text-ink-100">
                  {dot ? (
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 shrink-0 rounded-full", dot)}
                    />
                  ) : null}
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
                      className="animate-flow stroke-ink-300"
                      strokeWidth="1.5"
                      strokeDasharray="4 10"
                    />
                    <path d="M26 1.5 L32 5 L26 8.5 Z" className="fill-line-strong" />
                  </svg>
                ) : null}
              </li>
            );
          })}
        </ol>

        <figure className="flex shrink-0 items-center gap-5">
          <WheelDiagram drive={driveType} />
          <figcaption>
            <p className="text-body-s text-ink-100">
              {driveType ? DRIVE_LABELS[driveType] : NOT_AVAILABLE}
            </p>
            <p className="mt-1 text-caption">
              {driveType ? "Driven wheels in gold" : "Driven wheels not recorded"}
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
