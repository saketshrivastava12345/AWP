import type { Metadata } from "next";
import { Heart } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";
import { CarGrid } from "@/components/cars/CarGrid";
import { listFavorites } from "@/lib/queries/favorites";
import { getSessionUser } from "@/lib/queries/auth";

export const metadata: Metadata = {
  title: "Saved Cars",
  description: "The cars you have saved.",
  robots: { index: false, follow: false },
};

export default async function FavoritesPage() {
  const user = await getSessionUser();

  if (!user) {
    return (
      <Container className="py-16">
        <p className="text-label">Account</p>
        <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
          SAVED CARS
        </h1>
        <EmptyState
          className="mt-14"
          icon={<Heart className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="Sign in to see your saved cars"
          description="Your favourites are private to your account and are enforced by row level security in the database."
          action={<ButtonLink href="/login">Sign in</ButtonLink>}
        />
      </Container>
    );
  }

  const cars = await listFavorites();

  return (
    <Container className="py-16">
      <p className="text-label">Account</p>
      <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
        SAVED CARS
      </h1>
      <p className="mt-5 text-sm text-ink-400">
        Signed in as {user.displayName ?? user.email}
        {cars.length > 0 ? ` · ${cars.length} saved` : ""}
      </p>

      {cars.length === 0 ? (
        <EmptyState
          className="mt-14"
          icon={<Heart className="size-7" strokeWidth={1.25} aria-hidden="true" />}
          title="Nothing saved yet"
          description="Open any car and press “Save car” to keep it here."
          action={
            <ButtonLink href="/cars" variant="secondary" size="sm">
              Browse the collection
            </ButtonLink>
          }
        />
      ) : (
        <CarGrid cars={cars} className="mt-12" />
      )}
    </Container>
  );
}
