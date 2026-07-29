"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Badge, Popover, Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import {
  listNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
  unreadNotificationCountAction,
} from "@/notifications/actions/notification.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedNotification } from "@/notifications/types/notification";

const RECENT_PAGE_SIZE = 8;
const POLL_INTERVAL_MS = 45_000;

export function NotificationBell() {
  const t = useTranslations("Notifications.bell");
  const locale = useLocale() as Locale;

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<ResolvedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    const count = await unreadNotificationCountAction();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    listNotificationsAction({ pageSize: RECENT_PAGE_SIZE }, locale).then((result) => {
      if (!cancelled) {
        setRecent(result.items);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  async function handleItemClick(notification: ResolvedNotification) {
    if (notification.isRead) return;
    setRecent((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const result = await markNotificationAsReadAction(notification.id, notification.updatedAt);
    if (!result.success) {
      refreshUnreadCount();
    }
  }

  async function handleMarkAllAsRead() {
    setRecent((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Badge.Anchor>
        <Button variant="ghost" size="sm" aria-label={t("label")}>
          <Bell aria-hidden="true" className="size-5" />
        </Button>
        {unreadCount > 0 && (
          <Badge color="danger" className="text-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Badge.Anchor>
      <Popover.Content>
        <Popover.Dialog className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Popover.Heading className="text-sm font-semibold text-foreground">{t("title")}</Popover.Heading>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllAsRead} className="text-xs font-medium text-accent hover:underline">
                {t("markAllAsRead")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{t("loading")}</p>
            ) : recent.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              recent.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleItemClick(notification)}
                  className={`block w-full border-b border-border px-4 py-3 text-start last:border-b-0 hover:bg-muted ${
                    notification.isRead ? "" : "bg-accent/5"
                  }`}
                >
                  <span className="flex items-start gap-1.5">
                    {!notification.isRead && (
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{notification.title}</span>
                  </span>
                  {notification.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(notification.createdAt),
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-muted"
          >
            {t("viewAll")}
          </Link>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
