import type { BodyType, Part, VariantDetail, ViewerGroup } from "@/types/domain";
import { powertrainKind } from "@/types/domain";
import { formatEnumLabel, formatNumber } from "@/lib/format";

/**
 * The scroll-driven anatomy tour on a car's page, as data.
 *
 * Each stop is one subsystem the camera flies to. Everything specific to the
 * car comes from its own catalogue rows, and a stop lists only figures that
 * exist — a missing one is simply left out rather than shown as a gap, since
 * the full specification tables further down already say "Not available".
 *
 * Components are drawn from the parts encyclopedia, and only where the car's
 * data says they apply: a turbocharger appears for turbocharged engines, a
 * carbon-ceramic disc only when one is catalogued for this variant. The body
 * copy is general engineering, true of any car with that layout.
 *
 * Pure and server-safe, so it is unit-tested and never ships to the browser.
 */

export type TourStopId =
  | "design"
  | "engine"
  | "electric"
  | "battery"
  | "drivetrain"
  | "chassis"
  | "brakes"
  | "interior"
  | "performance";

/** Points inside the car the tour can pin a label to (see car-layout.ts). */
export type TourAnchor =
  | "nose"
  | "tail"
  | "engine"
  | "gearbox"
  | "frontWheel"
  | "frontSuspension"
  | "battery"
  | "motor"
  | "cabin"
  | "dash";

export type TourStat = { label: string; value: string };

export type TourComponent = {
  name: string;
  slug: string;
  /** First sentence of what the part does. */
  summary: string | null;
  /** A note catalogued for this specific variant, when there is one. */
  note: string | null;
};

export type TourStop = {
  id: TourStopId;
  /** The 3D subsystem to highlight. */
  group: ViewerGroup;
  /** Short name for the progress rail. */
  label: string;
  title: string;
  body: string;
  stats: TourStat[];
  features: { name: string; note: string | null }[];
  components: TourComponent[];
  /** Labels pinned into the scene. */
  callouts: { anchor: TourAnchor; text: string }[];
};

const MAX_COMPONENTS = 4;

function firstSentence(text: string | null | undefined): string | null {
  if (!text) return null;
  const match = /^.*?[.!?](\s|$)/.exec(text.trim());
  return (match ? match[0] : text).trim();
}

function stat(label: string, value: string | null | undefined): TourStat | null {
  return value ? { label, value } : null;
}

const present = <T>(values: (T | null | undefined | false)[]): T[] =>
  values.filter(
    (value): value is T => value !== null && value !== undefined && value !== false,
  );

const mm = (value: number | null | undefined) =>
  value ? `${formatNumber(value)} mm` : null;

const BODY_COPY: Record<BodyType, string> = {
  coupe:
    "A coupé trades rear-seat room for a lower roof and a smaller frontal area — less air to push aside, and a lower centre of gravity to lean on in corners.",
  roadster:
    "A roadster is built around two seats and an open top. Without a fixed roof the floor and sills carry the structural load, which is why they are so deep.",
  convertible:
    "Removing the roof removes a large part of the body's stiffness, so a convertible's floor, sills and windscreen frame are reinforced to put it back.",
  sedan:
    "A saloon separates the boot from the cabin. The third box costs a little aerodynamic cleanliness and buys a quieter, stiffer cabin.",
  hatchback:
    "A hatchback ends the roof in a near-vertical tailgate: the most cabin and luggage space for the length, and a short overhang that is easy to park.",
  wagon:
    "An estate carries the roof all the way to the tail, turning the boot into a load bay without adding length.",
  suv: "Height buys ground clearance and a commanding view, at the cost of a larger frontal area and a higher centre of gravity for the chassis to control.",
  off_road:
    "Short overhangs set the approach and departure angles, the height of the underbody sets the clearance: an off-roader's shape is dictated by terrain.",
  mpv: "A tall, one-box shape maximises cabin volume for the footprint: the design brief is space, not speed.",
  pickup:
    "A cab and a separate load bed on a ladder frame. The frame absorbs payload and towing loads that would twist a monocoque.",
};

const ASPIRATION_COPY: Record<string, string> = {
  naturally_aspirated:
    "Naturally aspirated: it breathes at atmospheric pressure, so the response is immediate and the power builds with revs.",
  turbocharged:
    "A turbocharger spins on exhaust energy to compress the intake air, so a smaller engine makes the power of a larger one.",
  twin_turbo:
    "Two turbochargers share the exhaust flow. Smaller turbines spin up faster than one large one, which shortens the wait for boost.",
  supercharged:
    "The supercharger is driven by the crankshaft itself, trading some efficiency for boost that arrives the instant the throttle opens.",
  twincharged:
    "Supercharged and turbocharged: the supercharger covers low revs while the turbocharger spools, then hands over.",
};

const POSITION_COPY: Record<string, string> = {
  front: "Mounted ahead of the cabin, where it is easiest to package and to cool.",
  mid: "Mounted between the cabin and the rear axle, the heaviest component sits near the car's centre, so it changes direction with less inertia.",
  rear: "Mounted behind the rear axle. The weight over the driven wheels gives exceptional traction under acceleration — the handling it causes is what the chassis spends its life taming.",
};

const TRANSMISSION_COPY: Record<string, string> = {
  dct: "A dual-clutch gearbox pre-selects the next gear on a second clutch, so a shift completes without interrupting drive.",
  manual: "A conventional manual: the driver chooses every ratio and works the clutch.",
  automatic:
    "A torque-converter automatic couples the engine through fluid, which smooths take-off and multiplies torque at low speed.",
  amt: "An automated manual: a conventional gearbox and clutch, operated by actuators instead of the driver's foot and hand.",
  cvt: "A continuously variable transmission has no fixed ratios, so the engine can sit at its most efficient speed.",
  single_speed:
    "A single reduction gear: an electric motor spins usefully across such a wide range that multiple ratios are unnecessary.",
};

const TRANSMISSION_TITLE: Record<string, string> = {
  dct: "dual-clutch",
  manual: "manual",
  automatic: "automatic",
  amt: "automated manual",
  cvt: "CVT",
  single_speed: "single-speed",
};

const DRIVE_COPY: Record<string, string> = {
  rwd: "Power goes to the rear wheels, leaving the front ones free to steer.",
  fwd: "Power goes to the front wheels — the most compact layout, with no driveshaft running to the back.",
  awd: "All four wheels are driven, splitting traction across both axles.",
  "4wd":
    "Four-wheel drive with a transfer case, built to lock the axles together off-road.",
};

/** Battery-group parts that belong to an EV's motors stop, and vice versa. */
const DRIVE_UNIT_PARTS = [
  "electric-traction-motor",
  "inverter",
  "regenerative-braking-system",
];
const PACK_PARTS = [
  "traction-battery-pack",
  "battery-module",
  "battery-management-system",
  "battery-thermal-management",
  "on-board-charger",
];

/** Parts encyclopedia, indexed by slug. */
type PartIndex = Map<string, Part>;

export function buildAnatomyTour(detail: VariantDetail, allParts: Part[]): TourStop[] {
  const { variant, model, engine, transmission, performance, dimensions, ev } = detail;
  const kind = powertrainKind(variant.fuel_type);
  const index: PartIndex = new Map(allParts.map((part) => [part.slug, part]));
  const variantNotes = new Map(
    detail.parts.map(({ part, detail: note }) => [part.slug, note]),
  );
  const variantParts = new Map(detail.parts.map(({ part }) => [part.slug, part]));
  const featureSlugs = new Set(detail.features.map(({ feature }) => feature.slug));

  /**
   * Components for a stop: this variant's own catalogued parts first, then
   * the general ones. `exclude` keeps a part to the one stop it belongs to
   * when two stops share a viewer group (an EV's motors and its battery).
   */
  const components = (
    group: ViewerGroup,
    slugs: string[],
    exclude: string[] = [],
  ): TourComponent[] => {
    const ordered = [
      ...detail.parts
        .filter(({ part }) => part.viewer_group === group)
        .map(({ part }) => part.slug),
      ...slugs,
    ].filter((slug) => !exclude.includes(slug));
    const seen = new Set<string>();
    const out: TourComponent[] = [];
    for (const slug of ordered) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      const part = variantParts.get(slug) ?? index.get(slug);
      if (!part) continue;
      out.push({
        name: part.name,
        slug: part.slug,
        summary: firstSentence(part.function ?? part.description),
        note: variantNotes.get(slug) ?? null,
      });
      if (out.length >= MAX_COMPONENTS) break;
    }
    return out;
  };

  const features = (categories: string[]) =>
    detail.features
      .filter(({ feature }) => feature.category && categories.includes(feature.category))
      .map(({ feature, detail: note }) => ({ name: feature.name, note }));

  const stops: TourStop[] = [];

  // --- Design ---------------------------------------------------------------
  const bodyLabel = formatEnumLabel(model.body_type, "");
  stops.push({
    id: "design",
    group: "body",
    label: "Design",
    title: dimensions?.length_mm
      ? `${bodyLabel}, ${formatNumber(dimensions.length_mm)} mm long`
      : `${bodyLabel} body`,
    body: BODY_COPY[model.body_type],
    stats: present([
      stat("Length", mm(dimensions?.length_mm)),
      stat("Width", mm(dimensions?.width_mm)),
      stat("Height", mm(dimensions?.height_mm)),
      stat("Wheelbase", mm(dimensions?.wheelbase_mm)),
      stat(
        "Kerb weight",
        dimensions?.kerb_weight_kg
          ? `${formatNumber(dimensions.kerb_weight_kg)} kg`
          : null,
      ),
    ]),
    features: features(["Aerodynamics", "Lighting"]),
    components: components("body", ["bonnet", "fender", "windscreen", "front-bumper"]),
    callouts: [{ anchor: "nose", text: bodyLabel }],
  });

  // --- Engine (combustion and hybrid) ------------------------------------
  if (kind !== "electric") {
    const litres = engine?.displacement_cc
      ? (engine.displacement_cc / 1000).toFixed(1)
      : null;
    const configuration = engine?.configuration ?? null;
    const aspiration = engine?.aspiration ?? null;
    const position = model.engine_position ?? null;
    const boosted = aspiration && aspiration !== "naturally_aspirated";
    const titleParts = present([litres ? `${litres}-litre` : null, configuration]);

    stops.push({
      id: "engine",
      group: "engine",
      label: "Engine",
      title: titleParts.length ? titleParts.join(" ") : (engine?.name ?? "Engine"),
      body:
        present([
          position ? POSITION_COPY[position] : null,
          aspiration ? ASPIRATION_COPY[aspiration] : null,
          kind === "hybrid"
            ? "It works alongside an electric motor, which fills the gaps in the engine's delivery and recovers energy under braking."
            : null,
        ]).join(" ") ||
        "The engine converts fuel into rotation; everything else in the drivetrain exists to deliver it to the road.",
      stats: present([
        stat("Engine", engine?.name),
        stat("Layout", configuration),
        stat(
          "Displacement",
          engine?.displacement_cc ? `${formatNumber(engine.displacement_cc)} cc` : null,
        ),
        stat("Aspiration", aspiration ? formatEnumLabel(aspiration) : null),
        stat(
          "Power",
          performance?.power_hp
            ? `${formatNumber(performance.power_hp)} hp${performance.power_rpm ? ` @ ${formatNumber(performance.power_rpm)} rpm` : ""}`
            : null,
        ),
        stat(
          "Torque",
          performance?.torque_nm
            ? `${formatNumber(performance.torque_nm)} Nm${performance.torque_rpm ? ` @ ${formatNumber(performance.torque_rpm)} rpm` : ""}`
            : null,
        ),
        stat(
          "Redline",
          engine?.redline_rpm ? `${formatNumber(engine.redline_rpm)} rpm` : null,
        ),
        stat("Position", position ? formatEnumLabel(position) : null),
      ]),
      features: [],
      components: components(
        "engine",
        present([
          boosted && aspiration !== "supercharged" ? "turbocharger" : null,
          aspiration === "supercharged" || aspiration === "twincharged"
            ? "supercharger"
            : null,
          boosted ? "intercooler" : null,
          "cylinder-block",
          "crankshaft",
          "cylinder-head",
          "piston",
        ]),
      ),
      callouts: present([
        {
          anchor: "engine" as const,
          text:
            present([configuration, litres ? `${litres} L` : null]).join(" · ") ||
            "Engine",
        },
      ]),
    });
  }

  // --- Electric drive and battery ------------------------------------------
  if (kind !== "combustion") {
    const motors = ev?.motor_count ?? null;
    if (kind === "electric") {
      stops.push({
        id: "electric",
        group: "battery",
        label: "Motors",
        title: motors
          ? `${motors} electric motor${motors === 1 ? "" : "s"}`
          : "Electric drive",
        body: present([
          "An electric motor makes its peak torque from a standstill, which is why even heavy EVs accelerate so hard off the line.",
          motors === 1
            ? `A single motor drives the ${variant.drive_type === "fwd" ? "front" : "rear"} axle.`
            : motors === 2
              ? "One motor per axle gives all-wheel drive with no mechanical link between the front and rear."
              : motors && motors > 2
                ? "Several motors share the work between the axles, so torque can be apportioned wheel by wheel."
                : null,
        ]).join(" "),
        stats: present([
          stat("Motors", motors ? String(motors) : null),
          stat(
            "Power",
            performance?.power_hp ? `${formatNumber(performance.power_hp)} hp` : null,
          ),
          stat(
            "Torque",
            performance?.torque_nm ? `${formatNumber(performance.torque_nm)} Nm` : null,
          ),
          stat("Drive", formatEnumLabel(variant.drive_type, "") || null),
        ]),
        features: features(["EV"]),
        components: components(
          "battery",
          ["electric-traction-motor", "inverter", "regenerative-braking-system"],
          PACK_PARTS,
        ),
        callouts: [
          {
            anchor: "motor",
            text: motors ? `${motors} motor${motors === 1 ? "" : "s"}` : "Motor",
          },
        ],
      });
    }

    stops.push({
      id: "battery",
      group: "battery",
      label: "Battery",
      title: ev?.battery_kwh ? `${ev.battery_kwh} kWh battery` : "Traction battery",
      body:
        kind === "electric"
          ? "The pack lies flat in the floor between the axles — the lowest, best-protected place in the car, and the reason electric cars have such a low centre of gravity."
          : "A far smaller pack than an electric car's. It stores energy recovered under braking and powers the electric motor alongside the engine.",
      stats: present([
        stat("Capacity", ev?.battery_kwh ? `${ev.battery_kwh} kWh` : null),
        stat("Usable", ev?.usable_battery_kwh ? `${ev.usable_battery_kwh} kWh` : null),
        stat(
          kind === "electric" ? "Range" : "Electric range",
          ev?.range_km
            ? `${formatNumber(ev.range_km)} km${ev.range_standard ? ` (${ev.range_standard.toUpperCase()})` : ""}`
            : null,
        ),
        stat("Max charging", ev?.max_charge_kw ? `${ev.max_charge_kw} kW` : null),
        stat("Charge 10–80%", ev?.charge_10_80_min ? `${ev.charge_10_80_min} min` : null),
      ]),
      features: kind === "electric" ? [] : features(["EV"]),
      components: components(
        "battery",
        present([
          "traction-battery-pack",
          "battery-management-system",
          "battery-thermal-management",
          variant.fuel_type !== "hybrid" ? "on-board-charger" : null,
          kind === "hybrid" ? "electric-traction-motor" : null,
        ]),
        // An EV's drive units have their own stop.
        kind === "electric" ? DRIVE_UNIT_PARTS : [],
      ),
      callouts: [
        {
          anchor: "battery",
          text: ev?.battery_kwh ? `${ev.battery_kwh} kWh` : "Battery",
        },
      ],
    });
  }

  // --- Transmission and drivetrain --------------------------------------
  const transmissionType = transmission?.type ?? null;
  const drive = variant.drive_type;
  stops.push({
    id: "drivetrain",
    group: "transmission",
    label: "Drivetrain",
    title: (() => {
      const driveLabel = formatEnumLabel(drive, "");
      if (!transmissionType) return driveLabel || "Drivetrain";
      const gears =
        transmission?.gears && transmissionType !== "single_speed"
          ? `${transmission.gears}-speed `
          : "";
      const title = `${gears}${TRANSMISSION_TITLE[transmissionType]} · ${driveLabel}`;
      return title.charAt(0).toUpperCase() + title.slice(1);
    })(),
    body: present([
      transmissionType ? TRANSMISSION_COPY[transmissionType] : null,
      DRIVE_COPY[drive],
    ]).join(" "),
    stats: present([
      stat("Transmission", transmission?.name),
      stat("Type", transmissionType ? formatEnumLabel(transmissionType) : null),
      stat("Gears", transmission?.gears ? String(transmission.gears) : null),
      stat("Drive", formatEnumLabel(drive, "") || null),
    ]),
    features: features(["Drivetrain"]),
    components: components(
      "transmission",
      present([
        transmissionType === "dct" ? "dual-clutch-transmission" : null,
        transmissionType === "manual" ? "manual-gearbox" : null,
        transmissionType === "manual" || transmissionType === "amt" ? "clutch" : null,
        transmissionType === "automatic" ? "torque-converter" : null,
        drive === "4wd" || featureSlugs.has("low-range-transfer-case")
          ? "transfer-case"
          : null,
        "differential",
        "cv-joint",
      ]),
    ),
    callouts: [
      {
        anchor: "gearbox",
        text: transmission?.name ?? formatEnumLabel(drive, "Drivetrain"),
      },
    ],
  });

  // --- Chassis ---------------------------------------------------------------
  const air = featureSlugs.has("air-suspension");
  stops.push({
    id: "chassis",
    group: "suspension",
    label: "Chassis",
    title: "Suspension & chassis",
    body: "Springs carry the car's weight, dampers control how quickly it moves on them, and anti-roll bars resist the body leaning in a corner. Every setting is a compromise between comfort and control.",
    stats: present([
      stat("Wheelbase", mm(dimensions?.wheelbase_mm)),
      stat("Ground clearance", mm(dimensions?.ground_clearance_mm)),
      stat(
        "Kerb weight",
        dimensions?.kerb_weight_kg
          ? `${formatNumber(dimensions.kerb_weight_kg)} kg`
          : null,
      ),
    ]),
    features: features(["Chassis"]),
    components: components(
      "suspension",
      present([air ? "air-spring" : "coil-spring", "damper", "anti-roll-bar"]),
    ),
    callouts: [{ anchor: "frontSuspension", text: air ? "Air suspension" : "Coil-over" }],
  });

  // --- Brakes, wheels and tyres -------------------------------------------
  const ceramic =
    featureSlugs.has("carbon-ceramic-brakes") || variantParts.has("carbon-ceramic-disc");
  stops.push({
    id: "brakes",
    group: "brakes",
    label: "Brakes",
    title: ceramic ? "Carbon-ceramic brakes" : "Brakes, wheels & tyres",
    body: "A single stop is limited by the tyres' grip; repeated stops by heat, because every stop turns the car's kinetic energy into heat in the discs within seconds. Four contact patches, each about the size of a hand, are all the car ever has to work with.",
    stats: present([
      stat(
        "Braking 100–0",
        performance?.braking_100_0_m ? `${performance.braking_100_0_m} m` : null,
      ),
      stat(
        "Kerb weight",
        dimensions?.kerb_weight_kg
          ? `${formatNumber(dimensions.kerb_weight_kg)} kg`
          : null,
      ),
    ]),
    features: features(["Braking"]),
    components: [
      ...components(
        "brakes",
        present([
          ceramic ? "carbon-ceramic-disc" : "brake-disc",
          "brake-caliper",
          "brake-pad",
        ]),
      ),
      ...components("wheels", ["tyre"]),
    ].slice(0, MAX_COMPONENTS),
    callouts: [
      { anchor: "frontWheel", text: ceramic ? "Carbon-ceramic disc" : "Disc & caliper" },
    ],
  });

  // --- Interior ---------------------------------------------------------------
  const seats = dimensions?.seating_capacity ?? null;
  stops.push({
    id: "interior",
    group: "interior",
    label: "Cabin",
    title: seats ? `${seats}-seat cabin` : "Cabin",
    body: "Seat position, wheel angle and pedal geometry decide how much of the car actually reaches the driver.",
    stats: present([
      stat("Seats", seats ? String(seats) : null),
      stat(
        "Boot",
        dimensions?.boot_capacity_l ? `${dimensions.boot_capacity_l} L` : null,
      ),
    ]),
    features: features(["Interior", "Driver Assistance"]),
    components: components("interior", ["seat", "steering-wheel", "dashboard", "airbag"]),
    callouts: [{ anchor: "dash", text: seats ? `${seats} seats` : "Cabin" }],
  });

  // --- Performance ------------------------------------------------------------
  const powerToWeight =
    performance?.power_hp && dimensions?.kerb_weight_kg
      ? `${((performance.power_hp * 1000) / dimensions.kerb_weight_kg).toFixed(0)} hp/t`
      : null;
  stops.push({
    id: "performance",
    group: "body",
    label: "Performance",
    title: performance?.zero_to_100_s
      ? `0–100 km/h in ${performance.zero_to_100_s.toFixed(1)} s`
      : performance?.power_hp
        ? `${formatNumber(performance.power_hp)} hp`
        : "Performance",
    body: "Every figure here is the result of the systems above resolving against each other: power against weight, grip against drag.",
    stats: present([
      stat(
        "Power",
        performance?.power_hp ? `${formatNumber(performance.power_hp)} hp` : null,
      ),
      stat(
        "Torque",
        performance?.torque_nm ? `${formatNumber(performance.torque_nm)} Nm` : null,
      ),
      stat(
        "0–100 km/h",
        performance?.zero_to_100_s ? `${performance.zero_to_100_s.toFixed(1)} s` : null,
      ),
      stat(
        "0–200 km/h",
        performance?.zero_to_200_s ? `${performance.zero_to_200_s.toFixed(1)} s` : null,
      ),
      stat(
        "Top speed",
        performance?.top_speed_kmh
          ? `${formatNumber(performance.top_speed_kmh)} km/h`
          : null,
      ),
      stat("Power-to-weight", powerToWeight),
    ]),
    features: [],
    components: [],
    callouts: [],
  });

  return stops;
}
