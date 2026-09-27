import { Unplug } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Shown when a catalogue read failed. Distinct from "not found" and from
 * "nothing catalogued": a failed read says nothing about what exists.
 */
export function CatalogueUnavailable({ retryHref }: { retryHref: string }) {
  return (
    <Container className="py-24">
      <EmptyState
        icon={<Unplug className="size-7" strokeWidth={1.25} aria-hidden="true" />}
        title="Catalogue unavailable"
        description="The catalogue could not be read just now. Reloading usually resolves it."
        action={
          <ButtonLink href={retryHref} variant="secondary" size="sm">
            Try again
          </ButtonLink>
        }
      />
    </Container>
  );
}
