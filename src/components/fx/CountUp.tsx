import { cn } from "@/lib/utils";
import { parseCount } from "./count-format";

/**
 * A number that counts up from zero to its real value the first time it
 * scrolls into view.
 *
 * Data honesty: the server renders the FINAL value, and that exact string is
 * what stays in the layout and is read by assistive technology; the counting
 * digits are an aria-hidden overlay the FX runtime fills only while it runs.
 * At rest the page never shows a number other than the real one.
 *
 * - `value` may be a pre-formatted string ("1,020", "3.2", "₹ 1,23,000") —
 *   preferred, so it matches the site's formatters exactly — or a number.
 * - `null`/`undefined` renders nothing: the caller shows "Not available".
 * - A string with no digits is rendered as is, without animation.
 * - Reduced motion: no animation.
 */
export function CountUp({
  value,
  decimals,
  duration,
  className,
}: {
  value: number | string | null | undefined;
  /** For a number value: fixed decimals (default: its own, max 2). */
  decimals?: number;
  /** Animation length in ms (default 1400). */
  duration?: number;
  className?: string;
}) {
  if (value === null || value === undefined) return null;
  const spec = parseCount(value, decimals);
  if (!spec) return <span className={className}>{String(value)}</span>;

  return (
    <span
      className={cn("fx-count", className)}
      data-countup={spec.target}
      data-decimals={spec.decimals || undefined}
      data-group={spec.grouping === "none" ? undefined : spec.grouping}
      data-prefix={spec.prefix || undefined}
      data-suffix={spec.suffix || undefined}
      data-duration={duration}
    >
      <span className="fx-count-final">{spec.final}</span>
      <span className="fx-count-live" aria-hidden="true" />
    </span>
  );
}
