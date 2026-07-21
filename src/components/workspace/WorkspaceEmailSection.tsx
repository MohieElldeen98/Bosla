"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Card } from "@/components/ui/card";
import { changeEmailAction } from "@/auth/actions/change-email.action";
import { createChangeEmailSchema, type ChangeEmailInput } from "@/auth/validators/change-email.validator";
import type { Locale } from "@/i18n/routing";

/** `/me/settings`'s email section — current email is a read display,
 *  changing it opens the confirmation-email flow (Supabase emails the
 *  NEW address; the change isn't live until that link is clicked). */
export function WorkspaceEmailSection({ currentEmail }: { currentEmail: string }) {
  const t = useTranslations("Me.settings.email");
  const locale = useLocale() as Locale;
  const [isEditing, setIsEditing] = useState(false);

  const schema = createChangeEmailSchema({
    emailRequired: t("errors.emailRequired"),
    emailInvalid: t("errors.emailInvalid"),
  });
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailInput>({ resolver: zodResolver(schema) });

  async function onSubmit(values: ChangeEmailInput) {
    const result = await changeEmailAction(values, locale);
    if (result.success) {
      toast.success(t("confirmationSent", { email: values.newEmail }));
      setIsEditing(false);
      reset();
    } else {
      toast.error(result.message);
    }
  }

  return (
    <Card className="space-y-3 p-5">
      <div>
        <h3 className="text-sm font-medium text-foreground">{t("title")}</h3>
        <p className="text-sm text-muted-foreground">{currentEmail}</p>
      </div>
      {isEditing ? (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="newEmail" className="sr-only">
              {t("newEmailLabel")}
            </Label>
            <Input id="newEmail" type="email" placeholder={t("newEmailLabel")} {...register("newEmail")} />
            {errors.newEmail && <p className="text-xs text-destructive">{errors.newEmail.message}</p>}
          </div>
          <div className="flex gap-2">
            <LoadingButton type="submit" size="sm" isLoading={isSubmitting}>
              {t("sendConfirmation")}
            </LoadingButton>
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                reset();
              }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-sm font-medium text-primary underline underline-offset-4"
        >
          {t("changeEmail")}
        </button>
      )}
    </Card>
  );
}
