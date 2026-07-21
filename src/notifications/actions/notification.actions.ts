"use server";

import { SessionService } from "@/auth/services/session.service";
import { NotificationService } from "@/notifications/services/notification.service";
import { searchNotificationsSchema, updateNotificationPreferencesSchema } from "@/notifications/validators/notification.validator";
import type { Locale } from "@/i18n/routing";
import type { Notification, ResolvedNotification } from "@/notifications/types/notification";
import type { NotificationPreferences } from "@/notifications/types/notification-preferences";
import type { NotificationSearchResult } from "@/notifications/types/notification-search";
import type { NotificationActionResult } from "@/notifications/types/result";

const EMPTY_RESULT: NotificationSearchResult<ResolvedNotification> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: 20,
  totalPages: 1,
};

/**
 * Notifications Server Actions — every one of these resolves the
 * session itself (`SessionService.getCurrentUser()`), the same "Own"
 * action convention every other domain's user-scoped actions already
 * use (see `learning/actions/enrollment.actions.ts`'s student-facing
 * methods). There's no `createNotificationAction` — `NotificationService
 * .create` is only ever called by other domains' own server-side code,
 * a later integration step (see that service's own doc comment).
 */
export async function listNotificationsAction(
  rawFilters: unknown,
  locale: Locale,
): Promise<NotificationSearchResult<ResolvedNotification>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) return EMPTY_RESULT;

  const parsed = searchNotificationsSchema.safeParse(rawFilters);
  if (!parsed.success) return EMPTY_RESULT;

  return NotificationService.list(actingUser, parsed.data, locale);
}

export async function unreadNotificationCountAction(): Promise<number> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) return 0;
  return NotificationService.unreadCount(actingUser);
}

export async function markNotificationAsReadAction(
  id: string,
  expectedUpdatedAt?: string,
): Promise<NotificationActionResult<Notification>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return NotificationService.markAsRead(actingUser, id, expectedUpdatedAt);
}

export async function markAllNotificationsAsReadAction(): Promise<NotificationActionResult<{ count: number }>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return NotificationService.markAllAsRead(actingUser);
}

/** `/me/settings`'s notification-preferences toggles. */
export async function getMyNotificationPreferencesAction(): Promise<NotificationPreferences | null> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) return null;
  return NotificationService.getPreferences(actingUser);
}

export async function updateMyNotificationPreferencesAction(
  rawInput: unknown,
): Promise<NotificationActionResult<NotificationPreferences>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateNotificationPreferencesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return NotificationService.updatePreferences(actingUser, parsed.data);
}
