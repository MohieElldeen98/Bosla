import { requireRole } from "@/auth/guards/require-role";
import { AdminPlaceholderPage } from "@/components/admin/AdminPlaceholderPage";
import type { Locale } from "@/i18n/routing";

/**
 * Super-Admin-only within the Admin Panel (docs/roles-and-permissions.md
 * §6) — a plain Admin who navigates here directly is redirected back to
 * `/admin`, not shown a disabled form (§3). Uses the existing redirect-based
 * `requireRole`, not `requireRoleOrForbidden` — an Admin landing on the
 * wrong admin page is "wrong surface for my role" (redirect), not the
 * "you don't belong here at all" case the outer layout's Forbidden page is
 * for.
 */
export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);
  return <AdminPlaceholderPage navId="users" />;
}
