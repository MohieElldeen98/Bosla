"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { recoverFromChunkLoadError } from "@/lib/chunk-load-recovery";
import { reportClientError } from "@/lib/report-client-error";
import { cn } from "@/lib/utils";

/**
 * Route-level boundary for everything under `[locale]`. Before this, any
 * thrown render error escalated straight to `global-error.tsx`, which
 * replaces the whole document with an unstyled fallback. This keeps the
 * locale layout (fonts, direction, providers) and offers an in-place retry.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("RouteError");

  useEffect(() => {
    reportClientError(error);
    recoverFromChunkLoadError(error);
  }, [error]);

  return (
    <main id="main-content" className="flex flex-1 flex-col">
      <section
        role="alert"
        className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center"
      >
        <h1 className="text-3xl font-bold text-balance sm:text-4xl">{t("title")}</h1>
        <p className="mt-4 text-base text-pretty text-muted-foreground">{t("description")}</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" className="px-4" onClick={() => reset()}>
            {t("retry")}
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}>
            {t("home")}
          </Link>
        </div>
      </section>
    </main>
  );
}
