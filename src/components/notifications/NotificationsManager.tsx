"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
import {
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
} from "@/notifications/actions/notification.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedNotification } from "@/notifications/types/notification";
import type { NotificationSearchFilters, NotificationSearchResult } from "@/notifications/types/notification-search";

const ALL = "all";

/** `/notifications`'s interactive shell (Phase 8 foundation) — same
 *  URL-search-param-driven pattern as `CouponsManager`/`MediaLibraryManager`.
 *  A plain list, not a table — a notification's title/body/timestamp
 *  don't read well as table columns, the same reasoning the Media
 *  Library's own grid gave for not using one either. */
export function NotificationsManager({
  result,
  filters,
}: {
  result: NotificationSearchResult<ResolvedNotification>;
  filters: NotificationSearchFilters;
}) {
  const t = useTranslations("Notifications.page");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState(result.items);

  function updateParams(updates: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.push(query ? `/notifications?${query}` : "/notifications", { scroll: false });
  }

  async function handleMarkAsRead(notification: ResolvedNotification) {
    if (notification.isRead) return;
    setItems((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    const res = await markNotificationAsReadAction(notification.id, notification.updatedAt);
    if (!res.success) {
      toast.error(res.message);
      router.refresh();
    }
  }

  async function handleMarkAllAsRead() {
    setItems((prev) => prev.map((item) => ({ ...item, isRead: true })));
    const res = await markAllNotificationsAsReadAction();
    if (!res.success) {
      toast.error(res.message);
      router.refresh();
      return;
    }
    toast.success(t("toasts.allMarkedAsRead"));
    router.refresh();
  }

  const hasUnread = items.some((item) => !item.isRead);

  return (
    <div className="space-y-4">
      <ActionToolbar
        actions={
          <Button type="button" size="sm" variant="outline" onClick={handleMarkAllAsRead} disabled={!hasUnread}>
            {t("markAllAsRead")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.unreadOnly ? "unread" : ALL}
          onValueChange={(value) => updateParams({ unread: value === "unread" ? "true" : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.all")}</SelectItem>
            <SelectItem value="unread">{t("filters.unreadOnly")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((notification) => (
              <li key={notification.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${notification.isRead ? "bg-transparent" : "bg-primary"}`}
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-foreground">{notification.title}</p>
                    <Badge variant={notification.isRead ? "secondary" : "default"}>
                      {notification.isRead ? t("status.read") : t("status.unread")}
                    </Badge>
                  </div>
                  {notification.body && <p className="text-sm text-muted-foreground">{notification.body}</p>}
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(notification.createdAt),
                    )}
                  </p>
                </div>
                {!notification.isRead && (
                  <Button type="button" size="sm" variant="ghost" onClick={() => handleMarkAsRead(notification)}>
                    {t("markAsRead")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        onPageChange={(page) => updateParams({ page: String(page) }, false)}
        summary={({ from, to, total }) => t("pagination.summary", { from, to, total })}
        previousLabel={t("pagination.previous")}
        nextLabel={t("pagination.next")}
      />
    </div>
  );
}
