"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Loader2, Mail, Phone } from "lucide-react";
import { BoslaLoader } from "@/components/brand/BoslaLoader";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SOCIAL_ICONS } from "@/components/social-icons";
import type { ResolvedCmsNavigationItem } from "@/cms/types/navigation";
import type { ResolvedContactSettings, ResolvedFooterSettings, SocialPlatform } from "@/cms/types/site-settings";

const SOCIAL_LABEL_KEYS: Record<
  SocialPlatform,
  | "socialInstagram"
  | "socialFacebook"
  | "socialYoutube"
  | "socialTiktok"
  | "socialThreads"
  | "socialWhatsapp"
  | "socialTelegram"
  | "socialTwitter"
  | "socialLinkedin"
  | "socialGithub"
> = {
  instagram: "socialInstagram",
  facebook: "socialFacebook",
  youtube: "socialYoutube",
  tiktok: "socialTiktok",
  threads: "socialThreads",
  whatsapp: "socialWhatsapp",
  telegram: "socialTelegram",
  twitter: "socialTwitter",
  linkedin: "socialLinkedin",
  github: "socialGithub",
};

type NewsletterValues = { email: string };

function NewsletterForm() {
  const t = useTranslations("Footer");
  const [submitted, setSubmitted] = useState(false);

  const newsletterSchema = useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t("newsletterEmailRequired"))
          .email(t("newsletterEmailInvalid")),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterValues>({ resolver: zodResolver(newsletterSchema) });

  function onSubmit() {
    setSubmitted(true);
    reset();
  }

  if (submitted) {
    return (
      <p role="status" className="text-sm font-medium text-emerald-400">
        {t("newsletterSuccess")}
      </p>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit(onSubmit)}
      className="flex flex-col gap-2 sm:flex-row sm:items-start"
    >
      <div className="flex-1">
        <label htmlFor="newsletter-email" className="sr-only">
          {t("newsletterPlaceholder")}
        </label>
        <input
          id="newsletter-email"
          type="email"
          autoComplete="email"
          placeholder={t("newsletterPlaceholder")}
          aria-invalid={errors.email ? "true" : "false"}
          aria-describedby={errors.email ? "newsletter-error" : undefined}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          {...register("email")}
        />
        {errors.email && (
          <p id="newsletter-error" className="mt-1.5 text-xs text-red-400">
            {errors.email.message}
          </p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting} className="shrink-0">
        {isSubmitting && <Loader2 className="size-4 animate-spin" />}
        {t("newsletterCta")}
      </Button>
    </form>
  );
}

export function Footer({
  productLinks,
  companyLinks,
  resourcesLinks,
  settings,
  contact,
}: {
  productLinks: ResolvedCmsNavigationItem[];
  companyLinks: ResolvedCmsNavigationItem[];
  resourcesLinks: ResolvedCmsNavigationItem[];
  settings: ResolvedFooterSettings | null;
  /** The centralized `contact` site setting (docs/legal-content-platform.md
   *  §Global Site Settings) — `null` only until an Admin first saves it
   *  from `/admin/settings`; the block below simply doesn't render until
   *  then, same graceful-optional pattern `settings` already follows. */
  contact: ResolvedContactSettings | null;
}) {
  const t = useTranslations("Footer");
  const tCommon = useTranslations("Common");

  const columns = [
    { title: t("product"), links: productLinks },
    { title: t("company"), links: companyLinks },
    { title: t("resources"), links: resourcesLinks },
  ];

  return (
    <footer className="border-t border-white/10 bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <Link href="/" className="flex items-center gap-2 font-semibold">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <BoslaLoader label="" ring="strong" className="size-6" />
              </span>
              <span className="text-lg tracking-tight">
                {tCommon("brandName")}
              </span>
            </Link>
            {settings && (
              <>
                <p className="mt-4 max-w-sm text-sm text-white/50">{settings.tagline}</p>
                <div className="mt-6 flex items-center gap-4 text-white/50">
                  {settings.socialLinks.map((social) => {
                    const Icon = SOCIAL_ICONS[social.platform];
                    const labelKey = SOCIAL_LABEL_KEYS[social.platform];
                    if (!Icon || !labelKey) return null;
                    return (
                      <a
                        key={social.platform}
                        href={social.href}
                        aria-label={t(labelKey)}
                        className="hover:text-white"
                      >
                        <Icon className="size-5" />
                      </a>
                    );
                  })}
                </div>
              </>
            )}
            {contact && (
              <div className="mt-6 flex flex-col gap-2 text-sm text-white/50">
                <a href={`mailto:${contact.supportEmail}`} dir="ltr" className="flex w-fit items-center gap-2 hover:text-white">
                  <Mail aria-hidden="true" className="size-4 shrink-0" />
                  {contact.supportEmail}
                </a>
                <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} dir="ltr" className="flex w-fit items-center gap-2 hover:text-white">
                  <Phone aria-hidden="true" className="size-4 shrink-0" />
                  {contact.phone}
                </a>
              </div>
            )}
          </div>

          <div className="w-full max-w-sm">
            <h3 className="text-sm font-semibold">
              {settings?.newsletterTitle ?? t("newsletterTitle")}
            </h3>
            <p className="mt-2 text-sm text-white/50">
              {settings?.newsletterSubtitle ?? t("newsletterSubtitle")}
            </p>
            <div className="mt-4">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold">{column.title}</h3>
              <ul className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/50 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10 bg-white/10" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-white/40 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} {contact?.brandName ?? tCommon("brandName")}.{" "}
            {contact?.copyrightText ?? t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
