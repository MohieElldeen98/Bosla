import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { Locale } from "@/i18n/routing";
import type { ContactSettings, ResolvedContactSettings } from "@/cms/types/site-settings";

/** Flattens the `contact` site setting to the active locale — shared by
 *  every consumer (`PublicLayout`/`Footer`, `/contact`,
 *  `LegalDocumentService`'s token substitution) so the same
 *  locale-resolution logic isn't repeated at each call site. */
export function resolveContactSettings(
  raw: ContactSettings | null,
  locale: Locale,
): ResolvedContactSettings | null {
  if (!raw) return null;
  return {
    companyName: raw.companyName,
    brandName: raw.brandName,
    supportEmail: raw.supportEmail,
    businessEmail: raw.businessEmail,
    paymentsEmail: raw.paymentsEmail,
    privacyEmail: raw.privacyEmail,
    phone: raw.phone,
    address: resolveLocalizedText(raw.address, locale),
    businessHours: resolveLocalizedText(raw.businessHours, locale),
    copyrightText: resolveLocalizedText(raw.copyrightText, locale),
  };
}
