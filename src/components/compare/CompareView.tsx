import { countRows, type CompareCarSummary, type CompareGroup } from "@/lib/compare-rows";
import type { ComparePickerOption } from "@/lib/queries/compare";
import { CompareCards } from "./CompareCards";
import { CompareHeader } from "./CompareHeader";
import { CompareShell } from "./CompareShell";
import { CompareTable } from "./CompareTable";

/**
 * Two to four cars side by side. Server-rendered: the table (768px and up)
 * and the per-figure cards (below) are both in the HTML and swapped by CSS,
 * so there is no layout jump on hydration and each works without JavaScript.
 * CompareShell adds the toolbar and the "differences only" switch around them.
 */
export function CompareView({
  cars,
  groups,
  options,
  truncated,
}: {
  cars: CompareCarSummary[];
  groups: CompareGroup[];
  options: ComparePickerOption[];
  truncated: boolean;
}) {
  const anchor = options.find((option) => option.slug === cars[0]?.slug) ?? null;

  return (
    <CompareShell
      options={options}
      truncated={truncated}
      anchor={anchor}
      carNames={cars.map((car) => car.fullName)}
      counts={countRows(groups)}
    >
      <h2 className="sr-only">Specifications side by side</h2>

      <div className="mt-6 md:mt-8">
        <CompareHeader cars={cars} />
      </div>

      <div className="mt-8 md:hidden">
        <CompareCards cars={cars} groups={groups} />
      </div>

      <div className="hidden md:block">
        <CompareTable cars={cars} groups={groups} />
      </div>
    </CompareShell>
  );
}
