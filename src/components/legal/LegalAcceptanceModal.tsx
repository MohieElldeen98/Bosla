"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  acceptLegalDocumentsAction,
  getLegalAcceptanceStatusAction,
} from "@/cms/actions/legal-acceptance.actions";
import type { LegalAcceptanceStatus } from "@/cms/types/legal-acceptance";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const EMPTY_STATUS: LegalAcceptanceStatus = { needsAcceptance: false, pending: [] };

/**
 * Resolves once the DOM has gone quiet for `quietMs`, or after `maxWaitMs`
 * regardless — a direct, page-size-independent signal that hydration has
 * actually finished, instead of guessing a fixed delay.
 *
 * This is the ONE dialog in the app that can open on its own, without a
 * user click first — every other Sheet/Dialog here only opens in response
 * to a click, which by definition happens well after the page has finished
 * hydrating. Base UI's modal Dialog applies `aria-hidden`/`inert` to
 * background content the instant it opens (correct a11y behavior), via a
 * direct DOM mutation — if that lands on a subtree that hasn't hydrated
 * yet, React flags a mismatch once it later hydrates that subtree and
 * finds attributes it didn't expect. The page shell (this modal included)
 * hydrates as its own, early commit; the routed page content streams in
 * and hydrates *separately* (Next.js RSC streaming), and how long that
 * takes depends on server data fetching, not on anything the browser
 * exposes directly — so `requestAnimationFrame` (one paint) and
 * `requestIdleCallback` (can fire in an idle gap between streamed chunks,
 * not only after the last one) were both tried and both still raced.
 * Streamed-chunk hydration produces DOM mutations, so watching for
 * mutations to stop is a direct measurement rather than a guess: it
 * settles almost instantly on a light page and waits exactly as long as
 * a heavy one actually needs.
 */
function waitForDomSettle(signal: AbortSignal, quietMs = 200, maxWaitMs = 4000): Promise<void> {
  return new Promise((resolve) => {
    let quietTimer: ReturnType<typeof setTimeout>;
    const maxTimer = setTimeout(finish, maxWaitMs);
    const observer = new MutationObserver(() => {
      clearTimeout(quietTimer);
      quietTimer = setTimeout(finish, quietMs);
    });
    function finish() {
      observer.disconnect();
      clearTimeout(quietTimer);
      clearTimeout(maxTimer);
      signal.removeEventListener("abort", finish);
      resolve();
    }
    signal.addEventListener("abort", finish, { once: true });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true });
    quietTimer = setTimeout(finish, quietMs);
  });
}

export function LegalAcceptanceModal() {
  const t = useTranslations("Legal.acceptance");
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState(EMPTY_STATUS);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getLegalAcceptanceStatusAction().then(async (nextStatus) => {
      if (controller.signal.aborted) return;
      setStatus(nextStatus);
      if (nextStatus.needsAcceptance) {
        await waitForDomSettle(controller.signal);
        if (!controller.signal.aborted) setOpen(true);
      }
    });
    return () => controller.abort();
  }, []);

  if (!open) return null;

  async function accept() {
    setIsSubmitting(true);
    setError(null);
    const result = await acceptLegalDocumentsAction();
    if (result.success) {
      setOpen(false);
      router.refresh();
    } else {
      setError(result.message);
    }
    setIsSubmitting(false);
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => nextOpen && setOpen(true)}>
      <SheetContent side="bottom" showCloseButton={false} className="mx-auto max-h-[90vh] w-full max-w-2xl rounded-t-2xl border-x p-0">
        <SheetHeader className="gap-2 border-b px-6 py-5 text-start">
          <SheetTitle className="text-xl">{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <div className="max-h-[55vh] space-y-3 overflow-y-auto px-6 py-5">
          {status.pending.map((document) => (
            <div key={document.slug} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium">{locale === "ar" ? document.title.ar : document.title.en}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{t("version", { version: document.version })}</p>
                </div>
                <Link
                  href={`/${document.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-primary underline underline-offset-4"
                >
                  {t("readDocument")}
                </Link>
              </div>
            </div>
          ))}
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
        </div>
        <SheetFooter className="border-t px-6 py-5">
          <Button type="button" size="lg" className="w-full" onClick={accept} disabled={isSubmitting}>
            {isSubmitting ? t("accepting") : t("accept")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
