import { requireRole } from "@/auth/guards/require-role";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/*`. Role-only for now — the additional
 * `instructor_profiles.is_approved` check (docs/roles-and-permissions.md
 * §3) is deferred until that table exists; a pending applicant will need a
 * dedicated redirect once it's added, see `auth/guards/require-role.ts`.
 */
export default async function InstructorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["instructor"]);
  return <>{children}</>;
}
