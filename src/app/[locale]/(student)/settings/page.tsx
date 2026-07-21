import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** `/settings` now lives at `/me/settings`. */
export default async function SettingsRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/me/settings", locale: locale as Locale });
}
