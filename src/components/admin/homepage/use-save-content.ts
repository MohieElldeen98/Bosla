"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import type { CmsActionResult } from "@/cms/types/result";

/**
 * Shared save-submit logic for every section form and the SEO form (Step
 * 6.6 — docs/cms-overview.md §16). Before this hook existed, each of the 8
 * near-identical forms only handled `result.success === false` as one
 * generic case; this distinguishes three outcomes that need different
 * handling:
 *  - a genuine validation failure — unchanged behavior, the raw server
 *    message shown inline via the caller's own `error` slot;
 *  - a concurrency conflict (`code: "conflict"`) — someone else saved this
 *    since it was loaded; shown as a distinct message, and the local edit
 *    is deliberately NOT discarded or auto-merged ("do not silently
 *    replace data");
 *  - a network failure — the action call itself rejecting rather than
 *    resolving with `success:false` (e.g. the request never reached the
 *    server). Previously uncaught, which could leave a form's loading
 *    state stuck and show no feedback at all.
 *
 * Also tracks the fresh `updatedAt` baseline after every successful save,
 * so a second save in the same session checks concurrency against the
 * current row, not what was loaded when the form first mounted.
 */
export function useSaveContent<TValues, TData>(
  initialUpdatedAt: string,
  save: (values: TValues, expectedUpdatedAt: string) => Promise<CmsActionResult<TData>>,
  extractUpdatedAt: (data: TData) => string,
) {
  const t = useTranslations("Admin.homepageEditor");
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState(initialUpdatedAt);

  async function submit(values: TValues): Promise<TData | null> {
    setError(null);
    try {
      const result = await save(values, updatedAt);
      if (!result.success) {
        if (result.code === "conflict") {
          setError(t("conflictError"));
          toast.error(t("conflictError"));
        } else {
          setError(result.message);
          toast.error(t("saveError"));
        }
        return null;
      }
      toast.success(t("saveSuccess"));
      setUpdatedAt(extractUpdatedAt(result.data));
      return result.data;
    } catch {
      setError(t("networkError"));
      toast.error(t("networkError"));
      return null;
    }
  }

  return { submit, error, setError, updatedAt };
}
