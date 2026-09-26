import type {
  Aspiration,
  BodyType,
  DriveType,
  EngineLayout,
  EnginePosition,
  PowertrainKind,
  TransmissionType,
  VariantDetail,
} from "@/types/domain";
import { powertrainKind } from "@/types/domain";

/**
 * Everything the 3D car needs to know about a variant, as plain serialisable
 * data. Built on the server from the catalogue and handed to the client
 * components, so the canvas never queries anything itself.
 *
 * Every field is nullable in the same way the catalogue is. A missing engine
 * layout draws a plain engine block rather than guessing a cylinder count.
 */
export type CarBuild = {
  bodyType: BodyType | null;
  powertrain: PowertrainKind;
  enginePosition: EnginePosition | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  wheelbase_mm: number | null;
  ground_clearance_mm: number | null;
  engineLayout: EngineLayout | null;
  cylinders: number | null;
  displacementCc: number | null;
  aspiration: Aspiration | null;
  transmission: TransmissionType | null;
  gears: number | null;
  drive: DriveType | null;
  motors: number | null;
  seats: number | null;
  /** Home-market steering position, from the maker's country. */
  rightHandDrive: boolean;
  /** A rear wing is catalogued for this variant (variant_parts), so draw one. */
  rearWing: boolean;
};

/**
 * Countries in this catalogue whose home market drives on the left, so their
 * cars are designed right-hand drive first. Presentation only: it decides
 * which seat gets the steering wheel.
 */
const RIGHT_HAND_DRIVE_MARKETS = new Set([
  "IN",
  "JP",
  "GB",
  "AU",
  "NZ",
  "ZA",
  "MY",
  "SG",
  "TH",
]);

export function carBuildFromDetail(detail: VariantDetail): CarBuild {
  const { model, variant, engine, transmission, dimensions, ev, country, parts } = detail;
  return {
    bodyType: model.body_type,
    powertrain: powertrainKind(variant.fuel_type),
    enginePosition: model.engine_position ?? null,
    length_mm: dimensions?.length_mm ?? null,
    width_mm: dimensions?.width_mm ?? null,
    height_mm: dimensions?.height_mm ?? null,
    wheelbase_mm: dimensions?.wheelbase_mm ?? null,
    ground_clearance_mm: dimensions?.ground_clearance_mm ?? null,
    engineLayout: engine?.layout ?? null,
    cylinders: engine?.cylinders ?? null,
    displacementCc: engine?.displacement_cc ?? null,
    aspiration: engine?.aspiration ?? null,
    transmission: transmission?.type ?? null,
    gears: transmission?.gears ?? null,
    drive: variant.drive_type,
    motors: ev?.motor_count ?? null,
    seats: dimensions?.seating_capacity ?? null,
    rightHandDrive: RIGHT_HAND_DRIVE_MARKETS.has(country.iso_code.toUpperCase()),
    rearWing: parts.some(({ part }) => part.slug === "rear-spoiler"),
  };
}

/**
 * A neutral front-engined coupé for places that show "a car" rather than a
 * specific one, such as the home page story.
 */
export const GENERIC_BUILD: CarBuild = {
  bodyType: "coupe",
  powertrain: "combustion",
  enginePosition: "front",
  length_mm: null,
  width_mm: null,
  height_mm: null,
  wheelbase_mm: null,
  ground_clearance_mm: null,
  engineLayout: "vee",
  cylinders: 8,
  displacementCc: null,
  aspiration: "twin_turbo",
  transmission: "dct",
  gears: null,
  drive: "rwd",
  motors: null,
  seats: 2,
  rightHandDrive: false,
  rearWing: false,
};
