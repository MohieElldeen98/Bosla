import "server-only";

import { paymentEmailEnv } from "@/lib/env";
import { paymentsLogger } from "@/payments/utils/payments-logger";

export interface OutgoingEmail {
  to: string;
  subject: string;
  html: string;
  attachments?: { filename: string; content: string /* base64 */ }[];
}

/**
 * Transactional email transport for the Payment Platform — Resend's
 * REST API over plain `fetch` (no SDK dependency). Unconfigured
 * (`paymentEmailEnv === null`) degrades to a logged no-op: payment
 * emails are a courtesy on top of the in-app notifications, never a
 * gate on the money path — a completed payment must complete even if
 * email is down.
 *
 * Returns `true` only when the provider accepted the message. Never
 * throws.
 */
export async function sendPaymentEmail(email: OutgoingEmail): Promise<boolean> {
  if (!paymentEmailEnv) {
    paymentsLogger.info("email.skipped_unconfigured", { subject: email.subject });
    return false;
  }
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paymentEmailEnv.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: paymentEmailEnv.PAYMENT_EMAIL_FROM,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        ...(email.attachments && email.attachments.length > 0 ? { attachments: email.attachments } : {}),
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      paymentsLogger.warn("email.provider_rejected", {
        subject: email.subject,
        status: response.status,
        body: (await response.text()).slice(0, 300),
      });
      return false;
    }
    paymentsLogger.info("email.sent", { subject: email.subject });
    return true;
  } catch (error) {
    paymentsLogger.error("email.send_failed", {
      subject: email.subject,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}
