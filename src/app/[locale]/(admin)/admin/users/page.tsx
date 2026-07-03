import { getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards/require-role";
import { PageTitle } from "@/components/admin/PageTitle";
import { UsersManager } from "@/components/admin/users/UsersManager";
import { ProfileService } from "@/auth/services/profile.service";
import { searchProfilesAdminSchema } from "@/auth/validators/profile.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/admin/users` — the real Admin User Management listing (Phase 7),
 * replacing the `AdminPlaceholderPage`. Super-Admin-only
 * (docs/roles-and-permissions.md §6) — a plain Admin who navigates here
 * directly is redirected back to `/admin`, not shown a disabled form
 * (§3). Reads through `ProfileService.searchPaginated` — no duplicated
 * query logic, same "URL search params drive every filter/sort/page"
 * pattern `/admin/courses`/`/admin/enrollments` already established.
 */
export default async function AdminUsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);
  const rawSearchParams = await searchParams;

  const parsed = searchProfilesAdminSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    role: firstValue(rawSearchParams.role),
    status: firstValue(rawSearchParams.status),
    sortBy: firstValue(rawSearchParams.sortBy),
    sortDirection: firstValue(rawSearchParams.sortDir),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result] = await Promise.all([
    getTranslations("Admin.nav.users"),
    ProfileService.searchPaginated(filters),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <UsersManager result={result} filters={filters} />
    </div>
  );
}
