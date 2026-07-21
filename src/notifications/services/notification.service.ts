import { NotificationRepository } from "@/notifications/repositories/notification.repository";
import { NotificationPreferencesRepository } from "@/notifications/repositories/notification-preferences.repository";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/notifications/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type { AuthUser } from "@/auth/types/session";
import type { Notification, NewNotificationInput, NotificationType, ResolvedNotification } from "@/notifications/types/notification";
import type { NotificationPreferences, UpdateNotificationPreferencesInput } from "@/notifications/types/notification-preferences";
import type { NotificationSearchFilters, NotificationSearchResult } from "@/notifications/types/notification-search";
import type { NotificationActionResult } from "@/notifications/types/result";

/** Maps the 13-value `NotificationType` enum onto the three coarse
 *  toggles Settings actually exposes (`db/schema/notifications.ts`'s
 *  `notification_preferences` doc comment explains why coarse, not 1:1).
 *  `system` isn't in this map at all — it falls through to "always
 *  send" below, the same "never suppress account-security-adjacent
 *  messages" reasoning the schema comment gives. */
const NOTIFICATION_PREFERENCE_GROUP: Partial<Record<NotificationType, keyof UpdateNotificationPreferencesInput>> = {
  new_enrollment: "learningUpdates",
  course_purchased: "learningUpdates",
  quiz_passed: "learningUpdates",
  quiz_failed: "learningUpdates",
  order_paid: "ordersAndPayments",
  order_failed: "ordersAndPayments",
  course_submitted: "courseAndInstructorUpdates",
  course_approved: "courseAndInstructorUpdates",
  course_rejected: "courseAndInstructorUpdates",
  instructor_application_submitted: "courseAndInstructorUpdates",
  instructor_application_approved: "courseAndInstructorUpdates",
  instructor_application_rejected: "courseAndInstructorUpdates",
};

/** `true` (send it) whenever there's no group for this type (`system`),
 *  no preferences row yet (never visited Settings → opt-out, not
 *  opt-in), or the matching toggle is on. */
function isNotificationAllowed(type: NotificationType, preferences: NotificationPreferences | null): boolean {
  const group = NOTIFICATION_PREFERENCE_GROUP[type];
  if (!group) return true;
  if (!preferences) return true;
  return preferences[group];
}

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
  /** Suppresses the write entirely (not "create then hide") when the
   *  recipient has muted this type's preference group — `notify()`
   *  (`notifications/utils/notify.ts`) awaits this the same way it
   *  awaits any other creation, so a muted notification simply never
   *  becomes a row, same effect as it never having been sent. Returns
   *  `success: true` with `data: null` for a suppressed notification —
   *  not an error, since nothing went wrong. */
  async create(input: NewNotificationInput): Promise<NotificationActionResult<Notification | null>> {
    return safeMutation(async () => {
      const preferences = await NotificationPreferencesRepository.findByUserId(input.recipientUserId);
      if (!isNotificationAllowed(input.type, preferences)) {
        return { success: true, data: null };
      }
      const created = await NotificationRepository.create(input);
      return { success: true, data: created };
    });
  },

  async getPreferences(actingUser: AuthUser): Promise<NotificationPreferences> {
    const existing = await safeRead(() => NotificationPreferencesRepository.findByUserId(actingUser.id), null);
    return (
      existing ?? {
        userId: actingUser.id,
        learningUpdates: true,
        ordersAndPayments: true,
        courseAndInstructorUpdates: true,
        updatedAt: new Date(0).toISOString(),
      }
    );
  },

  async updatePreferences(
    actingUser: AuthUser,
    input: UpdateNotificationPreferencesInput,
  ): Promise<NotificationActionResult<NotificationPreferences>> {
    return safeMutation(async () => {
      const updated = await NotificationPreferencesRepository.upsert(actingUser.id, input);
      return { success: true, data: updated };
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
