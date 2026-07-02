"use client";

import { useEffect } from "react";

/**
 * Warns before losing unsaved form edits — covers leaving the page,
 * changing routes, refreshing, and closing the tab (Step 6.5). `refresh`/
 * `close tab` fire `beforeunload`; there's no stable Next.js App Router API
 * to block a client-side `<Link>` navigation, so "changing routes" is
 * covered by a document-level capturing click listener instead: it runs
 * before Next's own `<Link>` click handler (which checks
 * `event.defaultPrevented` before calling `router.push`), so cancelling the
 * confirm here reliably blocks the navigation either way — plain `<a>` or
 * next-intl's `<Link>`.
 */
export function useUnsavedChangesGuard(hasUnsavedChanges: boolean, confirmMessage: string) {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || !anchor.href || anchor.target === "_blank") return;

      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.origin !== window.location.origin) return;
      if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
        return;
      }

      if (!window.confirm(confirmMessage)) {
        event.preventDefault();
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleClick, true);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleClick, true);
    };
  }, [hasUnsavedChanges, confirmMessage]);
}
