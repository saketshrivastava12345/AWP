import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CompareCarSummary, CompareGroup } from "@/lib/compare-rows";
import { CompareValue } from "./CompareValue";
import { RowLabel } from "./parts";

/**
 * Column geometry shared with CompareHeader's photo grid, so each photograph
 * sits over its column. Below lg the label column is the only one before the
 * cars; from lg a group column is added on the left, holding each section's
 * title, which sticks while its rows scroll past.
 */
export const LABEL_COLUMN = {
  /** The group column (lg and up). */
  group: "hidden lg:table-cell lg:w-40 xl:w-48",
  /** The row-label column. */
  label: "w-32 lg:w-40 xl:w-44",
};

/**
 * The comparison as a real table, from 768px up.
 *
 * Column widths are fixed (`table-layout: fixed`, taken from the header
 * row's cells) and the cars share the rest evenly, so nothing scrolls
 * sideways. The header row (each car's make and name) sticks under the
 * navbar while the rows scroll, so the reader never loses track of which
 * column is which; CompareShell measures its height into `--cmp-head-h` so
 * the group titles can stick just below it. It can stick because the table
 * is not inside an overflow container.
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
  const stuck = "sticky top-(--nav-offset) z-(--z-sticky) bg-void/92 backdrop-blur-md";

  return (
    <table className="w-full table-fixed border-separate border-spacing-0">
      <caption className="sr-only">
        Specifications of {cars.map((car) => car.fullName).join(", ")}, side by side
      </caption>

      <thead data-compare-head="">
        <tr>
          <td
            aria-hidden="true"
            className={cn(LABEL_COLUMN.group, stuck, "border-b border-line")}
          />
          <th
            scope="col"
            className={cn(
              LABEL_COLUMN.label,
              stuck,
              "border-b border-line py-4 pr-4 text-left align-bottom font-normal",
            )}
          >
            <span className="sr-only">Specification</span>
          </th>
          {cars.map((car) => (
            <th
              key={car.slug}
              scope="col"
              className={cn(
                stuck,
                "border-b border-line px-3 py-4 text-left align-bottom font-normal",
              )}
            >
              <span
                aria-hidden="true"
                className="mb-2 block h-0.5 w-6 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
              />
              <span className="block font-mono text-[11px] tracking-hud text-cyan-200 uppercase">
                {car.manufacturer}
              </span>
              <Link
                href={car.href}
                className="mt-0.5 inline-block fx-link text-body-s font-display font-medium text-ink-50 transition-colors hover:text-cyan-100 lg:text-h4"
              >
                {car.shortName}
              </Link>
            </th>
          ))}
        </tr>
      </thead>

      {groups.map((group) => {
        const headingId = `compare-table-${group.id}`;
        return (
          <tbody
            key={group.id}
            data-bar-group=""
            aria-labelledby={headingId}
            className={cn(
              "group/bars",
              !group.differs && "group-data-[diff=on]/cmp:hidden",
            )}
          >
            {/* Below lg: the section title as a full-width row. */}
            <tr className="lg:hidden">
              <th
                scope="colgroup"
                colSpan={cars.length + 1}
                className="border-b border-line pt-14 pb-4 text-left font-normal"
              >
                <GroupTitle group={group} id={headingId} />
              </th>
            </tr>

            {group.rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={cn(
                  "transition-colors duration-(--duration-fast) hover:bg-cyan-400/5",
                  !row.differs && "group-data-[diff=on]/cmp:hidden",
                )}
              >
                {/* From lg: the section title in its own column, sticky. */}
                {rowIndex === 0 ? (
                  <th
                    scope="rowgroup"
                    rowSpan={group.rows.length}
                    className="hidden border-b border-line bg-void pt-14 pr-6 text-left align-top font-normal lg:table-cell"
                  >
                    <div className="sticky top-[calc(var(--nav-offset)+var(--cmp-head-h,5rem)+1.5rem)] pb-6">
                      <GroupTitle group={group} id={`${headingId}-side`} />
                    </div>
                  </th>
                ) : null}
                <th
                  scope="row"
                  className={cn(
                    "border-b border-line-subtle py-4 pr-4 text-left align-top font-normal",
                    rowIndex === 0 && "lg:pt-14",
                  )}
                >
                  <RowLabel row={row} />
                </th>
                {row.cells.map((cell, carIndex) => (
                  <td
                    key={cars[carIndex]?.slug ?? carIndex}
                    className={cn(
                      "border-b border-line-subtle px-3 py-4 align-top",
                      rowIndex === 0 && "lg:pt-14",
                    )}
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
        );
      })}
    </table>
  );
}

/**
 * A section's title and note. Rendered in two places (a full-width row below
 * lg, the sticky side column from lg); CSS shows exactly one, so a screen
 * reader meets each title once.
 */
function GroupTitle({ group, id }: { group: CompareGroup; id: string }) {
  return (
    <>
      <span aria-hidden="true" className="mb-3 block hud-label">
        Data // {group.id.replace(/-/g, " ")}
      </span>
      <h3 id={id} className="text-h3">
        {group.title}
      </h3>
      {group.note ? <p className="mt-2 max-w-[60ch] text-caption">{group.note}</p> : null}
    </>
  );
}
