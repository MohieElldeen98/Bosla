import { routing } from "@/i18n/routing";
import type { Metadata } from "next";
import type { ResolvedLegalDocument } from "@/cms/types/legal-document";

/**
 * Shared `generateMetadata` builder for `/privacy`, `/terms`, and
 * `/refunds` — identical canonical/alternates/OpenGraph/Twitter shape
 * across all three, mirroring the course details page's own metadata
 * pattern (`routing.locales` alternates, `x-default` fallback). One
 * function instead of copy-pasting this block into three page files.
 */
export function buildLegalPageMetadata(
  document: ResolvedLegalDocument,
  slug: string,
  locale: string,
  description: string,
): Metadata {
  const canonical = `/${locale}/${slug}`;
  const languages = Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/${slug}`]));

  return {
    title: document.title,
    description,
    alternates: {
      canonical,
      languages: { ...languages, "x-default": `/${routing.defaultLocale}/${slug}` },
    },
    openGraph: {
      title: document.title,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary",
      title: document.title,
      description,
    },
  };
}
