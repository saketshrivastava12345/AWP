import { siteConfig } from "@/lib/site-config";
import { EM_DASH } from "@/lib/format";
import { powerConvention, type CompareCarSummary } from "@/lib/compare-rows";

/**
 * What the reader needs to know to read the comparison fairly: how power is
 * quoted, why prices are not ranked, and what a dash means. Each car's
 * performance source is listed as recorded, so the power convention can be
 * checked rather than taken on trust.
 */
export function CompareNotes({ cars }: { cars: CompareCarSummary[] }) {
  return (
    <section
      aria-labelledby="compare-notes-heading"
      className="mt-24 grid grid-cols-1 gap-12 border-t border-line pt-12 lg:mt-32 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16 lg:pt-16"
    >
      <div>
        <h2 id="compare-notes-heading" className="text-h3">
          Reading this comparison
        </h2>
        <dl className="mt-8 grid gap-x-10 gap-y-7 text-body-s sm:grid-cols-2">
          <div>
            <dt className="font-medium text-ink-100">
              Power is quoted as each maker publishes it
            </dt>
            <dd className="mt-1.5 text-ink-400">
              Most European makers quote metric PS; US and Japanese makers quote SAE net
              hp. The two differ by about 1.4 %, so power figures that close across the
              two conventions are effectively level.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">Prices are never converted</dt>
            <dd className="mt-1.5 text-ink-400">
              Each price appears in the currency, type (base, list, ex-showroom) and
              market its source published. Prices in different currencies sit side by side
              as published and are never ranked against each other.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">
              A dash and &ldquo;Not applicable&rdquo; mean different things
            </dt>
            <dd className="mt-1.5 text-ink-400">
              {EM_DASH} means the figure is not published, or not catalogued yet — never
              zero. For features, a dash means not catalogued, not &ldquo;not
              fitted&rdquo;. Not applicable means the figure does not apply to that
              powertrain, such as an electric car&rsquo;s displacement.
            </dd>
          </div>
          <div>
            <dt className="font-medium text-ink-100">Best and bars</dt>
            <dd className="mt-1.5 text-ink-400">
              A best figure is marked only when at least two cars publish it and they do
              not all tie. Bars appear on the headline performance figures only, scaled
              within each row; where lower is better (0–100 km/h) the scale is inverted,
              so the quickest car has the full bar. Kerb weight is not ranked, and figures
              from different test cycles are neither ranked nor scaled.
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-h4">Performance sources, as recorded</h3>
        <ul className="mt-6 space-y-4">
          {cars.map((car) => {
            const convention = powerConvention(car.powerSource);
            return (
              <li key={car.slug} className="text-body-s">
                <span className="min-w-0">
                  <span className="block text-ink-100">{car.fullName}</span>
                  <span className="mt-0.5 block text-caption">
                    {car.powerSource ?? "No performance source recorded"}
                    {convention ? ` — ${convention}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-10 text-caption">{siteConfig.disclaimer}</p>
      </div>
    </section>
  );
}
