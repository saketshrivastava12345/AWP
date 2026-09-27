import { cn } from "@/lib/utils";
import {
  FEATURE_CHAPTER_ORDER,
  FEATURE_CHAPTERS,
  groupFeatures,
  type FeatureChapterId,
  type FeatureEntry,
} from "@/lib/detail/features";
import { DetailHeading } from "./DetailHeading";

export {
  groupFeatures,
  FEATURE_CHAPTERS,
  type FeatureChapterId,
} from "@/lib/detail/features";

/**
 * The features catalogued for a variant, placed in the chapter they belong to.
 *
 *   technology    Driver Assistance, Lighting, EV
 *   interior      Interior
 *   aerodynamics  Aerodynamics
 *   chassis       Chassis, Braking, Drivetrain  ("Chassis & Brakes")
 *   other         any category not mapped yet
 *
 * FeatureGroup props:
 *   features      VariantDetail.features (all of them — the group filters)
 *   group         which chapter to render
 *   title         optional heading override
 *   headingLevel  default 3
 * Renders nothing when the car has no feature in that group.
 *
 * FeatureSections props: { features, groups? } — every non-empty group in
 * order (or only `groups`), for pages that want them together.
 *
 * Each item shows the feature's name, the note catalogued for THIS car (when
 * there is one), and the feature's general description.
 */
export function FeatureGroup({
  features,
  group,
  title,
  headingLevel = 3,
  className,
}: {
  features: readonly FeatureEntry[];
  group: FeatureChapterId;
  title?: string;
  headingLevel?: 2 | 3;
  className?: string;
}) {
  const entries = groupFeatures(features)[group];
  if (entries.length === 0) return null;
  const chapter = FEATURE_CHAPTERS[group];
  const headingId = `features-${group}-heading`;

  return (
    <section aria-labelledby={headingId} className={cn("relative", className)}>
      <DetailHeading
        id={headingId}
        level={headingLevel}
        title={title ?? sentenceCase(chapter.title)}
        note={`${entries.length} catalogued`}
      />
      <ul className="mt-8 grid gap-x-16 md:grid-cols-2">
        {entries.map(({ feature, detail }) => (
          <li key={feature.id} className="border-t border-line py-6">
            <div className="flex items-baseline justify-between gap-4">
              <h4 className="text-h4">{feature.name}</h4>
              {feature.category ? (
                <span className="shrink-0 text-caption">{feature.category}</span>
              ) : null}
            </div>
            {detail?.trim() ? (
              <p className="mt-2 text-body-s text-ink-100">
                <span className="sr-only">On this car: </span>
                {detail}
              </p>
            ) : null}
            {feature.description?.trim() ? (
              <p className="mt-2 text-body-s text-ink-400">{feature.description}</p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Chassis & Brakes" → "Chassis & brakes": headings are sentence case. */
function sentenceCase(text: string): string {
  return text
    .split(" ")
    .map((word, index) =>
      index === 0 || word === word.toUpperCase() ? word : word.toLowerCase(),
    )
    .join(" ");
}

export function FeatureSections({
  features,
  groups = FEATURE_CHAPTER_ORDER,
  className,
}: {
  features: readonly FeatureEntry[];
  groups?: readonly FeatureChapterId[];
  className?: string;
}) {
  const grouped = groupFeatures(features);
  const present = groups.filter((group) => grouped[group].length > 0);
  if (present.length === 0) return null;
  return (
    <div className={cn("space-y-14", className)}>
      {present.map((group) => (
        <FeatureGroup key={group} features={features} group={group} />
      ))}
    </div>
  );
}
