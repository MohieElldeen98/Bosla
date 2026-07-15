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

export const SITE_SETTING_SCHEMAS = {
  footer: footerSettingsSchema,
  seoDefaults: seoDefaultsSchema,
  blog: blogSettingsSchema,
} satisfies Record<SiteSettingKey, z.ZodType>;

export function validateSiteSetting(key: SiteSettingKey, value: unknown) {
  return SITE_SETTING_SCHEMAS[key].safeParse(value);
}
