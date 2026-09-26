import type { Metadata } from "next";
import { Boxes } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PartCard } from "@/components/parts/PartCard";
import { listPartCategories } from "@/lib/queries/parts";

export const metadata: Metadata = {
  title: "Parts Encyclopedia",
  description:
    "Anatomy of the machine: what every major component does, what it is made of, how it fails and what it contributes to performance.",
};

export default async function PartsPage() {
  const categories = await listPartCategories();
  const totalParts = categories.reduce((sum, category) => sum + category.parts.length, 0);

  return (
    <Container className="py-16">
      <header>
        <p className="text-label">Anatomy of the Machine</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          COMPONENTS, EXPLAINED
        </h1>
        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink-300">
          {totalParts} components across {categories.length} systems — what each one does,
          what it is made of, how it fails, and what it actually contributes.
        </p>
      </header>

      {categories.length === 0 ? (
        <EmptyState
          className="mt-14"
          icon={<Boxes className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="No parts found"
          description="The catalogue could not be reached. Reloading often resolves it."
        />
      ) : (
        <>
          <nav aria-label="Part categories" className="mt-12 border-y border-line py-4">
            <ul className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#${category.slug}`}
                    className="rounded-xs border border-line px-3 py-1.5 text-xs text-ink-400 transition-colors duration-200 hover:border-gold-700 hover:text-gold-300"
                  >
                    {category.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="mt-16 space-y-16">
            {categories.map((category) => (
              <section
                key={category.id}
                id={category.slug}
                aria-labelledby={`${category.slug}-heading`}
                className="scroll-mt-28"
              >
                <h2
                  id={`${category.slug}-heading`}
                  className="font-display text-sm tracking-[0.18em] text-ink-50 uppercase"
                >
                  {category.name}
                </h2>
                {category.description ? (
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-400">
                    {category.description}
                  </p>
                ) : null}
                <div className="mt-7 grid gap-px sm:grid-cols-2 lg:grid-cols-3">
                  {category.parts.map((part) => (
                    <PartCard key={part.id} part={part} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </Container>
  );
}
