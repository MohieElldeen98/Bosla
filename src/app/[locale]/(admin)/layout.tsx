import { requireRoleOrForbidden } from "@/auth/guards/require-role";
import { AdminShell } from "@/components/admin/AdminShell";
import { ForbiddenPage } from "@/components/admin/ForbiddenPage";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/*` — Admin and Super Admin both enter here. Unlike the other
 * role-scoped route groups, a signed-in user with the wrong role sees an
 * explicit Forbidden page rather than a silent redirect to their own
 * surface — see `requireRoleOrForbidden`'s doc comment.
 */
export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const result = await requireRoleOrForbidden(locale as Locale, ["admin", "super_admin"]);

  if (!result.allowed) {
    return <ForbiddenPage />;
  }

  return <AdminShell user={result.user}>{children}</AdminShell>;
}
