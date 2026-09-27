import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site-config";
import { BOOT_FLAG_SCRIPT } from "@/lib/boot-script";
import { Navbar } from "@/components/layout/Navbar";
import {
  AccountMenu,
  AccountMenuFallback,
  AccountPanel,
  AccountPanelFallback,
  FavoritesCount,
} from "@/components/layout/AccountMenu";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { Footer } from "@/components/layout/Footer";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { LOADING_SCREEN_NOSCRIPT } from "@/components/layout/loading-screen-shared";
import { SearchProvider } from "@/components/layout/SearchProvider";
import { SetupNotice } from "@/components/layout/SetupNotice";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

const defaultTitle = `${siteConfig.name} — ${siteConfig.tagline}`;

// Icons and the default social image come from the file conventions next to
// this layout: icon.svg, apple-icon.tsx and opengraph-image.tsx.
export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: defaultTitle,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: siteConfig.themeColor,
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the boot script sets data-booted on <html>
    // before React hydrates, by design. It only silences this one element's
    // attributes, not its children.
    // data-scroll-behavior: globals.css makes scrolling smooth; this tells Next
    // to switch that off during route transitions so a navigation does not
    // visibly glide to the top of the new page.
    <html
      lang="en"
      className={`${fontVariables} h-full antialiased`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        {/* Must run before first paint — see src/lib/boot-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_FLAG_SCRIPT }} />
        {/* Without JavaScript nothing would ever dismiss the loading screen. */}
        <noscript dangerouslySetInnerHTML={{ __html: LOADING_SCREEN_NOSCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-void text-ink-100">
        <a
          href="#main"
          className={
            "sr-only rounded-xs bg-gold-500 px-4 py-2 font-display text-xs tracking-hud text-void " +
            "uppercase focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-(--z-skip)"
          }
        >
          Skip to content
        </a>

        <ToastProvider>
          <SearchProvider>
            <LoadingScreen />

            {/* The session-dependent slots read cookies. Each sits in its own
                Suspense boundary, so under Partial Prerendering it streams in
                as a small hole in an otherwise static shell — and each
                fallback has the resolved content's footprint, so nothing
                shifts when it arrives. */}
            <Navbar
              favoritesCount={
                <Suspense fallback={null}>
                  <FavoritesCount />
                </Suspense>
              }
              account={
                <Suspense fallback={<AccountMenuFallback />}>
                  <AccountMenu />
                </Suspense>
              }
              mobileAccount={
                <Suspense fallback={<AccountPanelFallback />}>
                  <AccountPanel />
                </Suspense>
              }
            />

            {/* pt-16 clears the fixed navbar. */}
            <div className="flex flex-1 flex-col pt-16">
              {/* The route-enter animation lives in template.tsx. */}
              <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
                {children}
              </main>
              <Footer />
            </div>

            {/* The palette opens on Dialog's "palette" layer, above any sheet
                or menu a page has open; Dialog tracks open order, so its
                position in the document does not matter. */}
            <CommandPalette />

            {/* Development only: explains a missing .env.local or an
                unmigrated database in one sentence. */}
            <Suspense fallback={null}>
              <SetupNotice />
            </Suspense>
          </SearchProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
