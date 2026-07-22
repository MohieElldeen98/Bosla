import { z } from "zod";

export const SIGN_UP_ACCOUNT_TYPES = ["student", "instructor"] as const;
export type SignUpAccountType = (typeof SIGN_UP_ACCOUNT_TYPES)[number];

export interface SignUpMessages {
  fullNameRequired: string;
  emailRequired: string;
  emailInvalid: string;
  passwordTooShort: string;
  confirmPasswordRequired: string;
  passwordsDoNotMatch: string;
  professionRequired: string;
  countryRequired: string;
  languageRequired: string;
  acceptTermsRequired: string;
}

/**
 * Built as a factory — not a static schema — so the caller supplies
 * localized validation messages via next-intl, mirroring the pattern
 * already used by the footer newsletter form
 * (`src/components/layout/footer.tsx`). `profession`/`country`/`language`
 * are plain id strings (validated against the resolved options list at the
 * form level, see `ProfessionSelect`/`CountrySelect`/`LanguageSelect`) —
 * kept as a flat object so adding a future field (e.g. phone number) is an
 * additive schema change, not a restructure.
 */
export function createSignUpSchema(messages: SignUpMessages) {
  return z
    .object({
      fullName: z.string().min(2, messages.fullNameRequired),
      accountType: z.enum(SIGN_UP_ACCOUNT_TYPES),
      email: z.string().min(1, messages.emailRequired).email(messages.emailInvalid),
      password: z.string().min(8, messages.passwordTooShort),
      confirmPassword: z.string().min(1, messages.confirmPasswordRequired),
      profession: z.string().min(1, messages.professionRequired),
      country: z.string().min(1, messages.countryRequired),
      language: z.string().min(1, messages.languageRequired),
      acceptTerms: z.boolean().refine((value) => value === true, {
        message: messages.acceptTermsRequired,
      }),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: messages.passwordsDoNotMatch,
      path: ["confirmPassword"],
    });
}

export type SignUpInput = z.infer<ReturnType<typeof createSignUpSchema>>;
