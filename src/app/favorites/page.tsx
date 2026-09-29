import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { GlowOrbs, GridBackground, ScrambleText } from "@/components/fx";
import { FavoritesView } from "@/components/account/FavoritesView";
import { RecentlyViewed } from "@/components/account/RecentlyViewed";

export const metadata: Metadata = {
  title: "Saved cars",
  description: "The cars you have saved, and the ones you looked at recently.",
  robots: { index: false, follow: false },
};

/**
 * Saved cars and recently viewed — the garage.
 *
 * A static shell: the lists come from the client favourites store (the
 * account's list when signed in, this browser's otherwise), so this route
 * never reads a cookie on the server and stays prerendered.
 */
export default function FavoritesPage() {
  return (
    <div className="relative isolate overflow-x-clip">
      <GlowOrbs tone="cyan" className="max-h-[48rem]" />
      <GridBackground size={56} className="max-h-[42rem]" />
      <Container className="relative pt-12 pb-24 sm:pt-16 lg:pt-20 lg:pb-32">
        <p className="flex items-center gap-3 text-eyebrow">
          <span
            aria-hidden="true"
            className="h-px w-8 shrink-0 bg-cyan-400 shadow-[0_0_8px_var(--color-cyan-400)]"
          />
          Garage
          <span aria-hidden="true" className="hud-label text-ink-600">
            {"// "}SAVED
          </span>
        </p>
        <h1 className="mt-4 text-h1">
          <ScrambleText text="Saved cars" />
        </h1>

        <noscript>
          <p className="mt-6 max-w-xl text-body">
            Saved cars are kept by your browser and loaded with JavaScript, which is
            turned off. Everything else on AURIX works without it.
          </p>
        </noscript>

        <FavoritesView />
        <RecentlyViewed className="mt-24 lg:mt-32" />
      </Container>
    </div>
  );
}
