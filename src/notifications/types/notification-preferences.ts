/** Mirrors `db/schema/notifications.ts`'s `notification_preferences`
 *  table. `system`-type notifications have no toggle — they're never
 *  suppressed. */
export interface NotificationPreferences {
  userId: string;
  learningUpdates: boolean;
  ordersAndPayments: boolean;
  courseAndInstructorUpdates: boolean;
  updatedAt: string;
}

export interface UpdateNotificationPreferencesInput {
  learningUpdates: boolean;
  ordersAndPayments: boolean;
  courseAndInstructorUpdates: boolean;
}
