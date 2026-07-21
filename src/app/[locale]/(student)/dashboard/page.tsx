import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** `/dashboard` now lives at `/me` (the Learner Workspace's Overview
 *  tab) — kept as a redirect so old links/bookmarks never 404. */
export default async function DashboardRedirectPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect({ href: "/me", locale: locale as Locale });
}
