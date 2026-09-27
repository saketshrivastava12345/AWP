import { Container } from "@/components/ui/Container";
import {
  CatalogueBodySkeleton,
  CatalogueIntro,
} from "@/components/cars/catalogue/CatalogueSkeleton";

/** Shown while /cars loads: the same layout as the page, so nothing jumps. */
export default function CarsLoading() {
  return (
    <Container className="pt-10 pb-20 sm:pt-14 2xl:max-w-[1600px]">
      <CatalogueIntro />
      <CatalogueBodySkeleton />
    </Container>
  );
}
