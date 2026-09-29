import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { IndexHero } from "@/components/manufacturers/IndexHero";
import { PartsExplorer, type ExplorerCategory } from "@/components/parts/PartsExplorer";
import { firstSentence, normalizeSearch } from "@/components/parts/parts-helpers";
import { GROUP_LABELS } from "@/components/3d/viewer-config";
import { getPartsIndex, type PartsIndexCategory } from "@/lib/queries/parts";
import { formatNumber } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";

const DESCRIPTION =
  "Anatomy of the machine: what every major component does, what it is made of, where it sits, how it fails and what it contributes to performance.";

export const metadata: Metadata = {
  title: "Parts Encyclopedia",
  description: DESCRIPTION,
  alternates: { canonical: `${siteConfig.url}/parts` },
  openGraph: {
    title: "Parts Encyclopedia",
    description: DESCRIPTION,
    type: "website",
    url: `${siteConfig.url}/parts`,
  },
};

/**
 * Only what a card shows plus one normalised search string travels to the
 * browser, not every paragraph of every part.
 */
function toExplorer(index: PartsIndexCategory[]): ExplorerCategory[] {
  return index.map((category) => ({
    id: category.id,
    slug: category.slug,
    name: category.name,
    description: category.description,
    parts: category.parts.map((part) => {
      const systemLabel = part.viewer_group ? GROUP_LABELS[part.viewer_group] : null;
      return {
        id: part.id,
        slug: part.slug,
        name: part.name,
        summary: firstSentence(part.function ?? part.description),
        systemLabel,
        usageCount: part.usageCount,
        search: normalizeSearch(
          [
            part.name,
            category.name,
            systemLabel,
            part.function,
            part.description,
            part.typical_materials,
          ]
            .filter(Boolean)
            .join(" "),
        ),
      };
    }),
  }));
}

export default async function PartsPage() {
  const index = await getPartsIndex();
  const parts = index.flatMap((category) => category.parts);
  const hasData = parts.length > 0;

  return (
    <>
      <IndexHero
        title="Parts encyclopedia"
        lead={
          <p>
            What each component does, what it is made of, where it sits, how it fails and
            what it actually contributes.
            {hasData
              ? ` ${formatNumber(parts.length)} components in ${formatNumber(index.length)} categories: filter by name, material or job, or open a category.`
              : null}
          </p>
        }
      />

      <Container className="pb-24 lg:pb-32">
        {hasData ? (
          <PartsExplorer categories={toExplorer(index)} />
        ) : (
          <EmptyState
            icon={<Boxes className="size-7" strokeWidth={1.25} aria-hidden="true" />}
            title="The encyclopedia is unavailable"
            description="The catalogue could not be reached just now, so there are no components to show. Reloading the page usually resolves it."
          />
        )}

        <p className="mt-20 max-w-[68ch] border-t border-line-subtle pt-8 text-caption">
          Component descriptions are general engineering explanations, not specific to any
          one vehicle. Where a car&apos;s own component differs, its page says so.
        </p>
      </Container>
    </>
  );
}
