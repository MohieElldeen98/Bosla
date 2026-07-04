"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

/**
 * The Notifications bell (Phase 8 foundation) — a fully self-contained
 * component, no `user`/`AuthUser` prop required: every read/write goes
 * through a Server Action that resolves the session itself (see
 * `notifications/actions/notification.actions.ts`), so this drops into
 * any authenticated header — the marketing `Navbar` (via
 * `NavbarUserMenu`'s area) and the Admin Panel's own `Header` both
 * render it, and neither has to plumb anything through beyond "the user
 * is signed in." Polls the unread count every 45s — no realtime/
 * websocket infrastructure exists anywhere in this app yet, and this
 * step doesn't introduce one; a periodic Server Action call is the
 * simplest thing that keeps the badge reasonably fresh.
 */
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
      // Stale/conflicting state — resync from the server rather than
      // trust the optimistic update.
      refreshUnreadCount();
    }
  }

  async function handleMarkAllAsRead() {
    setRecent((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="relative" aria-label={t("label")} />}>
        <Bell aria-hidden="true" className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 end-1 flex size-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium leading-none text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between gap-2 px-1.5 py-1">
          <DropdownMenuLabel className="p-0">{t("title")}</DropdownMenuLabel>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-xs font-medium text-primary hover:underline"
            >
              {t("markAllAsRead")}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {isLoading ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("loading")}</p>
        ) : recent.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          recent.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              onClick={() => handleItemClick(notification)}
              className="flex-col items-start gap-0.5 whitespace-normal"
            >
              <span className="flex w-full items-start gap-1.5">
                {!notification.isRead && (
                  <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-foreground">{notification.title}</span>
              </span>
              {notification.body && (
                <span className="line-clamp-2 text-xs text-muted-foreground">{notification.body}</span>
              )}
              <span className="text-[11px] text-muted-foreground">
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                  new Date(notification.createdAt),
                )}
              </span>
            </DropdownMenuItem>
          ))
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/notifications" onClick={() => setOpen(false)} />}>
          {t("viewAll")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
