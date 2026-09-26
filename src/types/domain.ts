import type { Database, Tables } from "./database";

type Enums = Database["public"]["Enums"];

export type FuelType = Enums["fuel_type"];
export type DriveType = Enums["drive_type"];
export type TransmissionType = Enums["transmission_type"];
export type BodyType = Enums["body_type"];
export type ManufacturerSegment = Enums["manufacturer_segment"];
export type EngineLayout = Enums["engine_layout"];
export type EnginePosition = Enums["engine_position"];
export type Aspiration = Enums["aspiration"];
export type RangeStandard = Enums["range_standard"];
export type ViewerGroup = Enums["viewer_group"];
export type MediaType = Enums["media_type"];
export type UserRole = Enums["user_role"];

/** A row of the read-optimized catalogue view: the grid, search and compare. */
export type CatalogCar = Tables<"car_catalog">;

export type Country = Tables<"countries">;
export type Manufacturer = Tables<"manufacturers">;
export type Category = Tables<"categories">;
export type CarModel = Tables<"car_models">;
export type CarVariant = Tables<"car_variants">;
export type Engine = Tables<"engines">;
export type Transmission = Tables<"transmissions">;
export type PerformanceSpec = Tables<"performance_specs">;
export type DimensionSpec = Tables<"dimensions">;
export type FuelSpec = Tables<"fuel_specs">;
export type EvSpec = Tables<"ev_specs">;
export type Part = Tables<"parts">;
export type PartCategory = Tables<"part_categories">;
export type Feature = Tables<"features">;
export type CarMedia = Tables<"car_media">;

/**
 * Everything the car detail page needs, assembled in one round trip.
 *
 * The shape mirrors the PostgREST embed in `getVariantDetail`. Spec satellites
 * are one-to-one and therefore a single object or null — `null` genuinely means
 * "this car has no such section", which is how EVs end up with no fuel_specs.
 */
export type VariantDetail = {
  variant: CarVariant;
  model: CarModel;
  manufacturer: Manufacturer;
  country: Country;
  category: Category;
  engine: Engine | null;
  transmission: Transmission | null;
  performance: PerformanceSpec | null;
  dimensions: DimensionSpec | null;
  fuel: FuelSpec | null;
  ev: EvSpec | null;
  features: { feature: Feature; detail: string | null }[];
  parts: { part: Part; detail: string | null }[];
  media: CarMedia[];
};

/** A manufacturer with the country it belongs to, for listings. */
export type ManufacturerWithCountry = Manufacturer & {
  country: Pick<Country, "id" | "name" | "slug" | "flag_emoji"> | null;
  model_count: number;
};

export type CountryWithCounts = Country & {
  manufacturer_count: number;
  variant_count: number;
};

export type PartWithCategory = Part & {
  category: Pick<PartCategory, "id" | "name" | "slug"> | null;
};

export type PartDetail = {
  part: Part;
  category: PartCategory;
  related: Part[];
  usedBy: { variant: CatalogCar; detail: string | null }[];
};

/**
 * The powertrain a car's detail page should describe.
 *
 * Derived from `fuel_type` rather than from which spec rows happen to exist,
 * so an electric car never renders an empty "Engine" section — it gets the
 * motor and battery section instead.
 */
export type PowertrainKind = "combustion" | "electric" | "hybrid";

export function powertrainKind(fuelType: FuelType | null): PowertrainKind {
  switch (fuelType) {
    case "electric":
      return "electric";
    case "hybrid":
    case "phev":
      return "hybrid";
    default:
      return "combustion";
  }
}

/** Page of results plus the total, for server-side pagination. */
export type Paginated<T> = {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const EMPTY_PAGE: Paginated<never> = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: 0,
  pageCount: 0,
};
