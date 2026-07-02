import { z } from "zod";
import { routing } from "@/i18n/routing";

/**
 * Shared building blocks every CMS Zod schema composes from — the "no
 * duplicated validation" requirement in practice. A `LocalizedText` value
 * must have every supported locale (`routing.locales`) present, so content
 * can never be saved half-translated.
 */
export const localizedTextSchema = z.object(
  Object.fromEntries(routing.locales.map((locale) => [locale, z.string().trim().min(1)])) as Record<
    (typeof routing.locales)[number],
    z.ZodString
  >,
);

export const localizedRichTextSchema = localizedTextSchema;

export const cmsLinkSchema = z.object({
  label: localizedTextSchema,
  href: z.string().min(1),
});

export const cmsIconKeySchema = z.string().min(1);
