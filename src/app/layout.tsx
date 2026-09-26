import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { fontVariables } from "@/lib/fonts";
import { siteConfig } from "@/lib/site-config";
import { BOOT_FLAG_SCRIPT } from "@/lib/boot-script";
import { Navbar } from "@/components/layout/Navbar";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Footer } from "@/components/layout/Footer";
import { LoadingScreen } from "@/components/layout/LoadingScreen";
import { PageTransition } from "@/components/layout/PageTransition";
import { SearchOverlay } from "@/components/layout/SearchOverlay";
import { SearchProvider } from "@/components/layout/SearchProvider";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: "#06060a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fontVariables} h-full antialiased`}>
      <head>
        {/* Must run before first paint — see src/lib/boot-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: BOOT_FLAG_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-void text-ink-100">
        <a
          href="#main"
          className={
            "sr-only rounded-xs bg-gold-500 px-4 py-2 font-display text-xs text-void " +
            "tracking-[0.18em] uppercase focus:not-sr-only focus:fixed focus:top-4 " +
            "focus:left-4 focus:z-[300]"
          }
        >
          Skip to content
        </a>

        <SearchProvider>
          <LoadingScreen />
          <Navbar
            accountSlot={
              /* The account menu reads cookies. Behind a Suspense boundary it
                 becomes a streamed hole in an otherwise fully static page,
                 instead of forcing every route to render dynamically. */
              <Suspense fallback={<div className="h-[34px] w-[34px]" aria-hidden />}>
                <AccountMenu />
              </Suspense>
            }
          />
          <SearchOverlay />

          {/* pt-16 clears the fixed navbar. */}
          <div className="flex flex-1 flex-col pt-16">
            <main id="main" className="flex flex-1 flex-col">
              <PageTransition>{children}</PageTransition>
            </main>
            <Footer />
          </div>
        </SearchProvider>
      </body>
    </html>
  );
}
