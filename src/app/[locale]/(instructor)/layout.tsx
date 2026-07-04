import { requireRole } from "@/auth/guards/require-role";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { InstructorApplicationReviewPage } from "@/components/instructor/InstructorApplicationReviewPage";
import { InstructorChrome } from "@/components/instructor/InstructorChrome";
import type { Locale } from "@/i18n/routing";

/**
 * `/instructor/*` — role check first (`requireRole`, same as every other
 * route group), then the `instructor_profiles.status === "approved"`
 * check docs/roles-and-permissions.md §3 describes as deferred until
 * that table existed (Phase 6, Step 6.1 — it now does). A `role ===
 * "instructor"` user without an approved application (normally
 * unreachable, since `UserRoleService.updateUserRole` is only ever
 * called for `"instructor"` from `InstructorApplicationService.approve`
 * — but a Super Admin can still set the role directly via
 * `/admin/users`, bypassing the application entirely) sees a review/
 * status page in place of `children`, not a redirect — mirroring
 * `(admin)/layout.tsx`'s "render an explicit state inline" precedent
 * over `requireRole`'s own silent bounce. The review/status page
 * deliberately renders *outside* `InstructorChrome` — a not-yet-approved
 * Instructor has no real Courses/Students/Coupons/Earnings to navigate
 * to yet, so showing that sidebar would be a distraction, not a
 * shortcut. Once approved, `children` renders inside the full shell
 * (Phase 9 UX pass) — before this, `(instructor)/*` had no persistent
 * navigation or sign-out at all.
 */
export default async function InstructorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const user = await requireRole(locale as Locale, ["instructor"]);

  const application = await InstructorApplicationService.getMyApplication(user);
  if (!application || application.status !== "approved") {
    return <InstructorApplicationReviewPage status={application?.status ?? null} />;
  }

  return <InstructorChrome user={user}>{children}</InstructorChrome>;
}
