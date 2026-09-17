/** Mirrors `db/schema/newsletter.ts`'s `newsletter_subscriber_status`
 *  enum exactly. A row starts `subscribed`; `unsubscribed` is a soft
 *  state, never a delete — an address that opted out must stay on record
 *  so a later import or re-subscribe can't silently mail it again. */
export const NEWSLETTER_SUBSCRIBER_STATUSES = ["subscribed", "unsubscribed"] as const;
export type NewsletterSubscriberStatus = (typeof NEWSLETTER_SUBSCRIBER_STATUSES)[number];

/** Mirrors `db/schema/newsletter.ts`'s `newsletter_subscribers` table. */
export interface NewsletterSubscriber {
  id: string;
  email: string;
  locale: string;
  status: NewsletterSubscriberStatus;
  createdAt: string;
  updatedAt: string;
  unsubscribedAt: string | null;
}

export interface NewNewsletterSubscriberInput {
  email: string;
  locale: string;
  ipAddress?: string | null;
}

export const DEFAULT_NEWSLETTER_PAGE_SIZE = 25;

/** `/admin/newsletter`'s filters — free-text `query` over the email plus
 *  one status filter and pagination, the same shape
 *  `ContactMessageSearchFilters` uses. */
export interface NewsletterSubscriberSearchFilters {
  query?: string;
  status?: NewsletterSubscriberStatus;
  page?: number;
  pageSize?: number;
}

export interface NewsletterSubscriberSearchResult {
  items: NewsletterSubscriber[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
