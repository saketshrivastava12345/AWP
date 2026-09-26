import Link from "next/link";
import { cn } from "@/lib/utils";
import { EM_DASH } from "@/lib/format";
import { buildCompareRows, type CompareGroup } from "@/lib/compare-rows";
import type { VariantDetail } from "@/types/domain";
import { toCompareSlug } from "@/lib/queries/compare";

/**
 * Side-by-side comparison table.
 *
 * Two rules carried straight from the data-honesty requirement:
 *   - a value the manufacturer does not publish shows an em dash, never a zero
 *     or an estimate
 *   - "best in row" is only highlighted when at least two cars actually have a
 *     value for it. Crowning the only car with a figure would imply it beat the
 *     others, when in fact they simply did not publish.
 */
export function CompareTable({ cars }: { cars: VariantDetail[] }) {
  const groups: CompareGroup[] = buildCompareRows(cars);

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[42rem] border-collapse text-sm">
        <caption className="sr-only">
          Specification comparison of {cars.length} cars
        </caption>

        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-10 border-r border-b border-line bg-surface-1 p-4 text-left align-bottom"
            >
              <span className="text-label">Specification</span>
            </th>
            {cars.map((car) => {
              const slug = toCompareSlug({
                manufacturer_slug: car.manufacturer.slug,
                model_slug: car.model.slug,
                variant_slug: car.variant.slug,
              });
              return (
                <th
                  key={car.variant.id}
                  scope="col"
                  className="min-w-[11rem] border-b border-line p-4 text-left align-bottom"
                >
                  <span className="block text-label">{car.manufacturer.name}</span>
                  <Link
                    href={slug ? `/cars/${slug}` : "/cars"}
                    className="mt-2 block font-display text-sm tracking-[0.04em] text-ink-50 transition-colors hover:text-gold-300"
                  >
                    {car.model.name}
                  </Link>
                  <span className="mt-1 block text-xs text-ink-400">
                    {car.variant.name}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        {groups.map((group) => (
          <tbody key={group.title}>
            <tr>
              <th
                scope="colgroup"
                colSpan={cars.length + 1}
                className="border-y border-line bg-surface-2/60 px-4 py-2.5 text-left"
              >
                <span className="font-display text-[10px] tracking-[0.18em] text-ink-200 uppercase">
                  {group.title}
                </span>
              </th>
            </tr>

            {group.rows.map((row) => (
              <tr key={row.label} className="border-b border-line-subtle">
                <th
                  scope="row"
                  className="sticky left-0 z-10 border-r border-line-subtle bg-surface-1 p-4 text-left align-top font-normal"
                >
                  <span className="text-xs text-ink-400" title={row.hint ?? undefined}>
                    {row.label}
                  </span>
                </th>

                {row.cells.map((cell, index) => (
                  <td
                    key={`${row.label}-${index}`}
                    className={cn(
                      "tabular p-4 align-top font-mono text-xs",
                      cell.value === null
                        ? "text-ink-600"
                        : cell.isBest
                          ? "text-signal-positive"
                          : "text-ink-100",
                    )}
                  >
                    {cell.value ?? EM_DASH}
                    {cell.isBest ? (
                      <span className="sr-only"> (best of the compared cars)</span>
                    ) : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
