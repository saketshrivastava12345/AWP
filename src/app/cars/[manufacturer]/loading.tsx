import { HierarchySkeleton } from "@/components/cars/catalogue/HierarchySkeleton";

/** A maker's catalogue loading. Replaces /cars's grid skeleton for this segment. */
export default function ManufacturerCatalogueLoading() {
  return <HierarchySkeleton variant="manufacturer" />;
}
