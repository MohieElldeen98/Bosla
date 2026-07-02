import { z } from "zod";

export interface ResetPasswordMessages {
  passwordTooShort: string;
  confirmPasswordRequired: string;
  passwordsDoNotMatch: string;
}

export function createResetPasswordSchema(messages: ResetPasswordMessages) {
  return z
    .object({
      password: z.string().min(8, messages.passwordTooShort),
      confirmPassword: z.string().min(1, messages.confirmPasswordRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });
}

export type ResetPasswordInput = z.infer<ReturnType<typeof createResetPasswordSchema>>;
