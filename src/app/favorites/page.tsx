import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { FavoritesView } from "@/components/account/FavoritesView";
import { RecentlyViewed } from "@/components/account/RecentlyViewed";

export const metadata: Metadata = {
  title: "Saved cars",
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
    <Container className="pt-12 pb-24 sm:pt-16 lg:pt-20 lg:pb-32">
      <h1 className="text-h1">Saved cars</h1>

      <noscript>
        <p className="mt-6 max-w-xl text-body">
          Saved cars are kept by your browser and loaded with JavaScript, which is turned
          off. Everything else on AURIX works without it.
        </p>
      </noscript>

      <FavoritesView />
      <RecentlyViewed className="mt-24 lg:mt-32" />
    </Container>
  );
}
