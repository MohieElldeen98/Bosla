"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Compass, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { ResolvedCmsNavigationItem } from "@/cms/types/navigation";
import type { ResolvedFooterSettings } from "@/cms/types/site-settings";

function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function GithubIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 2a10 10 0 0 0-3.162 19.492c.5.092.682-.217.682-.483 0-.237-.009-.868-.014-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.221-.253-4.556-1.111-4.556-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.679.919.679 1.852 0 1.336-.012 2.415-.012 2.743 0 .268.18.58.688.482A10 10 0 0 0 12 2Z" />
    </svg>
  );
}

function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.114 20.452H3.558V9h3.556v11.452z" />
    </svg>
  );
}

const SOCIAL_ICONS: Record<string, (props: React.SVGProps<SVGSVGElement>) => React.JSX.Element> = {
  twitter: XIcon,
  github: GithubIcon,
  linkedin: LinkedinIcon,
};

const SOCIAL_LABEL_KEYS: Record<string, "socialTwitter" | "socialGithub" | "socialLinkedin"> = {
  twitter: "socialTwitter",
  github: "socialGithub",
  linkedin: "socialLinkedin",
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
}: {
  productLinks: ResolvedCmsNavigationItem[];
  companyLinks: ResolvedCmsNavigationItem[];
  resourcesLinks: ResolvedCmsNavigationItem[];
  settings: ResolvedFooterSettings | null;
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
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Compass className="size-5" />
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
            &copy; {new Date().getFullYear()} {tCommon("brandName")}.{" "}
            {t("rights")}
          </p>
        </div>
      </div>
    </footer>
  );
}
