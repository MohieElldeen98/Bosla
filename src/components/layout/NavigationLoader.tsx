"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { BoslaPageLoader } from "@/components/brand/BoslaPageLoader";

/**
 * Click-to-render feedback the App Router doesn't give on its own:
 * `loading.tsx` only appears once the target segment suspends, so on a
 * slow fetch the user stares at the *old* page wondering whether the
 * click registered (and clicks again). This watches same-origin link
 * clicks document-wide, shows the brand overlay immediately, and hides it
 * when the URL actually changes. Guards: modified clicks, new-tab/
 * download links, hash-only jumps, and navigations to the current URL are
 * ignored; a 10s failsafe clears a navigation that never lands.
 */
export function NavigationLoader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [navigating, setNavigating] = useState(false);

  // Arrival: any URL change ends the loading state.
  useEffect(() => {
    setNavigating(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setNavigating(true);
    }
    function onPopState() {
      setNavigating(false);
    }
    // Capture phase — Next's <Link> preventDefaults during bubble to do
    // client navigation, so a bubble-phase listener (or a defaultPrevented
    // check) never sees internal link clicks at all. Capturing runs first.
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  // Failsafe: a navigation that errors or gets interrupted must not trap
  // the user behind the overlay.
  useEffect(() => {
    if (!navigating) return;
    const timeout = window.setTimeout(() => setNavigating(false), 10000);
    return () => window.clearTimeout(timeout);
  }, [navigating]);

  if (!navigating) return null;
  return <BoslaPageLoader />;
}
