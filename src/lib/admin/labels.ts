import type {
  Aspiration,
  BodyType,
  DriveType,
  EngineLayout,
  EnginePosition,
  FuelType,
  MarketStatus,
  MediaShot,
  PaintFinish,
  PriceType,
  RangeStandard,
  TransmissionType,
  VehicleStatus,
} from "@/types/domain";

/**
 * Enum values and their labels for the admin forms. The value lists mirror
 * the Postgres enums in src/types/database.ts; the `satisfies` clauses make
 * the compiler flag any drift when the schema changes.
 *
 * Client-safe (no server imports).
 */

export type Option<T extends string = string> = { value: T; label: string };

function options<T extends string>(labels: Record<T, string>): Option<T>[] {
  return (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));
}

export const FUEL_LABELS = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  phev: "Plug-in hybrid (PHEV)",
  electric: "Battery electric",
  hydrogen: "Hydrogen",
} satisfies Record<FuelType, string>;

/** Compact fuel labels for badges in dense tables. */
export const FUEL_SHORT = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  phev: "PHEV",
  electric: "Electric",
  hydrogen: "Hydrogen",
} satisfies Record<FuelType, string>;

export const DRIVE_LABELS = {
  fwd: "Front-wheel drive (FWD)",
  rwd: "Rear-wheel drive (RWD)",
  awd: "All-wheel drive (AWD)",
  "4wd": "Four-wheel drive (4WD)",
} satisfies Record<DriveType, string>;

export const BODY_LABELS = {
  hatchback: "Hatchback",
  sedan: "Sedan",
  coupe: "Coupé",
  convertible: "Convertible",
  roadster: "Roadster",
  suv: "SUV",
  wagon: "Wagon",
  mpv: "MPV",
  pickup: "Pickup",
  off_road: "Off-road",
} satisfies Record<BodyType, string>;

export const TRANSMISSION_LABELS = {
  manual: "Manual",
  automatic: "Automatic (torque converter)",
  dct: "Dual-clutch (DCT)",
  amt: "Automated manual (AMT)",
  cvt: "CVT",
  single_speed: "Single-speed reduction",
} satisfies Record<TransmissionType, string>;

export const LAYOUT_LABELS = {
  inline: "Inline",
  vee: "V",
  flat: "Flat (boxer)",
  w: "W",
  rotary: "Rotary",
} satisfies Record<EngineLayout, string>;

export const ENGINE_POSITION_LABELS = {
  front: "Front (ahead of the cabin)",
  mid: "Mid (between cabin and rear axle)",
  rear: "Rear (behind the rear axle)",
} satisfies Record<EnginePosition, string>;

export const ASPIRATION_LABELS = {
  naturally_aspirated: "Naturally aspirated",
  turbocharged: "Turbocharged",
  twin_turbo: "Twin-turbo",
  supercharged: "Supercharged",
  twincharged: "Twincharged",
} satisfies Record<Aspiration, string>;

export const RANGE_STANDARD_LABELS = {
  wltp: "WLTP",
  epa: "EPA",
  arai: "ARAI",
  nedc: "NEDC",
  cltc: "CLTC",
} satisfies Record<RangeStandard, string>;

export const VEHICLE_STATUS_LABELS = {
  available: "Available",
  upcoming: "Upcoming",
  discontinued: "Discontinued",
  concept: "Concept",
  limited: "Limited run",
  sold_out: "Sold out",
} satisfies Record<VehicleStatus, string>;

export const MARKET_STATUS_LABELS = {
  available: "Available",
  upcoming: "Upcoming",
  discontinued: "Discontinued",
  not_available: "Not sold here",
} satisfies Record<MarketStatus, string>;

export const PRICE_TYPE_ADMIN_LABELS = {
  manufacturer_list: "Manufacturer list price",
  dealer_list: "Dealer list price",
  ex_showroom: "Ex-showroom",
  on_road: "On-road (published total)",
  estimated_on_road: "Estimated on-road (published estimate)",
} satisfies Record<PriceType, string>;

export const SHOT_LABELS = {
  hero: "Hero",
  front: "Front",
  rear: "Rear",
  side: "Side profile",
  three_quarter: "Three-quarter",
  interior: "Interior",
  dashboard: "Dashboard",
  engine: "Engine",
  wheel: "Wheel",
  detail: "Detail",
  gallery: "Gallery",
} satisfies Record<MediaShot, string>;

export const FINISH_LABELS = {
  solid: "Solid",
  metallic: "Metallic",
  pearl: "Pearl",
  matte: "Matte",
  satin: "Satin",
} satisfies Record<PaintFinish, string>;

export const FUEL_OPTIONS = options(FUEL_LABELS);
export const DRIVE_OPTIONS = options(DRIVE_LABELS);
export const BODY_OPTIONS = options(BODY_LABELS);
export const TRANSMISSION_OPTIONS = options(TRANSMISSION_LABELS);
export const LAYOUT_OPTIONS = options(LAYOUT_LABELS);
export const ENGINE_POSITION_OPTIONS = options(ENGINE_POSITION_LABELS);
export const ASPIRATION_OPTIONS = options(ASPIRATION_LABELS);
export const RANGE_STANDARD_OPTIONS = options(RANGE_STANDARD_LABELS);
export const VEHICLE_STATUS_OPTIONS = options(VEHICLE_STATUS_LABELS);
export const MARKET_STATUS_OPTIONS = options(MARKET_STATUS_LABELS);
export const PRICE_TYPE_OPTIONS = options(PRICE_TYPE_ADMIN_LABELS);
export const SHOT_OPTIONS = options(SHOT_LABELS);
export const FINISH_OPTIONS = options(FINISH_LABELS);

export const FUEL_TYPES = Object.keys(FUEL_LABELS) as FuelType[];
export const DRIVE_TYPES = Object.keys(DRIVE_LABELS) as DriveType[];
export const BODY_TYPES = Object.keys(BODY_LABELS) as BodyType[];
export const TRANSMISSION_TYPES = Object.keys(TRANSMISSION_LABELS) as TransmissionType[];
export const ENGINE_LAYOUTS = Object.keys(LAYOUT_LABELS) as EngineLayout[];
export const ENGINE_POSITIONS = Object.keys(ENGINE_POSITION_LABELS) as EnginePosition[];
export const ASPIRATIONS = Object.keys(ASPIRATION_LABELS) as Aspiration[];
export const RANGE_STANDARDS = Object.keys(RANGE_STANDARD_LABELS) as RangeStandard[];
export const VEHICLE_STATUSES = Object.keys(VEHICLE_STATUS_LABELS) as VehicleStatus[];
export const MARKET_STATUSES = Object.keys(MARKET_STATUS_LABELS) as MarketStatus[];
export const PRICE_TYPES = Object.keys(PRICE_TYPE_ADMIN_LABELS) as PriceType[];
export const SHOTS = Object.keys(SHOT_LABELS) as MediaShot[];
export const FINISHES = Object.keys(FINISH_LABELS) as PaintFinish[];

/**
 * Licences offered for photographs and 3D models. "Other" reveals a free-text
 * field; whatever is chosen is stored verbatim in car_media.license.
 */
export const LICENCE_OPTIONS: Option[] = [
  { value: "CC0 1.0", label: "CC0 1.0 (public domain dedication)" },
  { value: "CC BY 4.0", label: "CC BY 4.0" },
  { value: "CC BY-SA 4.0", label: "CC BY-SA 4.0" },
  { value: "Public domain", label: "Public domain" },
  { value: "Press kit (with permission)", label: "Press kit (with permission)" },
  { value: "Owned by uploader", label: "Owned by uploader" },
  { value: "other", label: "Other (type it)" },
];

/** Whether a fuel type can carry each powertrain section (mirrors the DB triggers). */
export function powertrainSections(fuel: FuelType): {
  engine: boolean;
  fuel: boolean;
  ev: boolean;
} {
  return {
    engine: fuel !== "electric",
    fuel: fuel !== "electric",
    ev: fuel === "electric" || fuel === "phev" || fuel === "hybrid",
  };
}
