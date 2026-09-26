import type { Metadata } from "next";
import { Factory } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ManufacturerCard } from "@/components/manufacturers/ManufacturerCard";
import { listManufacturers } from "@/lib/queries/manufacturers";

export const metadata: Metadata = {
  title: "Manufacturers",
  description:
    "The marques behind the machines: founding, headquarters, specialisation and the models they build.",
};

export default async function ManufacturersPage() {
  const manufacturers = await listManufacturers();

  // Grouped by country so the list reads as an atlas rather than a flat A–Z.
  const byCountry = new Map<string, typeof manufacturers>();
  for (const maker of manufacturers) {
    const key = maker.country?.name ?? "Other";
    const existing = byCountry.get(key);
    if (existing) existing.push(maker);
    else byCountry.set(key, [maker]);
  }
  const groups = [...byCountry.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <Container className="py-16">
      <header>
        <p className="text-label">Marques</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          THE MAKERS
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-300">
          {manufacturers.length} manufacturers across {groups.length} countries, each with
          the history that explains what it builds and why.
        </p>
      </header>

      {manufacturers.length === 0 ? (
        <EmptyState
          className="mt-14"
          icon={<Factory className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="No manufacturers found"
          description="The catalogue could not be reached. Reloading often resolves it."
        />
      ) : (
        <div className="mt-14 space-y-16">
          {groups.map(([countryName, makers]) => (
            <section key={countryName} aria-labelledby={`country-${countryName}`}>
              <h2
                id={`country-${countryName}`}
                className="border-b border-line pb-3 font-display text-xs tracking-[0.18em] text-ink-200 uppercase"
              >
                {makers[0]?.country?.flag_emoji} {countryName}
              </h2>
              <div className="mt-6 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
                {makers.map((maker) => (
                  <ManufacturerCard key={maker.id} manufacturer={maker} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Container>
  );
}
