import { CircleAlert } from "lucide-react";
import { summariseDropped, type DroppedSlug } from "@/lib/compare-slug";
import { cn } from "@/lib/utils";

/** Most values listed per reason before "and N more". */
const LIST_LIMIT = 4;

/**
 * Says what the page left out of the comparison and why, instead of silently
 * ignoring part of a shared link. The address bar is rewritten to the cars
 * that remain, so this is the only place the dropped values are still named.
 */
export function CompareNotice({
  dropped,
  className,
}: {
  dropped: DroppedSlug[];
  className?: string;
}) {
  const groups = summariseDropped(dropped);
  if (groups.length === 0) return null;
  const count = groups.reduce((total, group) => total + group.values.length, 0);

  return (
    <section
      role="status"
      aria-label="Left out of this comparison"
      className={cn(
        "rounded-sm border border-gold-800 bg-gold-500/[0.04] px-5 py-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <CircleAlert
          className="mt-0.5 size-4 shrink-0 text-gold-400"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-ink-100">
            {count === 1
              ? "One entry in this link was left out of the comparison."
              : `${count} entries in this link were left out of the comparison.`}
          </p>
          <ul className="mt-3 space-y-2">
            {groups.map((group) => {
              const shown = group.values.slice(0, LIST_LIMIT);
              const more = group.values.length - shown.length;
              return (
                <li key={group.reason} className="text-xs leading-relaxed text-ink-400">
                  <span className="text-ink-200">{capitalise(group.label)}:</span>{" "}
                  {shown.map((value, index) => (
                    <span key={value}>
                      {index > 0 ? ", " : null}
                      <code className="font-mono break-all text-ink-300">{value}</code>
                    </span>
                  ))}
                  {more > 0 ? ` and ${more} more` : null}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
