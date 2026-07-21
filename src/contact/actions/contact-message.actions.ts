"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { ContactMessageService } from "@/contact/services/contact-message.service";
import type { ContactMessage } from "@/contact/types/contact-message";
import type { ContactActionResult } from "@/contact/types/result";

/** The public `/contact` form's Server Action — no session required,
 *  anyone can reach it. `ContactMessageService.submit` is the trust
 *  boundary (server-side Zod re-validation). */
export async function submitContactMessageAction(rawInput: unknown): Promise<ContactActionResult<ContactMessage>> {
  const translations = await getTranslations("Contact.form");
  let ipAddress: string | null = null;
  try {
    const requestHeaders = await headers();
    const cloudflareIp = requestHeaders.get("cf-connecting-ip")?.trim();
    const forwardedIp = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim();
    ipAddress = cloudflareIp || forwardedIp || null;
  } catch {
    // Email-only limiting remains available when request headers are absent.
  }
  return ContactMessageService.submit(rawInput, {
    ipAddress,
    rateLimitedMessage: translations("rateLimited"),
    spamRejectedMessage: translations("spamRejected"),
  });
}

/** `/admin/contact`'s row actions — both gate through
 *  `requireContactAccess` inside the service, this is a thin
 *  pass-through. */
export async function markContactMessageResolvedAction(id: string): Promise<ContactActionResult<ContactMessage>> {
  return ContactMessageService.markResolved(id);
}

export async function deleteContactMessageAction(id: string): Promise<ContactActionResult> {
  return ContactMessageService.remove(id);
}
