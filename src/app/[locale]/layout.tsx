import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Sans_Arabic, Marhey } from "next/font/google";
import { Suspense } from "react";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getDirection } from "@/i18n/direction";
import { siteUrl } from "@/lib/site-config";
import { NavigationLoader } from "@/components/layout/NavigationLoader";
import { LegalAcceptanceModal } from "@/components/legal/LegalAcceptanceModal";
import { Toaster } from "sonner";
import "../globals.css";

// Legal pages and the acceptance action depend on request-time auth/content;
// avoid trying to prerender the database-backed locale tree.
export const dynamic = "force-dynamic";

/** IBM Plex Sans for Latin — the same family the Arabic locale already
 *  speaks (IBM Plex Sans Arabic below), so both scripts share one
 *  typographic voice instead of pairing Plex with an unrelated default.
 *  The Plex family's technical-humanist character IS the brand's Latin
 *  type identity; weights mirror the Arabic instance exactly. */
const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

/** The same IBM Plex face under its own variable, loaded on BOTH locales —
 *  blog article content (`.rich-text-content`) always renders in it, so an
 *  Arabic article on the English site never falls back to Inter's Arabic
 *  glyphs and articles look identical across locales. next/font dedupes
 *  the underlying font files with the instance above. */
const ibmPlexArticle = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-article",
  display: "swap",
});

/** Handwritten/marker display face for accent copy (the article page's
 *  "share this article!" line) — Marhey covers Arabic AND Latin, so one
 *  font serves both locales. */
const marhey = Marhey({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-script",
  display: "swap",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });

  const languages = Object.fromEntries(
    routing.locales.map((loc) => [loc, `/${loc}`]),
  );

  return {
    metadataBase: siteUrl,
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        ...languages,
        "x-default": `/${routing.defaultLocale}`,
      },
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      siteName: "Bosla",
      locale: locale === "ar" ? "ar_AR" : "en_US",
      alternateLocale: routing.locales
        .filter((loc) => loc !== locale)
        .map((loc) => (loc === "ar" ? "ar_AR" : "en_US")),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
    robots: {
      index: true,
      follow: true,
    },
    manifest: "/manifest.webmanifest",
    icons: {
      icon: "/icon",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const direction = getDirection(locale as Locale);
  const fontVariable =
    locale === "ar" ? ibmPlexSansArabic.variable : ibmPlexSans.variable;

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${fontVariable} ${ibmPlexArticle.variable} ${marhey.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider messages={messages}>
          {/* Suspense: useSearchParams inside would otherwise force the
              whole tree dynamic during prerender. */}
          <Suspense fallback={null}>
            <NavigationLoader />
          </Suspense>
          {children}
          <LegalAcceptanceModal />
          {/* One global toast outlet — save/publish feedback must appear
              on the public author pages too, not only inside the Admin
              Panel (which previously owned the only Toaster). */}
          <Toaster
            dir={direction}
            position={direction === "rtl" ? "top-left" : "top-right"}
            richColors
            closeButton
          />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
