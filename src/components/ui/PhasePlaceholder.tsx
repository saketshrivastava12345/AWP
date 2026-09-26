import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Honest placeholder for a route whose real implementation lands in a later
 * build phase. It exists so the navigation is never broken, and it states
 * plainly what is not built yet rather than showing invented content.
 */
export function PhasePlaceholder({
  overline,
  title,
  description,
  arriving,
}: {
  overline: string;
  title: string;
  description: string;
  arriving: string;
}) {
  return (
    <Container className="py-20">
      <p className="text-label">{overline}</p>
      <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
        {title}
      </h1>
      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-300 sm:text-base">
        {description}
      </p>

      <EmptyState
        className="mt-14"
        title="Not built yet"
        description={arriving}
        action={
          <ButtonLink href="/" variant="secondary" size="sm">
            Return home
          </ButtonLink>
        }
      />
    </Container>
  );
}
