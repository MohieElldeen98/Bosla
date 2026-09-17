"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { NewsletterSubscriptionService } from "@/newsletter/services/newsletter-subscription.service";
import type { NewsletterActionResult } from "@/newsletter/types/result";

/** The footer subscribe form's Server Action — no session required,
 *  anyone can reach it. `NewsletterSubscriptionService.subscribe` is the
 *  trust boundary (server-side Zod re-validation), exactly as
 *  `submitContactMessageAction` delegates to its own service. */
export async function subscribeToNewsletterAction(
  rawInput: unknown,
): Promise<NewsletterActionResult> {
  const t = await getTranslations("Footer");
  let ipAddress: string | null = null;
  try {
    const requestHeaders = await headers();
    const cloudflareIp = requestHeaders.get("cf-connecting-ip")?.trim();
    const forwardedIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
    ipAddress = cloudflareIp || forwardedIp || null;
  } catch {
    // Rate limiting simply doesn't apply when request headers are absent.
  }
  return NewsletterSubscriptionService.subscribe(rawInput, {
    ipAddress,
    rateLimitedMessage: t("newsletterRateLimited"),
  });
}
