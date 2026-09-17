import { and, eq, gt, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { newsletterSubscribers } from "@/db/schema/newsletter";
import type {
  NewNewsletterSubscriberInput,
  NewsletterSubscriber,
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
};
