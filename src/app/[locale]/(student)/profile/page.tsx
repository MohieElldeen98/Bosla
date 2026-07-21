import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** `/profile` now lives at `/me/profile`. */
export default async function ProfileRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/me/profile", locale: locale as Locale });
}
