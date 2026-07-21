import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LegalDocumentService } from "@/cms/services/legal-document.service";
import { buildLegalPageMetadata } from "@/cms/utils/legal-metadata";
import { LegalDocumentPage } from "@/components/legal/LegalDocumentPage";
import type { Locale } from "@/i18n/routing";

const SLUG = "privacy";

/** ISR — the same 60s cadence the course catalog/details pages use; an
 *  admin publishing an edit in `/admin/content` reaches the public page
 *  within one revalidation window, never instantly but never stale for
 *  long either. */
export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [document, t] = await Promise.all([
    LegalDocumentService.getPublishedBySlug(SLUG, locale as Locale),
    getTranslations({ locale, namespace: "Legal" }),
  ]);
  if (!document) {
    return { title: t("notFoundTitle") };
  }
  return buildLegalPageMetadata(document, SLUG, locale, t("privacy.description"));
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [document, t] = await Promise.all([
    LegalDocumentService.getPublishedBySlug(SLUG, locale as Locale),
    getTranslations("Legal"),
  ]);
  if (!document) notFound();

  return (
    <LegalDocumentPage
      document={document}
      locale={locale}
      lastUpdatedLabel={t("lastUpdated")}
      tocLabel={t("tocLabel")}
      sectionsNavLabel={t("sectionsNav")}
    />
  );
}
