import { and, desc, eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { timestampMatches } from "@/db/optimistic-concurrency";
import { notifications } from "@/db/schema/notifications";
import {
  DEFAULT_NOTIFICATION_PAGE_SIZE,
  type NotificationSearchFilters,
  type NotificationSearchResult,
} from "@/notifications/types/notification-search";
import type { LocalizedText } from "@/types/i18n";
import type { NewNotificationInput, Notification } from "@/notifications/types/notification";
import type { OptimisticUpdateResult } from "@/notifications/types/repository-result";

type NotificationRow = typeof notifications.$inferSelect;

function mapRowToNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    recipientUserId: row.recipientUserId,
    type: row.type,
    title: row.title as LocalizedText,
    body: (row.body as LocalizedText | null) ?? null,
    data: (row.data as Record<string, unknown>) ?? {},
    isRead: row.isRead,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `notifications`. `NotificationService` is the only
 *  caller. Every read/write here is scoped to a single
 *  `recipientUserId` (passed in explicitly by the Service layer, which
 *  is the one place that resolves it from `actingUser` — this repository
 *  never itself decides "whose" notifications it's touching). */
export const NotificationRepository = {
  async create(input: NewNotificationInput): Promise<Notification> {
    const [row] = await getDb()
      .insert(notifications)
      .values({
        recipientUserId: input.recipientUserId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        data: input.data ?? {},
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToNotification(row);
  },

  async findById(id: string): Promise<Notification | null> {
    const [row] = await getDb().select().from(notifications).where(eq(notifications.id, id)).limit(1);
    return row ? mapRowToNotification(row) : null;
  },

  /** Newest first, optionally unread-only — the one filter/sort shape
   *  both the bell dropdown and the full `/notifications` page need,
   *  paginated the same "items + total + page + pageSize + totalPages"
   *  way every other domain's `search` already returns. */
  async search(
    recipientUserId: string,
    filters: NotificationSearchFilters,
  ): Promise<NotificationSearchResult<Notification>> {
    const conditions = [eq(notifications.recipientUserId, recipientUserId)];
    if (filters.unreadOnly) conditions.push(eq(notifications.isRead, false));
    const whereClause = and(...conditions);

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_NOTIFICATION_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(notifications)
        .where(whereClause)
        .orderBy(desc(notifications.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb().select({ count: sql<number>`count(*)::int` }).from(notifications).where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToNotification),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async countUnread(recipientUserId: string): Promise<number> {
    const [row] = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.recipientUserId, recipientUserId), eq(notifications.isRead, false)));
    return row?.count ?? 0;
  },

  /** `timestampMatches` — see its doc comment for why a plain equality
   *  check on `updatedAt` isn't safe. Only ever used to mark a single
   *  notification read; there's no other mutable field on this table. */
  async markAsRead(
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<Notification>> {
    const conditions = [eq(notifications.id, id)];
    if (expectedUpdatedAt) conditions.push(timestampMatches(notifications.updatedAt, expectedUpdatedAt));

    const [row] = await getDb()
      .update(notifications)
      .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToNotification(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await NotificationRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  /** Bulk flip, scoped to one recipient — no per-item optimistic
   *  concurrency, the same "a bulk position/status rewrite doesn't need
   *  per-row version checks" precedent `ModuleService.reorderOwn`
   *  already established (only the recipient themselves can ever mark
   *  their own notifications read, so there's no real concurrent-writer
   *  scenario to protect against here). Returns how many rows actually
   *  flipped, so the caller/UI can show "12 marked as read" or just
   *  silently no-op when there was nothing unread. */
  async markAllAsRead(recipientUserId: string): Promise<number> {
    const rows = await getDb()
      .update(notifications)
      .set({ isRead: true, readAt: new Date(), updatedAt: new Date() })
      .where(and(eq(notifications.recipientUserId, recipientUserId), eq(notifications.isRead, false)))
      .returning({ id: notifications.id });
    return rows.length;
  },
};
