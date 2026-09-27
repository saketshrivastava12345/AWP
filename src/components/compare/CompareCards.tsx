import { cn } from "@/lib/utils";
import type { CompareCarSummary, CompareGroup } from "@/lib/compare-rows";
import { barDelay, CompareBar, ValueNote, ValueText } from "./CompareValue";
import { CarMarker, RowLabel } from "./parts";

/**
 * The comparison below 768px: one card per figure, each car on its own line
 * with its value and bar.
 *
 * Chosen over a sideways-scrolling table because a comparison is read one
 * figure at a time — "which is quickest?" — and this keeps every car's answer
 * to that question on screen together, at a readable size, with no
 * horizontal scrolling. A slim header of the cars' names (numbered like the
 * lines in each card) sticks under the navbar the whole way down, so the
 * reader always knows which line is which car.
 */
export function CompareCards({
  cars,
  groups,
}: {
  cars: CompareCarSummary[];
  groups: CompareGroup[];
}) {
  return (
    <div>
      <div
        aria-hidden="true"
        className="sticky top-(--nav-offset) z-(--z-sticky) -mx-5 border-b border-line bg-void/92 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8"
      >
        <ol
          className="grid gap-x-4 gap-y-2"
          style={{
            gridTemplateColumns: `repeat(${Math.min(cars.length, 2)}, minmax(0, 1fr))`,
          }}
        >
          {cars.map((car, index) => (
            <li key={car.slug} className="flex min-w-0 items-start gap-2">
              <CarMarker index={index} />
              <span className="min-w-0 text-caption leading-snug text-ink-100">
                {car.shortName}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div className="space-y-12 pt-4">
        {groups.map((group) => {
          const headingId = `compare-group-${group.id}`;
          return (
            <section
              key={group.id}
              aria-labelledby={headingId}
              data-bar-group=""
              className={cn(
                "group/bars pt-6",
                !group.differs && "group-data-[diff=on]/cmp:hidden",
              )}
            >
              <span aria-hidden="true" className="mb-3 block hud-label">
                Data // {group.id.replace(/-/g, " ")}
              </span>
              <h3 id={headingId} className="text-h3">
                {group.title}
              </h3>
              {group.note ? <p className="mt-2 text-caption">{group.note}</p> : null}

              <ul className="mt-5 space-y-2">
                {group.rows.map((row, rowIndex) => (
                  <li
                    key={row.id}
                    className={cn(
                      "relative rounded-card px-4 py-4 hud-panel",
                      !row.differs && "group-data-[diff=on]/cmp:hidden",
                    )}
                  >
                    <RowLabel row={row} placement="card" />
                    <dl className="mt-3 space-y-3">
                      {row.cells.map((cell, carIndex) => {
                        const car = cars[carIndex];
                        if (!car) return null;
                        return (
                          <div key={car.slug}>
                            <div className="flex items-baseline justify-between gap-3">
                              <dt className="flex min-w-0 flex-1 items-center gap-2 text-caption">
                                <CarMarker index={carIndex} className="self-center" />
                                <span className="truncate">{car.shortName}</span>
                              </dt>
                              <dd className="max-w-[62%] min-w-0 shrink-0 text-right">
                                <ValueText
                                  row={row}
                                  cell={cell}
                                  className="justify-end"
                                />
                              </dd>
                            </div>
                            <ValueNote cell={cell} className="mt-0.5 pl-7 text-right" />
                            <CompareBar
                              row={row}
                              cell={cell}
                              delay={barDelay(rowIndex, carIndex)}
                              className="mt-2 ml-7 w-[calc(100%-1.75rem)]"
                            />
                          </div>
                        );
                      })}
                    </dl>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
