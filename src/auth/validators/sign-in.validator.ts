import { z } from "zod";

export interface SignInMessages {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
}

export function createSignInSchema(messages: SignInMessages) {
  return z.object({
    email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
    password: z.string().min(1, messages.passwordRequired),
  });
}

export type SignInInput = z.infer<ReturnType<typeof createSignInSchema>>;
