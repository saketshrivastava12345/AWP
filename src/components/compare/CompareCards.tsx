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
 * horizontal scrolling. Group titles stick under the navbar so the reader
 * always knows which section a card belongs to.
 */
export function CompareCards({
  cars,
  groups,
}: {
  cars: CompareCarSummary[];
  groups: CompareGroup[];
}) {
  return (
    <div className="space-y-10">
      {groups.map((group) => {
        const headingId = `compare-group-${group.id}`;
        return (
          <section
            key={group.id}
            aria-labelledby={headingId}
            data-bar-group=""
            className={cn(
              "group/bars",
              !group.differs && "group-data-[diff=on]/cmp:hidden",
            )}
          >
            <div className="sticky top-16 z-(--z-sticky) -mx-5 border-b border-line bg-void/92 px-5 py-3 backdrop-blur-md sm:-mx-8 sm:px-8">
              <h3
                id={headingId}
                className="font-display text-[11px] tracking-[0.2em] text-gold-300 uppercase"
              >
                {group.title}
              </h3>
            </div>
            {group.note ? (
              <p className="mt-3 text-xs leading-relaxed text-ink-500">{group.note}</p>
            ) : null}

            <ul className="mt-4 space-y-3">
              {group.rows.map((row, rowIndex) => (
                <li
                  key={row.id}
                  className={cn(
                    "rounded-sm border border-line bg-surface-1/60 px-4 py-3.5",
                    !row.differs && "group-data-[diff=on]/cmp:hidden",
                  )}
                >
                  <RowLabel row={row} placement="card" />
                  <dl className="mt-3 space-y-2.5">
                    {row.cells.map((cell, carIndex) => {
                      const car = cars[carIndex];
                      if (!car) return null;
                      return (
                        <div key={car.slug}>
                          <div className="flex items-baseline justify-between gap-3">
                            <dt className="flex min-w-0 flex-1 items-center gap-2 text-xs text-ink-400">
                              <CarMarker index={carIndex} className="self-center" />
                              <span className="truncate">{car.shortName}</span>
                            </dt>
                            <dd className="max-w-[62%] min-w-0 shrink-0 text-right">
                              <ValueText row={row} cell={cell} className="justify-end" />
                            </dd>
                          </div>
                          <ValueNote cell={cell} className="mt-0.5 pl-7 text-right" />
                          <CompareBar
                            row={row}
                            cell={cell}
                            delay={barDelay(rowIndex, carIndex)}
                            className="mt-1.5 ml-7 w-[calc(100%-1.75rem)]"
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
  );
}
