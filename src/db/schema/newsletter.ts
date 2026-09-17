import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The Newsletter domain — email addresses collected by the footer's
 * subscribe form. Its own top-level table, not folded into
 * `contact_messages` or `profiles`: a subscriber has no owning user (most
 * are signed-out visitors), no message body, and a lifecycle of its own
 * (subscribed ⇄ unsubscribed) that has nothing to do with a support
 * inbox's new → resolved. Same "one domain per bounded concern"
 * convention `contact_messages` itself follows.
 *
 * Before this table existed the footer form was a no-op: it called
 * `setSubmitted(true)` and threw the address away, so every visitor who
 * subscribed saw a success message and was never recorded anywhere.
 */
export const newsletterSubscriberStatusEnum = pgEnum("newsletter_subscriber_status", [
  "subscribed",
  "unsubscribed",
]);

export const newsletterSubscribers = pgTable(
  "newsletter_subscribers",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Always stored lower-cased and trimmed by
     *  `NewsletterSubscriptionService` — the plain `UNIQUE` here is what
     *  makes re-subscribing idempotent (`ON CONFLICT DO UPDATE`), which
     *  only works against a column constraint, hence normalize-on-write
     *  rather than a `lower(email)` expression index. */
    email: text("email").notNull().unique(),
    /** Which locale the visitor subscribed from, so a future send can go
     *  out in the language they actually signed up in. */
    locale: text("locale").notNull().default("en"),
    status: newsletterSubscriberStatusEnum("status").notNull().default("subscribed"),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
    unsubscribedAt: timestamp("unsubscribed_at", { withTimezone: true }),
  },
  (table) => [
    index("newsletter_subscribers_status_created_idx").on(table.status, table.createdAt),
    index("newsletter_subscribers_ip_created_idx").on(table.ipAddress, table.createdAt),
    check("newsletter_subscribers_email_check", sql`length(${table.email}) > 0`),
  ],
);
