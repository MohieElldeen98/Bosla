import { z } from "zod";

export interface ForgotPasswordMessages {
  emailRequired: string;
  emailInvalid: string;
}

/**
 * Same shape is reused for "resend verification email" — see
 * `auth/actions/action-contracts.ts` — since both flows only ever collect
 * an email address.
 */
export function createForgotPasswordSchema(messages: ForgotPasswordMessages) {
  return z.object({
    email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
  });
}

export type ForgotPasswordInput = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
