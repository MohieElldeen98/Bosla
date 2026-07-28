"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";
import { recoverFromChunkLoadError } from "@/lib/chunk-load-recovery";

/**
 * React error boundaries (`global-error.tsx` included) only catch errors
 * thrown during rendering — never errors from event handlers, timers, or
 * rejected promises (React's own, well-documented limitation). This
 * mounts once, site-wide, to catch that other class of uncaught error —
 * same reporting sink as `global-error.tsx`, just fed from
 * `window.onerror`/`unhandledrejection` instead of a render-time throw.
 */
export function ClientErrorListener() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      const error = event.error ?? event.message;
      reportClientError(error);
      recoverFromChunkLoadError(error);
    }
    function onRejection(event: PromiseRejectionEvent) {
      reportClientError(event.reason);
      recoverFromChunkLoadError(event.reason);
    }
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
