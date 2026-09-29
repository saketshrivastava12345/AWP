import { Container } from "@/components/ui/Container";
import { CatalogueBodySkeleton } from "@/components/cars/catalogue/CatalogueSkeleton";

/** Shown while /cars loads: the same layout as the page, so nothing jumps. */
export default function CarsLoading() {
  return (
    <Container className="pt-10 pb-24 sm:pt-14 lg:pt-16">
      <CatalogueBodySkeleton />
    </Container>
  );
}
