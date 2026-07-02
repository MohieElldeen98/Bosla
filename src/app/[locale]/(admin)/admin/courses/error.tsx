"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/admin/ErrorState";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Next.js route-segment error boundary — defensive coverage for anything
 * that escapes `CourseService`'s own `safeRead`/`safeMutation` resilience
 * (which degrades to an empty result, not a throw, for the normal DB-
 * failure case). A genuine crash here means a bug in this page's own code,
 * not routine data unavailability.
 */
export default function AdminCoursesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Admin.error");

  useEffect(() => {
    logger.error("[admin:courses]", error);
  }, [error]);

  return (
    <ErrorState
      title={t("title")}
      description={t("description")}
      action={
        <Button type="button" onClick={reset}>
          {t("retry")}
        </Button>
      }
    />
  );
}
