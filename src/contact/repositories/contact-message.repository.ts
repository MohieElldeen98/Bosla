import { and, desc, eq, gt, ilike, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { contactMessages } from "@/db/schema/contact";
import {
  DEFAULT_CONTACT_MESSAGE_PAGE_SIZE,
  type ContactMessage,
  type ContactMessageSearchFilters,
  type ContactMessageSearchResult,
  type NewContactMessageInput,
} from "@/contact/types/contact-message";

type ContactMessageRow = typeof contactMessages.$inferSelect;

function mapRowToMessage(row: ContactMessageRow): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  };
}

/** Data access for `contact_messages`. `ContactMessageService` is the
 *  only caller. */
export const ContactMessageRepository = {
  async create(input: NewContactMessageInput): Promise<ContactMessage> {
    const [row] = await getDb()
      .insert(contactMessages)
      .values({
        name: input.name,
        email: input.email,
        subject: input.subject,
        message: input.message,
        ipAddress: input.ipAddress ?? null,
      })
      .returning();
    return mapRowToMessage(row);
  },

  /** Returns separate rolling-window counts so the service can enforce the
   * limit independently for an IP and an email address. A missing IP is
   * deliberately represented as zero rather than blocking the submission. */
  async countRecentByIpOrEmail(
    ipAddress: string | null,
    email: string,
    since: Date,
  ): Promise<{ ipCount: number; emailCount: number }> {
    const [emailRows, ipRows] = await Promise.all([
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(contactMessages)
        .where(and(sql`lower(${contactMessages.email}) = ${email.toLowerCase()}`, gt(contactMessages.createdAt, since))),
      ipAddress
        ? getDb()
            .select({ count: sql<number>`count(*)::int` })
            .from(contactMessages)
            .where(and(eq(contactMessages.ipAddress, ipAddress), gt(contactMessages.createdAt, since)))
        : Promise.resolve([{ count: 0 }]),
    ]);
    return { emailCount: emailRows[0]?.count ?? 0, ipCount: ipRows[0]?.count ?? 0 };
  },

  async findById(id: string): Promise<ContactMessage | null> {
    const [row] = await getDb().select().from(contactMessages).where(eq(contactMessages.id, id)).limit(1);
    return row ? mapRowToMessage(row) : null;
  },

  /** The admin inbox — free-text over name/email/subject, newest first
   *  (there is exactly one sort order; a support inbox is read
   *  chronologically, no sort-column picker needed). */
  async search(filters: ContactMessageSearchFilters): Promise<ContactMessageSearchResult<ContactMessage>> {
    const conditions: SQL[] = [];
    if (filters.query) {
      const pattern = `%${filters.query}%`;
      conditions.push(
        or(
          ilike(contactMessages.name, pattern),
          ilike(contactMessages.email, pattern),
          ilike(contactMessages.subject, pattern),
        ) as SQL,
      );
    }
    if (filters.status) conditions.push(eq(contactMessages.status, filters.status));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = filters.pageSize ?? DEFAULT_CONTACT_MESSAGE_PAGE_SIZE;

    const [rows, countRows] = await Promise.all([
      getDb()
        .select()
        .from(contactMessages)
        .where(whereClause)
        .orderBy(desc(contactMessages.createdAt))
        .limit(pageSize)
        .offset((page - 1) * pageSize),
      getDb()
        .select({ count: sql<number>`count(*)::int` })
        .from(contactMessages)
        .where(whereClause),
    ]);
    const total = countRows[0]?.count ?? 0;

    return {
      items: rows.map(mapRowToMessage),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  /** Counts by status — the inbox's "N new" badge. */
  async countByStatus(): Promise<Record<string, number>> {
    const rows = await getDb()
      .select({ status: contactMessages.status, count: sql<number>`count(*)::int` })
      .from(contactMessages)
      .groupBy(contactMessages.status);
    return Object.fromEntries(rows.map((row) => [row.status, row.count]));
  },

  async markResolved(id: string): Promise<ContactMessage | null> {
    const [row] = await getDb()
      .update(contactMessages)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(contactMessages.id, id))
      .returning();
    return row ? mapRowToMessage(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const deleted = await getDb().delete(contactMessages).where(eq(contactMessages.id, id)).returning({ id: contactMessages.id });
    return deleted.length > 0;
  },
};
