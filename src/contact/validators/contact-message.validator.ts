import { z } from "zod";
import { CONTACT_MESSAGE_STATUSES } from "@/contact/types/contact-message";

/** The public `/contact` form's server-side validation — the Server
 *  Action always re-validates against this regardless of what the
 *  client's `react-hook-form` already checked (a direct fetch to the
 *  action must never bypass length/shape limits), same "the server is
 *  the trust boundary" reasoning `startCheckoutSchema` follows.
 *  Messages here are plain English fallbacks; the form itself uses
 *  `createContactFormSchema` below with localized messages, so a real
 *  user only ever sees this schema's messages if they bypass the UI. */
export const submitContactMessageSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().min(1).max(320).email(),
  subject: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  website: z.string().max(200).optional().default(""),
  formLoadedAt: z.coerce.number().int().positive(),
});
export type SubmitContactMessageInput = z.infer<typeof submitContactMessageSchema>;

export interface ContactFormMessages {
  nameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  subjectRequired: string;
  messageRequired: string;
  messageTooLong: string;
}

/** Built as a factory — not a static schema — so the contact form
 *  supplies localized validation messages via next-intl, the same
 *  pattern `createSignUpSchema` established. */
export function createContactFormSchema(messages: ContactFormMessages) {
  return z.object({
    name: z.string().min(1, messages.nameRequired).max(200),
    email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
    subject: z.string().min(1, messages.subjectRequired).max(200),
    message: z.string().min(1, messages.messageRequired).max(5000, messages.messageTooLong),
    website: z.string().max(200).optional(),
    formLoadedAt: z.number().int().positive(),
  });
}
export type ContactFormValues = z.infer<ReturnType<typeof createContactFormSchema>>;

const contactMessageStatusSchema = z.enum(CONTACT_MESSAGE_STATUSES);

/** The admin inbox's search/filter input. */
export const searchContactMessagesSchema = z.object({
  query: z.string().trim().min(1).max(200).optional(),
  status: contactMessageStatusSchema.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});
