import type { LocalizedText } from "@/types/i18n";

/**
 * Footer non-navigation content — tagline, social links, newsletter copy
 * (docs/cms-overview.md §9). A singleton (one row, `key: "footer"`), not a
 * reorderable list — the footer's layout is fixed.
 */
export interface FooterSettings {
  tagline: LocalizedText;
  socialLinks: { platform: string; href: string }[];
  newsletterTitle: LocalizedText;
  newsletterSubtitle: LocalizedText;
}

/** Locale-resolved view of `FooterSettings` — what `Footer` (a Client
 *  Component) actually renders, resolved server-side before being passed
 *  down as a prop. */
export interface ResolvedFooterSettings {
  tagline: string;
  socialLinks: { platform: string; href: string }[];
  newsletterTitle: string;
  newsletterSubtitle: string;
}

/** Sitewide SEO fallback used when a page has no `seo_meta` of its own
 *  (docs/cms-overview.md §7). */
export interface SiteSeoDefaults {
  title: LocalizedText;
  description: LocalizedText;
  ogImageId?: string;
}

/**
 * Known settings keys and their value shapes — adding a new sitewide
 * setting (default currency, feature flags — docs/database-overview.md)
 * later is one more entry here, never a schema migration, since
 * `cms_site_settings` is a generic key/value table.
 */
export interface SiteSettingsByKey {
  footer: FooterSettings;
  seoDefaults: SiteSeoDefaults;
}

export type SiteSettingKey = keyof SiteSettingsByKey;

export const SITE_SETTING_KEYS = ["footer", "seoDefaults"] as const satisfies readonly SiteSettingKey[];
