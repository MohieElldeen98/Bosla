import { NotificationRepository } from "@/notifications/repositories/notification.repository";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/notifications/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { Notification, NewNotificationInput, ResolvedNotification } from "@/notifications/types/notification";
import type { NotificationSearchFilters, NotificationSearchResult } from "@/notifications/types/notification-search";
import type { NotificationActionResult } from "@/notifications/types/result";

function toResolvedNotification(notification: Notification, locale: Locale): ResolvedNotification {
  return {
    id: notification.id,
    type: notification.type,
    title: resolveLocalizedText(notification.title, locale),
    body: resolveLocalizedText(notification.body, locale),
    data: notification.data,
    isRead: notification.isRead,
    readAt: notification.readAt,
    createdAt: notification.createdAt,
    updatedAt: notification.updatedAt,
  };
}

/**
 * Orchestration for `notifications` — a cross-domain platform feature
 * (Phase 8 foundation), not owned by any one existing domain. Every
 * method here takes an explicit `actingUser` and scopes strictly to
 * their own notifications (`recipientUserId`), the same "student-owned
 * data" convention `EnrollmentService.listForStudent`/
 * `LessonProgressService` already established — there's no
 * Admin-oversight variant of any of these, since a notification is
 * always private to its one recipient, and no role is exempt from that.
 *
 * `create` is deliberately the one method with no `actingUser` /
 * authorization gate at all — it's not reachable through a Server
 * Action (no `createNotificationAction` exists), only called by other
 * domains' own already-authorized Service code (a later integration
 * step, explicitly out of this step's scope). Trusting the caller here
 * is the same reasoning `EnrollmentRepository.create`/
 * `recordLearningAuditLog` already rely on: permission is checked once,
 * at the call site that decided a notification should exist, not
 * re-checked by the thing that just stores it.
 */
export const NotificationService = {
  async create(input: NewNotificationInput): Promise<NotificationActionResult<Notification>> {
    return safeMutation(async () => {
      const created = await NotificationRepository.create(input);
      return { success: true, data: created };
    });
  },

  async list(
    actingUser: AuthUser,
    filters: NotificationSearchFilters,
    locale: Locale,
  ): Promise<NotificationSearchResult<ResolvedNotification>> {
    const result = await safeRead(() => NotificationRepository.search(actingUser.id, filters), {
      items: [] as Notification[],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
    return { ...result, items: result.items.map((notification) => toResolvedNotification(notification, locale)) };
  },

  async unreadCount(actingUser: AuthUser): Promise<number> {
    return safeRead(() => NotificationRepository.countUnread(actingUser.id), 0);
  },

  /** Verifies the notification actually belongs to `actingUser` before
   *  marking it read — `not_found` covers both "doesn't exist" and
   *  "exists but isn't yours," the same "can't tell those apart and
   *  shouldn't" reasoning `CourseService.getOwnById` already established,
   *  so probing another user's notification id learns nothing. */
  async markAsRead(
    actingUser: AuthUser,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<NotificationActionResult<Notification>> {
    return safeMutation(async () => {
      const existing = await NotificationRepository.findById(id);
      if (!existing || existing.recipientUserId !== actingUser.id) {
        return { success: false, code: "not_found", message: "Notification not found." };
      }
      if (existing.isRead) {
        return { success: true, data: existing };
      }

      const result = await NotificationRepository.markAsRead(id, expectedUpdatedAt);
      if (result.status === "not_found") {
        return { success: false, code: "not_found", message: "Notification not found." };
      }
      if (result.status === "conflict") {
        return {
          success: false,
          code: "conflict",
          message: "This notification was already updated. Reload to see the latest version.",
        };
      }
      return { success: true, data: result.data };
    });
  },

  async markAllAsRead(actingUser: AuthUser): Promise<NotificationActionResult<{ count: number }>> {
    return safeMutation(async () => {
      const count = await NotificationRepository.markAllAsRead(actingUser.id);
      return { success: true, data: { count } };
    });
  },
};
