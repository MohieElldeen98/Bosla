import { z } from "zod";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import type { SiteSettingKey } from "@/cms/types/site-settings";

const footerSettingsSchema = z.object({
  tagline: localizedTextSchema,
  socialLinks: z.array(z.object({ platform: z.string().min(1), href: z.string().min(1) })),
  newsletterTitle: localizedTextSchema,
  newsletterSubtitle: localizedTextSchema,
});

const seoDefaultsSchema = z.object({
  title: localizedTextSchema,
  description: localizedTextSchema,
  ogImageId: z.string().uuid().optional(),
});

/** Same registry pattern as `CMS_SECTION_CONTENT_SCHEMAS` — one lookup,
 *  keyed by settings key, so adding a new sitewide setting later is one
 *  more entry, not a new table or a new service method. */
const blogSettingsSchema = z.object({
  showMostPopular: z.boolean(),
});

/** Exported (not `const`-only like its siblings) — the `/admin/settings`
 *  form's `zodResolver` reuses this exact schema rather than a
 *  duplicate client-side copy. */
export const contactSettingsSchema = z.object({
  companyName: z.string().trim().min(1).max(200),
  brandName: z.string().trim().min(1).max(100),
  supportEmail: z.string().trim().min(1).email(),
  businessEmail: z.string().trim().min(1).email(),
  paymentsEmail: z.string().trim().min(1).email(),
  privacyEmail: z.string().trim().min(1).email(),
  phone: z.string().trim().min(1).max(50),
  address: localizedTextSchema,
  businessHours: localizedTextSchema,
  copyrightText: localizedTextSchema,
});
export type ContactSettingsFormValues = z.infer<typeof contactSettingsSchema>;

export const SITE_SETTING_SCHEMAS = {
  footer: footerSettingsSchema,
  seoDefaults: seoDefaultsSchema,
  blog: blogSettingsSchema,
  contact: contactSettingsSchema,
} satisfies Record<SiteSettingKey, z.ZodType>;

export function validateSiteSetting(key: SiteSettingKey, value: unknown) {
  return SITE_SETTING_SCHEMAS[key].safeParse(value);
}
