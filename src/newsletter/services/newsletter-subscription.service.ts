import "server-only";

import { NewsletterSubscriberRepository } from "@/newsletter/repositories/newsletter-subscriber.repository";
import { subscribeToNewsletterSchema } from "@/newsletter/validators/newsletter-subscription.validator";
import { safeMutation } from "@/newsletter/utils/safe-operation";
import { logger } from "@/lib/logger";
import type { NewsletterActionResult } from "@/newsletter/types/result";

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
};
