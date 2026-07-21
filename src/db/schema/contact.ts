import { sql } from "drizzle-orm";
import { check, index, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * The Contact domain — inbound messages from the public `/contact` form
 * (docs/legal-content-platform.md). Deliberately its own top-level
 * table, not folded into `notifications` or any CMS table: a contact
 * message has no owning user (the sender may not even have an account)
 * and its own lifecycle (new → resolved), matching the "one domain per
 * bounded concern" convention `order_audit_logs`/`revenue_audit_logs`
 * already established for adjacent-but-distinct concerns.
 */
export const contactMessageStatusEnum = pgEnum("contact_message_status", ["new", "resolved"]);

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    subject: text("subject").notNull(),
    message: text("message").notNull(),
    ipAddress: text("ip_address"),
    status: contactMessageStatusEnum("status").notNull().default("new"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("contact_messages_status_created_idx").on(table.status, table.createdAt),
    index("contact_messages_email_created_idx").on(table.email, table.createdAt),
    index("contact_messages_ip_created_idx").on(table.ipAddress, table.createdAt),
    check("contact_messages_name_check", sql`length(${table.name}) > 0`),
    check("contact_messages_subject_check", sql`length(${table.subject}) > 0`),
    check("contact_messages_message_check", sql`length(${table.message}) > 0`),
  ],
);
