"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitContactMessageAction } from "@/contact/actions/contact-message.actions";
import { createContactFormSchema, type ContactFormValues } from "@/contact/validators/contact-message.validator";

/**
 * The public `/contact` form (docs/legal-content-platform.md §Contact
 * Page) — React Hook Form + Zod, same "localized validation messages
 * via a schema factory" pattern `createSignUpSchema` established,
 * submitting through `submitContactMessageAction` (the Server Action,
 * which re-validates server-side regardless of what passed here).
 */
export function ContactForm() {
  const t = useTranslations("Contact.form");
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      createContactFormSchema({
        nameRequired: t("errors.nameRequired"),
        emailRequired: t("errors.emailRequired"),
        emailInvalid: t("errors.emailInvalid"),
        subjectRequired: t("errors.subjectRequired"),
        messageRequired: t("errors.messageRequired"),
        messageTooLong: t("errors.messageTooLong"),
      }),
    [t],
  );

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { website: "", formLoadedAt: undefined },
  });

  useEffect(() => {
    setValue("formLoadedAt", Date.now());
  }, [setValue]);

  async function onSubmit(values: ContactFormValues) {
    setServerError(null);
    const result = await submitContactMessageAction(values);
    if (!result.success) {
      setServerError(result.message);
      return;
    }
    reset();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-card p-8 text-center" role="status">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </span>
        <p className="text-lg font-semibold text-foreground">{t("successTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("successDescription")}</p>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValue("formLoadedAt", Date.now());
            setSubmitted(false);
          }}
        >
          {t("sendAnother")}
        </Button>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <input aria-hidden="true" tabIndex={-1} autoComplete="off" {...register("website")} />
        <input aria-hidden="true" tabIndex={-1} autoComplete="off" {...register("formLoadedAt", { valueAsNumber: true })} />
      </div>
      {serverError && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          {serverError}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{t("nameLabel")}</Label>
          <Input
            id="contact-name"
            autoComplete="name"
            aria-invalid={errors.name ? "true" : "false"}
            aria-describedby={errors.name ? "contact-name-error" : undefined}
            disabled={isSubmitting}
            {...register("name")}
          />
          {errors.name && (
            <p id="contact-name-error" className="text-xs text-destructive">
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{t("emailLabel")}</Label>
          <Input
            id="contact-email"
            type="email"
            autoComplete="email"
            dir="ltr"
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "contact-email-error" : undefined}
            disabled={isSubmitting}
            {...register("email")}
          />
          {errors.email && (
            <p id="contact-email-error" className="text-xs text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-subject">{t("subjectLabel")}</Label>
        <Input
          id="contact-subject"
          aria-invalid={errors.subject ? "true" : "false"}
          aria-describedby={errors.subject ? "contact-subject-error" : undefined}
          disabled={isSubmitting}
          {...register("subject")}
        />
        {errors.subject && (
          <p id="contact-subject-error" className="text-xs text-destructive">
            {errors.subject.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="contact-message">{t("messageLabel")}</Label>
        <Textarea
          id="contact-message"
          rows={6}
          aria-invalid={errors.message ? "true" : "false"}
          aria-describedby={errors.message ? "contact-message-error" : undefined}
          disabled={isSubmitting}
          {...register("message")}
        />
        {errors.message && (
          <p id="contact-message-error" className="text-xs text-destructive">
            {errors.message.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Send aria-hidden="true" />}
        {isSubmitting ? t("sending") : t("submit")}
      </Button>
    </form>
  );
}
