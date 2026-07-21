/** Mirrors `db/schema/contact.ts`'s `contact_message_status` enum
 *  exactly. A message starts `new`; an admin marks it `resolved` once
 *  handled — no intermediate "in progress" state, matching the spec's
 *  single "Mark resolved" action rather than a multi-stage workflow. */
export const CONTACT_MESSAGE_STATUSES = ["new", "resolved"] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

/** Mirrors `db/schema/contact.ts`'s `contact_messages` table. */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: string;
  resolvedAt: string | null;
}

export interface NewContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
  ipAddress?: string | null;
}

export const CONTACT_MESSAGE_SORT_FIELDS = ["createdAt"] as const;
export type ContactMessageSortField = (typeof CONTACT_MESSAGE_SORT_FIELDS)[number];
export const DEFAULT_CONTACT_MESSAGE_SORT_DIRECTION = "desc" as const;

export const DEFAULT_CONTACT_MESSAGE_PAGE_SIZE = 20;

/** The admin inbox's filters — mirrors `PaymentSearchFilters`'s shape
 *  (free-text `query` + one status filter + pagination). */
export interface ContactMessageSearchFilters {
  query?: string;
  status?: ContactMessageStatus;
  page?: number;
  pageSize?: number;
}

export interface ContactMessageSearchResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
