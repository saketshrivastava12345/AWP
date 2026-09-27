import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FavoritesView } from "@/components/account/FavoritesView";
import { RecentlyViewed } from "@/components/account/RecentlyViewed";

export const metadata: Metadata = {
  title: "Saved Cars",
  description: "The cars you have saved, and the ones you looked at recently.",
  robots: { index: false, follow: false },
};

/**
 * Saved cars and recently viewed.
 *
 * A static shell: the lists come from the client favourites store (the
 * account's list when signed in, this browser's otherwise), so this route
 * never reads a cookie on the server and stays prerendered.
 */
export default function FavoritesPage() {
  return (
    <Container className="py-14 sm:py-16">
      <p className="text-label">Your garage</p>
      <h1 className="mt-5 font-display text-2xl tracking-[0.06em] text-ink-50 sm:text-3xl">
        SAVED CARS
      </h1>

      <noscript>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-ink-300">
          Saved cars are kept by your browser and loaded with JavaScript, which is turned
          off. Everything else on AURIX works without it.
        </p>
      </noscript>

      <FavoritesView />
      <RecentlyViewed className="mt-20" />
    </Container>
  );
}
