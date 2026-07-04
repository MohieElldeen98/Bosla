import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { NotificationsManager } from "@/components/notifications/NotificationsManager";
import { SessionService } from "@/auth/services/session.service";
import { NotificationService } from "@/notifications/services/notification.service";
import { searchNotificationsSchema } from "@/notifications/validators/notification.validator";
import type { Locale } from "@/i18n/routing";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * `/notifications` (Phase 8 foundation) — reachable by any authenticated
 * role via `(student)/layout.tsx`'s guard, the same "any signed-in user"
 * access `/profile`/`/settings` already have; a notification is always
 * private to its one recipient regardless of role. Server-side
 * pagination, all URL-driven, mirrors `/admin/coupons`'s/`/admin/media`'s
 * exact shell.
 */
export default async function NotificationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const rawSearchParams = await searchParams;
  const user = await SessionService.getCurrentUser();
  if (!user) return null;

  const parsed = searchNotificationsSchema.safeParse({
    unreadOnly: firstValue(rawSearchParams.unread),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [t, result] = await Promise.all([
    getTranslations("Notifications.page"),
    NotificationService.list(user, filters, locale as Locale),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-12 lg:px-8">
      <PageTitle title={t("title")} description={t("description")} />
      <NotificationsManager result={result} filters={filters} />
    </div>
  );
}
