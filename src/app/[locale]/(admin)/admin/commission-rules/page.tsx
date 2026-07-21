import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { CommissionRulesManager } from "@/components/admin/revenue/CommissionRulesManager";
import { CommissionService } from "@/commerce/commissions/commission.service";
import { CourseService } from "@/courses/services/course.service";
import { CourseInstructorRepository } from "@/courses/repositories/instructor.repository";
import { safeRead } from "@/commerce/utils/safe-operation";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";

/**
 * `/admin/commission-rules` — the Commission Engine's configuration:
 * effective-dated rules (global / per-instructor / per-course,
 * percentage or fixed). With no rule, the platform keeps 100% — every
 * instructor share on this platform traces back to a row created here,
 * and closed rules keep explaining the historical sales they priced.
 */
export default async function AdminCommissionRulesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [tNav, rules, courseResult, instructors] = await Promise.all([
    getTranslations("Admin.nav.commissionRules"),
    CommissionService.listResolved(locale as Locale),
    CourseService.searchResolved({ pageSize: 100 }, locale as Locale),
    safeRead(() => CourseInstructorRepository.findAll(), []),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <CommissionRulesManager
        rules={rules}
        courses={courseResult.items.map((course) => ({ value: course.id, label: course.title }))}
        instructors={instructors.map((instructor) => ({
          value: instructor.id,
          label: resolveLocalizedText(instructor.name, locale as Locale),
        }))}
      />
    </div>
  );
}
