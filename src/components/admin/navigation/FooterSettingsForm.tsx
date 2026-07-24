"use client";

import { useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ExternalLink, Save } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";
import { SelectField } from "@/components/admin/courses/SelectField";
import { ArrayFieldEditor } from "@/components/admin/homepage/ArrayFieldEditor";
import { generateItemId } from "@/components/admin/homepage/form-utils";
import { setSiteSettingAction } from "@/cms/actions/site-settings.actions";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { SOCIAL_ICONS } from "@/components/social-icons";
import { SUPPORTED_SOCIAL_PLATFORMS } from "@/cms/types/site-settings";
import type { FooterSettings, SocialPlatform } from "@/cms/types/site-settings";

/** Expected domain(s) for each platform's profile URL, plus a realistic
 *  example — purely a UI nudge (`SocialHrefWarning` below), not enforced by
 *  `footerFormSchema`: an admin might legitimately use a shortener or a
 *  regional domain, so a mismatch warns without blocking save. */
const SOCIAL_DOMAIN_HINTS: Record<SocialPlatform, { domains: string[]; example: string }> = {
  instagram: { domains: ["instagram.com"], example: "https://instagram.com/bosla" },
  facebook: { domains: ["facebook.com", "fb.com"], example: "https://facebook.com/bosla" },
  youtube: { domains: ["youtube.com", "youtu.be"], example: "https://youtube.com/@bosla" },
  tiktok: { domains: ["tiktok.com"], example: "https://tiktok.com/@bosla" },
  threads: { domains: ["threads.net", "threads.com"], example: "https://threads.net/@bosla" },
  twitter: { domains: ["twitter.com", "x.com"], example: "https://x.com/bosla" },
  linkedin: { domains: ["linkedin.com"], example: "https://linkedin.com/company/bosla" },
  whatsapp: { domains: ["wa.me", "whatsapp.com"], example: "https://wa.me/201234567890" },
  telegram: { domains: ["t.me", "telegram.org", "telegram.me"], example: "https://t.me/bosla" },
  github: { domains: ["github.com"], example: "https://github.com/bosla" },
};

const footerFormSchema = z.object({
  tagline: localizedTextSchema,
  socialLinks: z.array(
    z.object({ fieldId: z.string(), platform: z.enum(SUPPORTED_SOCIAL_PLATFORMS), href: z.string().trim().min(1) }),
  ),
  newsletterTitle: localizedTextSchema,
  newsletterSubtitle: localizedTextSchema,
});
type FooterFormValues = z.infer<typeof footerFormSchema>;

function toFormValues(settings: FooterSettings | null): FooterFormValues {
  return {
    tagline: settings?.tagline ?? { en: "", ar: "" },
    socialLinks: (settings?.socialLinks ?? []).map((link) => ({ fieldId: generateItemId(), ...link })),
    newsletterTitle: settings?.newsletterTitle ?? { en: "", ar: "" },
    newsletterSubtitle: settings?.newsletterSubtitle ?? { en: "", ar: "" },
  };
}

/** Live, non-blocking nudge (same "informational only" pattern as
 *  `SeoForm`'s `CharCount`) — warns when a social link's URL doesn't look
 *  like it belongs to the selected platform, without a validation error
 *  blocking save (an admin might genuinely use a shortener or country TLD). */
function SocialHrefWarning({ control, index }: { control: Control<FooterFormValues>; index: number }) {
  const t = useTranslations("Admin.navigation.footerSettings");
  const platform = useWatch({ control, name: `socialLinks.${index}.platform` });
  const href = useWatch({ control, name: `socialLinks.${index}.href` }) ?? "";
  const trimmed = href.trim().toLowerCase();
  if (!trimmed) return null;

  const { domains, example } = SOCIAL_DOMAIN_HINTS[platform];
  if (domains.some((domain) => trimmed.includes(domain))) return null;

  return (
    <p className="text-xs text-amber-600">{t("domainWarning", { platform: t(`platforms.${platform}`), example })}</p>
  );
}

/** The Profile URL field, with its placeholder tracking the row's selected
 *  platform (`SOCIAL_DOMAIN_HINTS[platform].example`) — previously a fixed
 *  "https://twitter.com/bosla" no matter what platform was picked, which
 *  misled admins filling in e.g. a GitHub or LinkedIn row. */
function SocialHrefField({
  control,
  register,
  errors,
  index,
}: {
  control: Control<FooterFormValues>;
  register: UseFormRegister<FooterFormValues>;
  errors: FieldErrors<FooterFormValues>;
  index: number;
}) {
  const t = useTranslations("Admin.navigation.footerSettings");
  const platform = useWatch({ control, name: `socialLinks.${index}.platform` });

  return (
    <PlainTextField
      id={`footer-social-${index}-href`}
      label={t("fields.socialHref")}
      name={`socialLinks.${index}.href`}
      register={register}
      errors={errors}
      placeholder={SOCIAL_DOMAIN_HINTS[platform].example}
      action={<OpenLinkButton control={control} index={index} />}
    />
  );
}

/** Opens the row's current URL in a new tab — a quick way to sanity-check a
 *  social link while reviewing without leaving the admin. Renders nothing
 *  until there's a value to open. */
function OpenLinkButton({ control, index }: { control: Control<FooterFormValues>; index: number }) {
  const t = useTranslations("Admin.navigation.footerSettings");
  const href = useWatch({ control, name: `socialLinks.${index}.href` }) ?? "";
  const trimmed = href.trim();
  if (!trimmed) return null;

  return (
    <a
      href={trimmed}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
    >
      <ExternalLink aria-hidden="true" className="size-3.5" />
      {t("openLink")}
    </a>
  );
}

/** `/admin/navigation`'s Footer Settings tab — the `footer` site setting
 *  (tagline, social links, newsletter copy), same "generic key/value
 *  setting" form pattern `ContactSettingsForm` already uses. Social
 *  platform is a closed dropdown, not free text — `Footer`'s icon/label
 *  lookup only knows `SUPPORTED_SOCIAL_PLATFORMS`; anything else would
 *  save successfully but render nothing. */
export function FooterSettingsForm({ initialValue }: { initialValue: FooterSettings | null }) {
  const t = useTranslations("Admin.navigation.footerSettings");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FooterFormValues>({
    resolver: zodResolver(footerFormSchema),
    defaultValues: toFormValues(initialValue),
  });

  const socialLinks = useFieldArray({ control, name: "socialLinks", keyName: "fieldId" });

  async function onSubmit(values: FooterFormValues) {
    setError(null);
    const payload: FooterSettings = {
      tagline: values.tagline,
      socialLinks: values.socialLinks.map(({ platform, href }) => ({ platform, href })),
      newsletterTitle: values.newsletterTitle,
      newsletterSubtitle: values.newsletterSubtitle,
    };
    const result = await setSiteSettingAction("footer", payload);
    if (result.success) {
      toast.success(t("saved"));
      router.refresh();
    } else {
      setError(result.message);
      toast.error(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.tagline")}</h2>
        <LocalizedTextField id="footer-tagline" label={t("fields.tagline")} name="tagline" register={register} errors={errors} multiline />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.social")}</h2>
        <ArrayFieldEditor
          label={t("fields.socialLinks")}
          fields={socialLinks.fields}
          onAdd={() => socialLinks.append({ fieldId: generateItemId(), platform: "twitter", href: "" })}
          onRemove={socialLinks.remove}
          onMoveUp={(index) => socialLinks.move(index, index - 1)}
          onMoveDown={(index) => socialLinks.move(index, index + 1)}
          addLabel={t("addSocialLink")}
          removeLabel={t("removeSocialLink")}
          moveUpLabel={t("moveItemUp")}
          moveDownLabel={t("moveItemDown")}
          emptyLabel={t("noSocialLinks")}
          renderItem={(field, index) => (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
              <SelectField
                id={`footer-social-${index}-platform`}
                label={t("fields.platform")}
                name={`socialLinks.${index}.platform`}
                control={control}
                options={SUPPORTED_SOCIAL_PLATFORMS.map((platform) => ({
                  value: platform,
                  label: t(`platforms.${platform}`),
                }))}
                renderOption={(value, label) => {
                  const Icon = SOCIAL_ICONS[value as SocialPlatform];
                  return (
                    <>
                      <Icon aria-hidden="true" />
                      {label}
                    </>
                  );
                }}
              />
              <div className="space-y-1.5">
                <SocialHrefField control={control} register={register} errors={errors} index={index} />
                <SocialHrefWarning control={control} index={index} />
              </div>
            </div>
          )}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.newsletter")}</h2>
        <div className="space-y-4">
          <LocalizedTextField
            id="footer-newsletter-title"
            label={t("fields.newsletterTitle")}
            name="newsletterTitle"
            register={register}
            errors={errors}
          />
          <LocalizedTextField
            id="footer-newsletter-subtitle"
            label={t("fields.newsletterSubtitle")}
            name="newsletterSubtitle"
            register={register}
            errors={errors}
          />
        </div>
      </div>

      <LoadingButton type="submit" isLoading={isSubmitting}>
        <Save aria-hidden="true" />
        {t("save")}
      </LoadingButton>
    </form>
  );
}
