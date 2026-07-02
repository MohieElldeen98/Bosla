"use client";

import type { FormEvent, ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/auth/LoadingButton";

/**
 * The Save / Cancel / dirty-state / loading / error chrome every section
 * (and the SEO) form shares — one implementation, so "no duplicated code"
 * holds across nine near-identical forms. The section's own fields are
 * passed as `children`; this component owns nothing about their shape.
 */
export function SectionFormShell({
  isDirty,
  isSubmitting,
  error,
  onSubmit,
  onCancel,
  children,
}: {
  isDirty: boolean;
  isSubmitting: boolean;
  error: string | null;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  children: ReactNode;
}) {
  const t = useTranslations("Admin.homepageEditor");

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {children}

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-4">
        {isDirty && (
          <span className="me-auto text-xs font-medium text-amber-600">{t("unsavedChanges")}</span>
        )}
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={!isDirty || isSubmitting}
        >
          {t("cancel")}
        </Button>
        <LoadingButton type="submit" isLoading={isSubmitting} disabled={!isDirty || isSubmitting}>
          {isSubmitting ? t("saving") : t("save")}
        </LoadingButton>
      </div>
    </form>
  );
}
