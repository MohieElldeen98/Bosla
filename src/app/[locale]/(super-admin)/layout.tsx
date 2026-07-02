import { requireRole } from "@/auth/guards/require-role";
import type { Locale } from "@/i18n/routing";

/**
 * Reserved for pages exclusive to Super Admin (user/role management, site
 * settings, payment provider config — docs/roles-and-permissions.md §6).
 * Whether these ship at a distinct `/super-admin/*` prefix or nested inside
 * `/admin/*` with this same guard is an open decision for whoever builds
 * those pages — both are supported by this architecture.
 */
export default async function SuperAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);
  return <>{children}</>;
}
