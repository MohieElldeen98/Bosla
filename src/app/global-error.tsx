"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-client-error";

/**
 * The last-resort boundary — Next.js only mounts this when an error
 * escapes the normal `[locale]/layout.tsx` tree entirely, which means it
 * replaces the ENTIRE document (Next's own convention: this file owns
 * `<html>`/`<body>` directly). It deliberately can't use `next-intl`,
 * Tailwind's compiled classes, or any other app provider — all of those
 * live inside the tree this boundary is catching a failure *from*, so
 * depending on them here risks the fallback itself failing to render.
 * Inline styles + a manual locale guess from the URL only.
 *
 * Before this file existed, an uncaught client error showed Next's own
 * unstyled default text with no logging anywhere — this is what surfaced
 * the production iPhone/Safari crash only via a user screenshot.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportClientError(error);
  }, [error]);

  const isArabic = typeof window !== "undefined" && window.location.pathname.startsWith("/ar");

  const copy = isArabic
    ? {
        title: "حدث خطأ غير متوقع",
        description: "واجه الموقع مشكلة فنية. جرّب إعادة تحميل الصفحة.",
        retry: "إعادة المحاولة",
      }
    : {
        title: "Something went wrong",
        description: "The site hit a technical problem. Try reloading the page.",
        retry: "Try again",
      };

  return (
    <html lang={isArabic ? "ar" : "en"} dir={isArabic ? "rtl" : "ltr"}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#f8fafc",
          color: "#0f172a",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: "26rem", padding: "0 1.5rem" }}>
          <div
            style={{
              width: 48,
              height: 48,
              margin: "0 auto 1.25rem",
              borderRadius: 12,
              background: "#4353c9",
            }}
            aria-hidden="true"
          />
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            {copy.title}
          </h1>
          <p style={{ fontSize: "0.95rem", color: "#475569", margin: "0 0 1.5rem" }}>
            {copy.description}
          </p>
          <button
            type="button"
            onClick={() => {
              reset();
              window.location.reload();
            }}
            style={{
              background: "#4353c9",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "0.625rem 1.5rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            {copy.retry}
          </button>
        </div>
      </body>
    </html>
  );
}
