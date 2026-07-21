import type { ResolvedContactSettings } from "@/cms/types/site-settings";

/**
 * Legal document bodies reference company/contact info via `{{token}}`
 * placeholders (`{{companyName}}`, `{{supportEmail}}`, …) instead of the
 * actual value — this is what makes "changing one value inside Admin
 * updates the Privacy Policy without code changes" (docs/
 * legal-content-platform.md §Global Site Settings) literally true:
 * editing the `contact` site setting changes what every `{{token}}`
 * resolves to on the NEXT render, with zero edits to the legal
 * document's own stored HTML. Substitution runs after locale resolution
 * but before `buildLegalToc` — plain string replacement, safe because
 * the values being substituted in are themselves plain strings (no HTML)
 * validated by `contactSettingsSchema` (email/string shapes), never
 * user-supplied HTML that could reopen an XSS path post-sanitization.
 */
export function buildLegalTokenMap(
  contact: ResolvedContactSettings | null,
  fallbackBrandName: string,
): Record<string, string> {
  const year = String(new Date().getFullYear());
  if (!contact) {
    return {
      companyName: fallbackBrandName,
      brandName: fallbackBrandName,
      supportEmail: "",
      businessEmail: "",
      paymentsEmail: "",
      privacyEmail: "",
      phone: "",
      address: "",
      businessHours: "",
      copyrightYear: year,
    };
  }
  return {
    companyName: contact.companyName,
    brandName: contact.brandName,
    supportEmail: contact.supportEmail,
    businessEmail: contact.businessEmail,
    paymentsEmail: contact.paymentsEmail,
    privacyEmail: contact.privacyEmail,
    phone: contact.phone,
    address: contact.address,
    businessHours: contact.businessHours,
    copyrightYear: year,
  };
}

export function substituteLegalTokens(html: string, tokens: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (match, key: string) => tokens[key] ?? match);
}
