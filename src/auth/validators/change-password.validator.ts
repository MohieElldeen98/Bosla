import { z } from "zod";

export interface ChangePasswordMessages {
  currentPasswordRequired: string;
  passwordTooShort: string;
  confirmPasswordRequired: string;
  passwordsDoNotMatch: string;
}

/** Requires the current password (re-verified via `AuthService
 *  .changePassword` — Supabase has no dedicated "verify without signing
 *  in" call, so the verification step is a real `signInWithPassword`)
 *  before accepting a new one, unlike `reset-password.validator.ts`'s
 *  flow, which is reached via an emailed recovery link and doesn't
 *  need it. */
export function createChangePasswordSchema(messages: ChangePasswordMessages) {
  return z
    .object({
      currentPassword: z.string().min(1, messages.currentPasswordRequired),
      password: z.string().min(8, messages.passwordTooShort),
      confirmPassword: z.string().min(1, messages.confirmPasswordRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });
}

export type ChangePasswordInput = z.infer<ReturnType<typeof createChangePasswordSchema>>;
