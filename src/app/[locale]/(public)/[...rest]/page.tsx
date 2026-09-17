import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Catch-all for unknown paths under a locale. Without it, Next renders its
 * own unstyled English 404 outside the app layout, because an unmatched URL
 * never reaches a `not-found.tsx` inside `[locale]`. Routing it here makes
 * `notFound()` land on `(public)/not-found.tsx`, inside the navbar/footer.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NotFound" });
  return { title: t("metaTitle"), robots: { index: false, follow: false } };
}

export default function CatchAllNotFound() {
  notFound();
}
