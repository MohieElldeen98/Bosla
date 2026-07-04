import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/notifications.ts`'s `notification_type` Postgres
 *  enum exactly — every notification type this platform can produce,
 *  decided up front (Phase 8 foundation) even though nothing creates one
 *  yet; see that schema's own doc comment for why this is a closed enum,
 *  not a free-form `text` action like the audit-log tables. */
export const NOTIFICATION_TYPES = [
  "instructor_application_submitted",
  "instructor_application_approved",
  "instructor_application_rejected",
  "course_submitted",
  "course_approved",
  "course_rejected",
  "new_enrollment",
  "course_purchased",
  "order_paid",
  "order_failed",
  "quiz_passed",
  "quiz_failed",
  "system",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Mirrors `db/schema/notifications.ts`'s `notifications` table. */
export interface Notification {
  id: string;
  recipientUserId: string;
  type: NotificationType;
  title: LocalizedText;
  body: LocalizedText | null;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Locale-resolved view — what the bell dropdown and `/notifications`
 *  page actually render. */
export interface ResolvedNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewNotificationInput {
  recipientUserId: string;
  type: NotificationType;
  title: LocalizedText;
  body?: LocalizedText | null;
  data?: Record<string, unknown>;
}
