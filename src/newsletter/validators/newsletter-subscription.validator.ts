import { z } from "zod";
import { routing } from "@/i18n/routing";

/** The footer subscribe form's server-side validation — the Server Action
 *  always re-validates against this regardless of what the client's
 *  `react-hook-form` already checked (a direct POST to the action must
 *  never bypass it), the same "the server is the trust boundary" reasoning
 *  `submitContactMessageSchema` follows. Messages here are plain English
 *  fallbacks; the form uses `createNewsletterFormSchema` below with
 *  localized ones, so a real user never sees these. */
export const subscribeToNewsletterSchema = z.object({
  email: z.string().trim().min(1).max(320).email(),
  locale: z.enum(routing.locales).catch(routing.defaultLocale),
  /** Honeypot — same decoy field the contact form uses. A real browser
   *  never fills it; a bot that autofills every input does. */
  website: z.string().max(200).optional().default(""),
});
export type SubscribeToNewsletterInput = z.infer<typeof subscribeToNewsletterSchema>;

export interface NewsletterFormMessages {
  emailRequired: string;
  emailInvalid: string;
}

/** Built as a factory — not a static schema — so the footer form supplies
 *  localized validation messages via next-intl, the same pattern
 *  `createContactFormSchema` established. */
export function createNewsletterFormSchema(messages: NewsletterFormMessages) {
  return z.object({
    email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
    website: z.string().max(200).optional(),
  });
}
export type NewsletterFormValues = z.infer<ReturnType<typeof createNewsletterFormSchema>>;
