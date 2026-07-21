import { z } from "zod";

export interface ChangeEmailMessages {
  emailRequired: string;
  emailInvalid: string;
}

export function createChangeEmailSchema(messages: ChangeEmailMessages) {
  return z.object({
    newEmail: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
  });
}

export type ChangeEmailInput = z.infer<ReturnType<typeof createChangeEmailSchema>>;
