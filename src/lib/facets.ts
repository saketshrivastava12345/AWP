/**
 * Facet shapes shared between the server-only filter query and the client
 * filter rail. See the note in `lib/car-query.ts` for why these cannot live
 * alongside the query that produces them.
 */
export type FacetOption = { value: string; label: string; count?: number };

export type FilterOptions = {
  countries: FacetOption[];
  manufacturers: FacetOption[];
  categories: FacetOption[];
  bodyTypes: FacetOption[];
  transmissionTypes: FacetOption[];
  engineLayouts: FacetOption[];
  cylinders: FacetOption[];
  /** Actual min/max in the data, so range inputs never offer empty ranges. */
  ranges: {
    power: [number, number] | null;
    speed: [number, number] | null;
    year: [number, number] | null;
  };
};
