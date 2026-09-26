import type { Metadata } from "next";
import { Globe } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { CountryCard } from "@/components/countries/CountryCard";
import { WorldMap } from "@/components/countries/WorldMap";
import { listCountries } from "@/lib/queries/countries";

export const metadata: Metadata = {
  title: "Countries",
  description:
    "Automotive nations: the engineering traditions that shaped how each country's cars are built.",
};

export default async function CountriesPage() {
  const countries = await listCountries();

  return (
    <Container className="py-16">
      <header>
        <p className="text-label">Origins</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          AUTOMOTIVE NATIONS
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-300">
          Where a car is engineered shapes what it is engineered for. These are the
          traditions behind the catalogue.
        </p>
      </header>

      {countries.length === 0 ? (
        <EmptyState
          className="mt-14"
          icon={<Globe className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="No countries found"
          description="The catalogue could not be reached. Reloading often resolves it."
        />
      ) : (
        <>
          {/* Hidden below md, where the card grid is the better interaction. */}
          <WorldMap countries={countries} />

          <div className="mt-14 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
            {countries.map((country) => (
              <CountryCard key={country.id} country={country} />
            ))}
          </div>
        </>
      )}
    </Container>
  );
}
