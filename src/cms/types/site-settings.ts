import type { LocalizedText } from "@/types/i18n";

/** The only platforms the public `Footer` actually knows how to render an
 *  icon and accessible label for (`src/components/layout/footer.tsx`'s
 *  `SOCIAL_ICONS`/`SOCIAL_LABEL_KEYS`) — the single source of truth both
 *  that lookup and the admin editor's dropdown are typed against, so a
 *  platform can't be saved that would silently render nothing. */
export const SUPPORTED_SOCIAL_PLATFORMS = [
  "instagram",
  "facebook",
  "youtube",
  "tiktok",
  "threads",
  "twitter",
  "linkedin",
  "whatsapp",
  "telegram",
  "github",
] as const;
export type SocialPlatform = (typeof SUPPORTED_SOCIAL_PLATFORMS)[number];

/**
 * Footer non-navigation content — tagline, social links, newsletter copy
 * (docs/cms-overview.md §9). A singleton (one row, `key: "footer"`), not a
 * reorderable list — the footer's layout is fixed.
 */
export interface FooterSettings {
  tagline: LocalizedText;
  socialLinks: { platform: SocialPlatform; href: string }[];
  newsletterTitle: LocalizedText;
  newsletterSubtitle: LocalizedText;
}

/** Locale-resolved view of `FooterSettings` — what `Footer` (a Client
 *  Component) actually renders, resolved server-side before being passed
 *  down as a prop. */
export interface ResolvedFooterSettings {
  tagline: string;
  socialLinks: { platform: SocialPlatform; href: string }[];
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
  blog: BlogSettings;
  contact: ContactSettings;
}

/** Locale-resolved view of `ContactSettings` — what the Footer,
 *  `/contact`, and the legal pages actually render. */
export interface ResolvedContactSettings {
  companyName: string;
  brandName: string;
  supportEmail: string;
  businessEmail: string;
  paymentsEmail: string;
  privacyEmail: string;
  phone: string;
  address: string;
  businessHours: string;
  copyrightText: string;
}

/** Blog presentation flags an Admin toggles from `/admin/articles` —
 *  currently just whether `/blog` shows the "Most popular" rail. */
export interface BlogSettings {
  showMostPopular: boolean;
}

/**
 * The centralized company/contact info (docs/legal-content-platform.md
 * §Global Site Settings) — the single source of truth every page that
 * mentions "how to reach Bosla" reads from: the Footer, `/contact`, and
 * the three legal documents (which reference `supportEmail`/
 * `privacyEmail`/`companyName` inline via template tokens the public
 * pages substitute at render time — see `LegalDocumentPage`'s doc
 * comment). Changing one field here propagates everywhere with no code
 * change, exactly the requirement this key exists to satisfy.
 *
 * `address`/`businessHours`/`copyrightText` are `LocalizedText` (they're
 * genuinely translated prose); `companyName`/`brandName`/the emails/
 * `phone` are plain strings — a legal entity name, an email address, and
 * a phone number don't have an Arabic/English variant to choose
 * between. Social links are deliberately NOT duplicated here — they
 * already live in the `footer` key (`FooterSettings.socialLinks`); the
 * Contact page reads that key directly rather than this one having a
 * second copy of the same array.
 */
export interface ContactSettings {
  /** The legal entity name — what appears in "© {companyName}" and
   *  legal-document self-references ("Bosla Learning FZ-LLC", not the
   *  short brand name). */
  companyName: string;
  /** The short/marketing brand name — distinct from `companyName` the
   *  same way a real company's legal name and trade name differ.
   *  Falls back to `Common.brandName` (the header/footer wordmark) if a
   *  caller wants that instead; this field exists for contexts that
   *  specifically need an editable override (legal document body text). */
  brandName: string;
  supportEmail: string;
  businessEmail: string;
  paymentsEmail: string;
  privacyEmail: string;
  phone: string;
  address: LocalizedText;
  businessHours: LocalizedText;
  copyrightText: LocalizedText;
}

export type SiteSettingKey = keyof SiteSettingsByKey;

export const SITE_SETTING_KEYS = ["footer", "seoDefaults", "blog", "contact"] as const satisfies readonly SiteSettingKey[];
