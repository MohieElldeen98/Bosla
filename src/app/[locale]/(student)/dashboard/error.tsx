"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/admin/ErrorState";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

/** Next.js route-segment error boundary — defensive coverage for
 *  anything that escapes `StudentDashboardService`'s own `safeRead`
 *  resilience (which degrades to an empty list, not a throw, for the
 *  normal DB-failure case). */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Dashboard.loading");

  useEffect(() => {
    logger.error("[dashboard]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 lg:px-8">
      <ErrorState
        title={t("errorTitle")}
        description={t("errorDescription")}
        action={
          <Button type="button" onClick={reset}>
            {t("retry")}
          </Button>
        }
      />
    </div>
  );
}
