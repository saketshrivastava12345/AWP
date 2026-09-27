import type {
  BodyType,
  DriveType,
  EnginePosition,
  FuelType,
  VehicleStatus,
} from "@/types/domain";
import {
  BODY_TYPES,
  DRIVE_TYPES,
  ENGINE_POSITIONS,
  FUEL_TYPES,
  VEHICLE_STATUSES,
} from "./labels";
import { LONG_TEXT_MAX, readProvenance, type FieldReader } from "./validation";

/**
 * Validation for a variant's core fields and for a model, shared by the
 * "new vehicle" flow and the editors. Pure and client-safe.
 */

export type VariantCore = {
  name: string;
  slug: string;
  year_start: number;
  year_end: number | null;
  fuel_type: FuelType;
  drive_type: DriveType;
  status: VehicleStatus | null;
  description: string | null;
  notes: string | null;
  source: string;
  source_url: string | null;
  last_verified_at: string | null;
  is_published: boolean;
};

export function readVariantCore(reader: FieldReader, today: string): VariantCore | null {
  const name = reader.text("name", "Variant name", { required: true, max: 120 });
  const slug = reader.slug("slug", "Slug", { required: true });
  const year_start = reader.year("year_start", "First model year", { required: true });
  const year_end = reader.year("year_end", "Last model year");
  const fuel_type = reader.choice("fuel_type", "Fuel type", FUEL_TYPES, {
    required: true,
  });
  const drive_type = reader.choice("drive_type", "Drive", DRIVE_TYPES, {
    required: true,
  });
  const status = reader.choice("status", "Status", VEHICLE_STATUSES);
  const description = reader.text("description", "Description", { max: LONG_TEXT_MAX });
  const notes = reader.text("notes", "Notes", { max: LONG_TEXT_MAX });
  const provenance = readProvenance(reader, { hasData: true, today });
  const is_published = reader.boolean("is_published");

  if (year_start !== null && year_end !== null && year_end < year_start) {
    reader.fail("year_end", "The last model year cannot be before the first.");
  }

  if (
    !reader.ok ||
    name === null ||
    slug === null ||
    year_start === null ||
    fuel_type === null ||
    drive_type === null ||
    provenance.source === null
  ) {
    return null;
  }
  return {
    name,
    slug,
    year_start,
    year_end,
    fuel_type,
    drive_type,
    status,
    description,
    notes,
    source: provenance.source,
    source_url: provenance.source_url,
    last_verified_at: provenance.last_verified_at,
    is_published,
  };
}

export type ModelInput = {
  name: string;
  slug: string;
  category_id: string;
  body_type: BodyType;
  generation: string | null;
  production_start: number | null;
  production_end: number | null;
  engine_position: EnginePosition | null;
  description: string | null;
};

/**
 * Reads a model. `prefix` lets the new-vehicle form nest these fields
 * ("model_name", "model_slug", …) beside the variant's own.
 */
export function readModel(reader: FieldReader, prefix = ""): ModelInput | null {
  const f = (name: string) => `${prefix}${name}`;
  const name = reader.text(f("name"), "Model name", { required: true, max: 120 });
  const slug = reader.slug(f("slug"), "Model slug", { required: true });
  const category_id = reader.uuid(f("category_id"), "Category", { required: true });
  const body_type = reader.choice(f("body_type"), "Body type", BODY_TYPES, {
    required: true,
  });
  const generation = reader.text(f("generation"), "Generation", { max: 60 });
  const production_start = reader.year(f("production_start"), "Production start");
  const production_end = reader.year(f("production_end"), "Production end");
  const engine_position = reader.choice(
    f("engine_position"),
    "Engine position",
    ENGINE_POSITIONS,
  );
  const description = reader.text(f("description"), "Description", {
    max: LONG_TEXT_MAX,
  });

  if (
    production_start !== null &&
    production_end !== null &&
    production_end < production_start
  ) {
    reader.fail(f("production_end"), "Production cannot end before it starts.");
  }
  if (!reader.ok || !name || !slug || !category_id || !body_type) return null;
  return {
    name,
    slug,
    category_id,
    body_type,
    generation,
    production_start,
    production_end,
    engine_position,
    description,
  };
}

/**
 * Powertrain consistency, mirroring the database's CHECK and triggers: a
 * battery-electric car has no engine and no fuel specs; EV specs belong only
 * to electric, plug-in hybrid and hybrid cars.
 */
export function powertrainConflicts(input: {
  fuel: FuelType;
  hasEngine: boolean;
  hasFuelSpecs: boolean;
  hasEvSpecs: boolean;
}): { field: string; message: string }[] {
  const conflicts: { field: string; message: string }[] = [];
  if (input.fuel === "electric" && input.hasEngine) {
    conflicts.push({
      field: "engine_id",
      message: "A battery-electric vehicle has no combustion engine. Choose “No engine”.",
    });
  }
  if (input.fuel === "electric" && input.hasFuelSpecs) {
    conflicts.push({
      field: "fuel_type",
      message:
        "This vehicle has a Fuel & efficiency section. Clear it before making the vehicle battery-electric.",
    });
  }
  if (!["electric", "phev", "hybrid"].includes(input.fuel) && input.hasEvSpecs) {
    conflicts.push({
      field: "fuel_type",
      message:
        "This vehicle has an EV & charging section. Clear it before changing to a fuel type without a battery.",
    });
  }
  return conflicts;
}
