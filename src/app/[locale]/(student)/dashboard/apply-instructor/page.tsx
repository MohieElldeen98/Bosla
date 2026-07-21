import { redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";

/** `/dashboard/apply-instructor` now lives at `/me/apply-instructor`. */
export default async function ApplyInstructorRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: "/me/apply-instructor", locale: locale as Locale });
}
