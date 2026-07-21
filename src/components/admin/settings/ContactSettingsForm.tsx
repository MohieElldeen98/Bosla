"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { setSiteSettingAction } from "@/cms/actions/site-settings.actions";
import { contactSettingsSchema, type ContactSettingsFormValues } from "@/cms/validators/site-settings.validator";
import type { ContactSettings } from "@/cms/types/site-settings";

const DEFAULT_VALUES: ContactSettingsFormValues = {
  companyName: "",
  brandName: "",
  supportEmail: "",
  businessEmail: "",
  paymentsEmail: "",
  privacyEmail: "",
  phone: "",
  address: { en: "", ar: "" },
  businessHours: { en: "", ar: "" },
  copyrightText: { en: "All rights reserved.", ar: "جميع الحقوق محفوظة." },
};

/**
 * `/admin/settings`'s form for the `contact` site setting
 * (docs/legal-content-platform.md §Global Site Settings) — the single
 * place that drives the Footer, `/contact`, and every `{{token}}`
 * reference inside the Privacy/Terms/Refunds documents. One save here
 * updates all of those on their next render, with zero code change.
 */
export function ContactSettingsForm({ initialValue }: { initialValue: ContactSettings | null }) {
  const t = useTranslations("Admin.settings.contact");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactSettingsFormValues>({
    resolver: zodResolver(contactSettingsSchema),
    defaultValues: initialValue ?? DEFAULT_VALUES,
  });

  async function onSubmit(values: ContactSettingsFormValues) {
    setError(null);
    const result = await setSiteSettingAction("contact", values);
    if (result.success) {
      toast.success(t("saved"));
      router.refresh();
    } else {
      setError(result.message);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.identity")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-company-name">{t("fields.companyName")}</Label>
            <Input id="settings-company-name" {...register("companyName")} />
            {errors.companyName && <p className="text-xs text-destructive">{errors.companyName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-brand-name">{t("fields.brandName")}</Label>
            <Input id="settings-brand-name" {...register("brandName")} />
            {errors.brandName && <p className="text-xs text-destructive">{errors.brandName.message}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.contact")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="settings-support-email">{t("fields.supportEmail")}</Label>
            <Input id="settings-support-email" type="email" dir="ltr" {...register("supportEmail")} />
            {errors.supportEmail && <p className="text-xs text-destructive">{errors.supportEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-business-email">{t("fields.businessEmail")}</Label>
            <Input id="settings-business-email" type="email" dir="ltr" {...register("businessEmail")} />
            {errors.businessEmail && <p className="text-xs text-destructive">{errors.businessEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-payments-email">{t("fields.paymentsEmail")}</Label>
            <Input id="settings-payments-email" type="email" dir="ltr" {...register("paymentsEmail")} />
            {errors.paymentsEmail && <p className="text-xs text-destructive">{errors.paymentsEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-privacy-email">{t("fields.privacyEmail")}</Label>
            <Input id="settings-privacy-email" type="email" dir="ltr" {...register("privacyEmail")} />
            {errors.privacyEmail && <p className="text-xs text-destructive">{errors.privacyEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="settings-phone">{t("fields.phone")}</Label>
            <Input id="settings-phone" dir="ltr" {...register("phone")} />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-4 text-sm font-semibold text-foreground">{t("sections.localized")}</h2>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-address-en">{t("fields.addressEn")}</Label>
              <Textarea id="settings-address-en" rows={2} dir="ltr" {...register("address.en")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-address-ar">{t("fields.addressAr")}</Label>
              <Textarea id="settings-address-ar" rows={2} dir="rtl" {...register("address.ar")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-hours-en">{t("fields.businessHoursEn")}</Label>
              <Input id="settings-hours-en" dir="ltr" {...register("businessHours.en")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-hours-ar">{t("fields.businessHoursAr")}</Label>
              <Input id="settings-hours-ar" dir="rtl" {...register("businessHours.ar")} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="settings-copyright-en">{t("fields.copyrightEn")}</Label>
              <Input id="settings-copyright-en" dir="ltr" {...register("copyrightText.en")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="settings-copyright-ar">{t("fields.copyrightAr")}</Label>
              <Input id="settings-copyright-ar" dir="rtl" {...register("copyrightText.ar")} />
            </div>
          </div>
        </div>
      </div>

      <LoadingButton type="submit" isLoading={isSubmitting}>
        <Save aria-hidden="true" />
        {t("save")}
      </LoadingButton>
    </form>
  );
}
