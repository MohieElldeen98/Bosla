import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { CompassBezel } from "@/components/brand/CompassBezel";
import { ContactForm } from "@/components/contact/ContactForm";
import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import { resolveContactSettings } from "@/cms/utils/resolve-contact-settings";
import { routing, type Locale } from "@/i18n/routing";

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  const canonical = `/${locale}/contact`;
  const languages = Object.fromEntries(routing.locales.map((loc) => [loc, `/${loc}/contact`]));

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical,
      languages: { ...languages, "x-default": `/${routing.defaultLocale}/contact` },
    },
    openGraph: { title: t("metaTitle"), description: t("metaDescription"), url: canonical, type: "website" },
    twitter: { card: "summary", title: t("metaTitle"), description: t("metaDescription") },
  };
}

/**
 * `/contact` (docs/legal-content-platform.md §Contact Page) — hero,
 * contact-info cards sourced entirely from the `contact` site setting
 * (never hardcoded — an Admin editing `/admin/settings` changes what
 * renders here with no code change), the submission form, and a short,
 * genuinely useful FAQ (not placeholder copy) that answers the
 * questions a visitor most likely has before writing in.
 */
export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tFaq, contactRaw] = await Promise.all([
    getTranslations("Contact"),
    getTranslations("Contact.faq"),
    CmsSiteSettingsService.get("contact"),
  ]);

  const contact = resolveContactSettings(contactRaw, locale as Locale);

  const jsonLd = contact
    ? {
        "@context": "https://schema.org",
        "@type": "ContactPage",
        about: {
          "@type": "Organization",
          name: contact.companyName,
          email: contact.supportEmail,
          telephone: contact.phone,
          address: contact.address,
        },
      }
    : null;

  const cards = contact
    ? [
        { icon: Mail, label: t("cards.email"), value: contact.supportEmail, href: `mailto:${contact.supportEmail}` },
        { icon: Phone, label: t("cards.phone"), value: contact.phone, href: `tel:${contact.phone.replace(/\s+/g, "")}` },
        { icon: MapPin, label: t("cards.address"), value: contact.address, href: undefined },
        { icon: Clock, label: t("cards.hours"), value: contact.businessHours, href: undefined },
      ]
    : [];

  const faqItems = [1, 2, 3, 4].map((index) => ({
    question: tFaq(`items.${index}.question`),
    answer: tFaq(`items.${index}.answer`),
  }));

  return (
    <div>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}

      <section className="relative overflow-hidden border-b border-border bg-muted/50 pt-28 pb-14 sm:pt-32 sm:pb-20">
        <CompassBezel className="pointer-events-none absolute -end-24 -top-24 size-80 text-primary/[0.07]" />
        <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8">
          <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">{t("heroTitle")}</h1>
          <p className="mt-4 text-pretty text-lg text-muted-foreground">{t("heroSubtitle")}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {cards.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="rounded-2xl border border-border bg-card p-5">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <p className="mt-3 text-xs font-medium text-muted-foreground">{label}</p>
                {href ? (
                  <a href={href} dir="ltr" className="mt-0.5 block truncate text-start text-sm font-semibold text-foreground hover:text-primary">
                    {value}
                  </a>
                ) : (
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-16">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("formTitle")}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{t("formSubtitle")}</p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{t("faq.title")}</h2>
            <dl className="mt-6 space-y-6">
              {faqItems.map((item) => (
                <div key={item.question}>
                  <dt className="text-sm font-semibold text-foreground">{item.question}</dt>
                  <dd className="mt-1.5 text-sm text-muted-foreground">{item.answer}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-6 text-sm text-muted-foreground">
              {t("responseTime")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
