import Link from "next/link";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompareCarSummary, CompareGroup } from "@/lib/compare-rows";
import { CompareLink } from "./CompareState";
import { CompareValue } from "./CompareValue";
import { CarMarker, RowLabel } from "./parts";

/**
 * The comparison as a real table, from 768px up.
 *
 * Column widths are fixed (`table-layout: fixed`) — the label column is
 * LABEL_COLUMN and the cars share the rest evenly — so nothing scrolls
 * sideways, and CompareHeader's photo grid above lines up with the columns.
 * The header row (each car's name and its remove control) sticks under the
 * navbar while the rows scroll, so the reader never loses track of which
 * column is which. It can stick because the table is not inside an overflow
 * container.
 *
 * Rows that do not differ carry a class that hides them when the shell is in
 * "differences only" mode; the switch lives in CompareShell.
 */
export function CompareTable({
  cars,
  groups,
}: {
  cars: CompareCarSummary[];
  groups: CompareGroup[];
}) {
  const others = (slug: string) => cars.map((car) => car.slug).filter((s) => s !== slug);

  return (
    <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
      <caption className="sr-only">
        Specifications of {cars.map((car) => car.fullName).join(", ")}, side by side
      </caption>
      <colgroup>
        <col className="w-28 lg:w-52" />
        {cars.map((car) => (
          <col key={car.slug} />
        ))}
      </colgroup>

      <thead>
        {/* Names — sticky. */}
        <tr>
          <th
            scope="col"
            className="sticky top-16 z-(--z-sticky) border-b border-line-strong bg-void/92 py-3 pr-4 text-left align-bottom backdrop-blur-md"
          >
            <span className="hidden text-label lg:inline">Specification</span>
          </th>
          {cars.map((car, index) => (
            <th
              key={car.slug}
              scope="col"
              className="sticky top-16 z-(--z-sticky) border-b border-line-strong bg-void/92 px-2 py-3 text-left align-top font-normal backdrop-blur-md lg:px-3"
            >
              <div className="flex items-start gap-2 pr-7">
                <CarMarker index={index} className="mt-0.5 hidden lg:grid" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-display text-micro tracking-[0.12em] text-ink-400 uppercase lg:tracking-[0.2em]">
                    {car.manufacturer}
                  </span>
                  <Link
                    href={car.href}
                    className="mt-1 block font-display text-[11px] leading-snug tracking-[0.03em] break-words hyphens-auto text-ink-50 transition-colors hover:text-gold-300 lg:text-[13px] lg:tracking-[0.04em]"
                  >
                    {car.shortName}
                  </Link>
                </div>
              </div>
              <CompareLink
                to={others(car.slug)}
                aria-label={`Remove ${car.fullName} from the comparison`}
                className="absolute top-1 right-0 grid size-11 place-items-center rounded-sm text-ink-500 transition-colors hover:bg-surface-2 hover:text-signal-negative"
              >
                <X className="size-4" aria-hidden="true" />
              </CompareLink>
            </th>
          ))}
        </tr>
      </thead>

      {groups.map((group) => (
        <tbody
          key={group.id}
          data-bar-group=""
          className={cn(
            "group/bars",
            !group.differs && "group-data-[diff=on]/cmp:hidden",
          )}
        >
          <tr>
            <th
              scope="colgroup"
              colSpan={cars.length + 1}
              className="border-b border-line pt-10 pb-3 text-left font-normal"
            >
              <span className="font-display text-[11px] tracking-[0.2em] text-gold-300 uppercase">
                {group.title}
              </span>
              {group.note ? (
                <span className="mt-1.5 block text-xs text-ink-500">{group.note}</span>
              ) : null}
            </th>
          </tr>

          {group.rows.map((row, rowIndex) => (
            <tr
              key={row.id}
              className={cn(
                "transition-colors hover:bg-surface-1/60",
                !row.differs && "group-data-[diff=on]/cmp:hidden",
              )}
            >
              <th
                scope="row"
                className="border-b border-line-subtle pt-4 pr-4 pb-3.5 text-left align-top font-normal"
              >
                <RowLabel row={row} />
              </th>
              {row.cells.map((cell, carIndex) => (
                <td
                  key={cars[carIndex]?.slug ?? carIndex}
                  className="border-b border-line-subtle px-2 py-3.5 align-top lg:px-3"
                >
                  <CompareValue
                    row={row}
                    cell={cell}
                    rowIndex={rowIndex}
                    carIndex={carIndex}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      ))}
    </table>
  );
}
