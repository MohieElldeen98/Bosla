"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/admin/ErrorState";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/**
 * Next.js route-segment error boundary — defensive coverage for anything
 * that escapes `AuditFeedService.search`'s own try/catch (which degrades
 * to a `{success:false}` result, not a throw, for the normal-failure
 * case — handled inline in `page.tsx`). A genuine crash here means a bug
 * in this page's own code. Mirrors `/admin/courses/error.tsx` exactly.
 */
export default function AdminAuditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Admin.error");

  useEffect(() => {
    logger.error("[admin:audit]", error);
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
