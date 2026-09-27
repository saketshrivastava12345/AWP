import { siteConfig } from "@/lib/site-config";
import { EM_DASH } from "@/lib/format";
import { powerConvention, type CompareCarSummary } from "@/lib/compare-rows";
import { CarMarker } from "./parts";

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
      className="mt-16 grid grid-cols-1 gap-10 border-t border-line pt-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16"
    >
      <div>
        <h2 id="compare-notes-heading" className="text-label">
          Reading this comparison
        </h2>
        <dl className="mt-5 space-y-5 text-sm leading-relaxed">
          <div>
            <dt className="text-ink-100">Power is quoted as each maker publishes it</dt>
            <dd className="mt-1 text-ink-400">
              Most European makers quote metric PS; US and Japanese makers quote SAE net
              hp. The two differ by about 1.4 %, so power figures that close across the
              two conventions are effectively level.
            </dd>
          </div>
          <div>
            <dt className="text-ink-100">Prices are never converted</dt>
            <dd className="mt-1 text-ink-400">
              Each price appears in the currency, type (base, list, ex-showroom) and
              market its source published. Prices in different currencies sit side by side
              as published and are never ranked against each other.
            </dd>
          </div>
          <div>
            <dt className="text-ink-100">Dashes and n/a mean different things</dt>
            <dd className="mt-1 text-ink-400">
              {EM_DASH} means the figure is not published, or not catalogued yet — never
              zero. For features, a dash means not catalogued, not &ldquo;not
              fitted&rdquo;. n/a means the figure does not apply to that powertrain, such
              as an electric car&rsquo;s displacement.
            </dd>
          </div>
          <div>
            <dt className="text-ink-100">Best and bars</dt>
            <dd className="mt-1 text-ink-400">
              A best figure is marked only when at least two cars publish it and they do
              not all tie. Bars are scaled within each row; where lower is better (0–100
              km/h, kerb weight) the scale is inverted, so the quickest or lightest car
              has the full bar. Figures from different test cycles are neither ranked nor
              scaled.
            </dd>
          </div>
        </dl>
      </div>

      <div>
        <h3 className="text-label">Performance sources, as recorded</h3>
        <ul className="mt-5 space-y-3">
          {cars.map((car, index) => {
            const convention = powerConvention(car.powerSource);
            return (
              <li key={car.slug} className="flex items-start gap-3 text-sm">
                <CarMarker index={index} className="mt-0.5" />
                <span className="min-w-0">
                  <span className="block text-ink-100">{car.fullName}</span>
                  <span className="block text-xs leading-relaxed text-ink-400">
                    {car.powerSource ?? "No performance source recorded"}
                    {convention ? ` — ${convention}` : ""}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-xs leading-relaxed text-ink-500">
          {siteConfig.disclaimer}
        </p>
      </div>
    </section>
  );
}
