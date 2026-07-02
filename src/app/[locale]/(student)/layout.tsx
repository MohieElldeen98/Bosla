import { requireRole } from "@/auth/guards/require-role";
import type { Locale } from "@/i18n/routing";

/**
 * `/dashboard/*` (docs/roles-and-permissions.md §3) — any authenticated
 * role may enter; Instructors/Admins also have their own student dashboard.
 */
export default async function StudentLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["student", "instructor", "admin", "super_admin"]);
  return <>{children}</>;
}
