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

/**
 * The `.optional()` counterpart for a `LocalizedText` field (e.g. a
 * section's `subtitle`) — genuinely different from `localizedTextSchema
 * .optional()`, which only lets the *key* be omitted but still requires
 * every locale non-empty the moment it's present. An admin form that
 * always renders both an EN and an AR input for an optional field has no
 * way to represent "omitted" other than leaving both inputs blank, so this
 * schema treats "every locale blank" as equivalent to omitted (and still
 * rejects a half-filled value — English only, no Arabic — as a real
 * validation error).
 */
export const optionalLocalizedTextSchema = z
  .object(
    Object.fromEntries(routing.locales.map((locale) => [locale, z.string()])) as Record<
      (typeof routing.locales)[number],
      z.ZodString
    >,
  )
  .optional()
  .transform((value) => {
    if (!value) return undefined;
    const trimmed = Object.fromEntries(
      Object.entries(value).map(([locale, text]) => [locale, text.trim()]),
    );
    const isEmpty = Object.values(trimmed).every((text) => text.length === 0);
    return isEmpty ? undefined : (trimmed as typeof value);
  })
  .pipe(localizedTextSchema.optional());

export const cmsLinkSchema = z.object({
  label: localizedTextSchema,
  href: z.string().min(1),
});

export const cmsIconKeySchema = z.string().min(1);
