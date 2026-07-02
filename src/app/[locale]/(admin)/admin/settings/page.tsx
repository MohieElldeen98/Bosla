import { requireRole } from "@/auth/guards/require-role";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";
import type { Locale } from "@/i18n/routing";

/** Super-Admin-only within the Admin Panel — see the matching comment in
 *  `admin/users/page.tsx`. */
export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);
  return <AdminPlaceholderPage navId="settings" />;
}
