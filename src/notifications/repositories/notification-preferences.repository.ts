import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { notificationPreferences } from "@/db/schema/notifications";
import type { NotificationPreferences } from "@/notifications/types/notification-preferences";

type NotificationPreferencesRow = typeof notificationPreferences.$inferSelect;

function mapRowToPreferences(row: NotificationPreferencesRow): NotificationPreferences {
  return {
    userId: row.userId,
    learningUpdates: row.learningUpdates,
    ordersAndPayments: row.ordersAndPayments,
    courseAndInstructorUpdates: row.courseAndInstructorUpdates,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `notification_preferences`. `NotificationService` is
 *  the only caller. A missing row (never visited Settings) is `null` —
 *  callers treat that as "everything on," never as "everything off." */
export const NotificationPreferencesRepository = {
  async findByUserId(userId: string): Promise<NotificationPreferences | null> {
    const [row] = await getDb()
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    return row ? mapRowToPreferences(row) : null;
  },

  /** Upsert — the Settings tab always writes the full set of three
   *  toggles together (one form, one save), so there's no partial-patch
   *  case to support. */
  async upsert(
    userId: string,
    input: { learningUpdates: boolean; ordersAndPayments: boolean; courseAndInstructorUpdates: boolean },
  ): Promise<NotificationPreferences> {
    const [row] = await getDb()
      .insert(notificationPreferences)
      .values({ userId, ...input })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return mapRowToPreferences(row);
  },
};
