import { getTranslations } from "next-intl/server";
import { requireRole } from "@/auth/guards/require-role";
import { PageTitle } from "@/components/admin/PageTitle";
import { JobsManager } from "@/components/admin/jobs/JobsManager";
import { JobService } from "@/jobs/service";
import type { JobStatus } from "@/jobs/types";
import type { Locale } from "@/i18n/routing";

const JOB_STATUSES: JobStatus[] = ["pending", "processing", "completed", "failed"];

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseStatus(value: string | undefined): JobStatus | undefined {
  return JOB_STATUSES.includes(value as JobStatus) ? (value as JobStatus) : undefined;
}

/** `/admin/jobs` — a read-only monitoring view over `src/jobs`'s queue
 *  (docs/media-platform.md "Background processing"), for operational
 *  debugging only: is a job stuck, why did it fail, has the recovery
 *  sweep been reclaiming things it shouldn't. Deliberately not a metrics
 *  dashboard — no charts, no history-over-time, no alerting; the queue's
 *  own `job_queue` table is the only data source, queried straight,
 *  capped at the repository's own recency window. Super-Admin-only, same
 *  bracket as `/admin/users`/`/admin/settings` — see
 *  `requireJobsAccess`'s doc comment for why. */
export default async function AdminJobsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await requireRole(locale as Locale, ["super_admin"]);

  const rawSearchParams = await searchParams;
  const status = parseStatus(firstValue(rawSearchParams.status));

  const [tNav, items, counts] = await Promise.all([
    getTranslations("Admin.nav.jobs"),
    JobService.search(status),
    JobService.getCounts(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <JobsManager items={items} status={status} counts={counts} />
    </div>
  );
}
