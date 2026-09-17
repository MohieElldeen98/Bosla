import "server-only";

import { NewsletterSubscriberRepository } from "@/newsletter/repositories/newsletter-subscriber.repository";
import { subscribeToNewsletterSchema } from "@/newsletter/validators/newsletter-subscription.validator";
import { requireNewsletterAccess } from "@/newsletter/utils/require-newsletter-access";
import { safeMutation, safeRead } from "@/newsletter/utils/safe-operation";
import { logger } from "@/lib/logger";
import type { NewsletterActionResult } from "@/newsletter/types/result";
import {
  DEFAULT_NEWSLETTER_PAGE_SIZE,
  type NewsletterSubscriber,
  type NewsletterSubscriberSearchFilters,
  type NewsletterSubscriberSearchResult,
  type NewsletterSubscriberStatus,
} from "@/newsletter/types/newsletter-subscriber";

/** Matches the contact form's window/limit — a public, unauthenticated
 *  write needs the same coarse abuse ceiling, and there is no reason for
 *  one visitor to subscribe more than a handful of addresses. */
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

export interface NewsletterSubscribeContext {
  ipAddress: string | null;
  rateLimitedMessage: string;
}

/**
 * Orchestration for `newsletter_subscribers`. `subscribe` is the only
 * method and the only unauthenticated write in this domain — anyone can
 * reach the footer form, signed in or not.
 *
 * Every outcome a caller can distinguish is deliberately the same
 * `success: true`, including a honeypot hit and an address that is
 * already subscribed. The form must never reveal whether an address is
 * on the list.
 */
export const NewsletterSubscriptionService = {
  async subscribe(
    rawInput: unknown,
    context: NewsletterSubscribeContext,
  ): Promise<NewsletterActionResult> {
    return safeMutation(async () => {
      const parsed = subscribeToNewsletterSchema.safeParse(rawInput);
      if (!parsed.success) {
        return {
          success: false,
          code: "validation_failed",
          message: parsed.error.issues.map((issue) => issue.message).join(" "),
        };
      }

      if (parsed.data.website.trim()) {
        // Honeypot: report success, store nothing — same decoy response
        // `ContactMessageService.submit` gives, so a bot can't tell it
        // was caught.
        logger.info("[newsletter] honeypot submission ignored", {
          ipAddress: context.ipAddress,
        });
        return { success: true, data: undefined };
      }

      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recent = await NewsletterSubscriberRepository.countRecentByIp(context.ipAddress, since);
      if (recent >= MAX_SUBMISSIONS_PER_WINDOW) {
        return { success: false, code: "rate_limited", message: context.rateLimitedMessage };
      }

      const subscriber = await NewsletterSubscriberRepository.subscribe({
        email: parsed.data.email.toLowerCase(),
        locale: parsed.data.locale,
        ipAddress: context.ipAddress,
      });
      logger.info("[newsletter] subscribed", { id: subscriber.id, locale: subscriber.locale });
      return { success: true, data: undefined };
    });
  },

  /**
   * `/admin/newsletter`'s listing. Unlike most domains here, this READ is
   * admin-gated: the rows are email addresses people handed over for one
   * stated purpose, so a signed-out or non-admin caller gets an empty
   * page, never the list. `/admin/*` already gates at the layout, but a
   * Server Action is a public POST endpoint regardless of which page
   * happens to render it — the guard has to live here.
   */
  async searchResolved(
    filters: NewsletterSubscriberSearchFilters,
  ): Promise<NewsletterSubscriberSearchResult> {
    const empty: NewsletterSubscriberSearchResult = {
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? DEFAULT_NEWSLETTER_PAGE_SIZE,
      totalPages: 1,
    };
    const admin = await requireNewsletterAccess();
    if (!admin) return empty;
    return safeRead(() => NewsletterSubscriberRepository.search(filters), empty);
  },

  async countByStatus(): Promise<Record<string, number>> {
    const admin = await requireNewsletterAccess();
    if (!admin) return {};
    return safeRead(() => NewsletterSubscriberRepository.countByStatus(), {});
  },

  /** Powers the CSV export — every currently-subscribed address. */
  async listSubscribedEmails(): Promise<NewsletterActionResult<{ email: string; locale: string; createdAt: string }[]>> {
    return safeMutation(async () => {
      const admin = await requireNewsletterAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot export subscribers." };
      }
      const rows = await NewsletterSubscriberRepository.listSubscribedEmails();
      logger.info("[newsletter] exported", { actorId: admin.id, count: rows.length });
      return { success: true, data: rows };
    });
  },

  async setStatus(
    id: string,
    status: NewsletterSubscriberStatus,
  ): Promise<NewsletterActionResult<NewsletterSubscriber>> {
    return safeMutation(async () => {
      const admin = await requireNewsletterAccess();
      if (!admin) {
        return { success: false, code: "forbidden", message: "You cannot manage subscribers." };
      }
      const updated = await NewsletterSubscriberRepository.setStatus(id, status);
      if (!updated) {
        return { success: false, code: "not_found", message: "Subscriber not found." };
      }
      logger.info("[newsletter] status changed", { id, status, actorId: admin.id });
      return { success: true, data: updated };
    });
  },
};
