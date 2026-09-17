import { and, asc, desc, eq, gt, ilike, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { newsletterSubscribers } from "@/db/schema/newsletter";
import {
  DEFAULT_NEWSLETTER_PAGE_SIZE,
  type NewNewsletterSubscriberInput,
  type NewsletterSubscriber,
  type NewsletterSubscriberSearchFilters,
  type NewsletterSubscriberSearchResult,
  type NewsletterSubscriberStatus,
} from "@/newsletter/types/newsletter-subscriber";

type NewsletterSubscriberRow = typeof newsletterSubscribers.$inferSelect;

function mapRowToSubscriber(row: NewsletterSubscriberRow): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    locale: row.locale,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    unsubscribedAt: row.unsubscribedAt ? row.unsubscribedAt.toISOString() : null,
  };
}

/** Data access for `newsletter_subscribers`.
 *  `NewsletterSubscriptionService` is the only caller. */
export const NewsletterSubscriberRepository = {
  /**
   * Idempotent by design: subscribing an address that's already on the
   * list (or that previously opted out) updates the existing row instead
   * of failing on the unique constraint. That keeps the form's response
   * identical for a new and an existing address, which is the point —
   * a differentiated response would turn a public form into an
   * "is this address on your list?" oracle.
   *
   * `createdAt` is deliberately left alone on conflict: the first
   * subscribe date is the useful one.
   */
  async subscribe(input: NewNewsletterSubscriberInput): Promise<NewsletterSubscriber> {
    const [row] = await getDb()
      .insert(newsletterSubscribers)
      .values({
        email: input.email,
        locale: input.locale,
        ipAddress: input.ipAddress ?? null,
      })
      .onConflictDoUpdate({
        target: newsletterSubscribers.email,
        set: {
          status: "subscribed",
          locale: input.locale,
          ipAddress: input.ipAddress ?? null,
          updatedAt: new Date(),
          unsubscribedAt: null,
        },
      })
      .returning();
    return mapRowToSubscriber(row);
  },

  /** Rolling-window count for one IP, mirroring
   *  `ContactMessageRepository.countRecentByIpOrEmail`'s handling of a
   *  missing IP: absent means zero, never a blocked submission. */
  async countRecentByIp(ipAddress: string | null, since: Date): Promise<number> {
    if (!ipAddress) return 0;
    const rows = await getDb()
      .select({ count: sql<number>`count(*)::int` })
      .from(newsletterSubscribers)
      .where(
        and(eq(newsletterSubscribers.ipAddress, ipAddress), gt(newsletterSubscribers.updatedAt, since)),
      );
    return rows[0]?.count ?? 0;
  },

  /** `/admin/newsletter` — free-text over the email, newest first. There
   *  is exactly one sort order: a subscriber list is read chronologically,
   *  so no sort-column picker is needed (same call `ContactMessageRepository
   *  .search` makes). */
  async search(filters: NewsletterSubscriberSearchFilters): Promise<NewsletterSubscriberSearchResult> {
    const conditions: SQL[] = [];
    if (filters.query) conditions.push(ilike(newsletterSubscribers.email, `%${filters.query}%`));
    if (filters.status) conditions.push(eq(newsletterSubscribers.status, filters.status));
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_NEWSLETTER_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(newsletterSubscribers)
        .where(whereClause)
        .orderBy(desc(newsletterSubscribers.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(newsletterSubscribers)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToSubscriber),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Counts per status — the page's "N subscribed / N unsubscribed" line. */
  async countByStatus(): Promise<Record<string, number>> {
    const rows = await getDb()
      .select({ status: newsletterSubscribers.status, count: sql<number>`count(*)::int` })
      .from(newsletterSubscribers)
      .groupBy(newsletterSubscribers.status);
    return Object.fromEntries(rows.map((row) => [row.status, row.count]));
  },

  /** Every currently-subscribed address, oldest first — the export. No
   *  pagination on purpose: the point of the export is to get the whole
   *  list in one file. */
  async listSubscribedEmails(): Promise<{ email: string; locale: string; createdAt: string }[]> {
    const rows = await getDb()
      .select({
        email: newsletterSubscribers.email,
        locale: newsletterSubscribers.locale,
        createdAt: newsletterSubscribers.createdAt,
      })
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.status, "subscribed"))
      .orderBy(asc(newsletterSubscribers.createdAt));
    return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
  },

  /** Admin opt-out/opt-in toggle. `unsubscribedAt` is stamped on the way
   *  out and cleared on the way back in, so the column always describes
   *  the CURRENT status rather than "the last time this ever happened". */
  async setStatus(id: string, status: NewsletterSubscriberStatus): Promise<NewsletterSubscriber | null> {
    const [row] = await getDb()
      .update(newsletterSubscribers)
      .set({
        status,
        updatedAt: new Date(),
        unsubscribedAt: status === "unsubscribed" ? new Date() : null,
      })
      .where(eq(newsletterSubscribers.id, id))
      .returning();
    return row ? mapRowToSubscriber(row) : null;
  },
};
