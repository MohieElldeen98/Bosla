"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbTrailContextValue {
  trail: BreadcrumbSegment[];
  setTrail: (segments: BreadcrumbSegment[]) => void;
}

const BreadcrumbTrailContext = createContext<BreadcrumbTrailContextValue | null>(null);

/**
 * Lets a page nested arbitrarily deep under a shell (Admin, Instructor)
 * extend that shell's breadcrumb past its own top-level section — e.g.
 * "Dashboard / My Courses / ICU Masterclass / Curriculum" instead of the
 * shell only ever being able to render "Dashboard / My Courses" (all it
 * knows on its own). One provider per shell, mounted once around the
 * whole `<main>` — a page registers its extra segments via
 * `<BreadcrumbTrail segments={...} />` (see below), the shell's own
 * breadcrumb component reads them back via `useBreadcrumbTrail()`.
 */
export function BreadcrumbTrailProvider({ children }: { children: ReactNode }) {
  const [trail, setTrail] = useState<BreadcrumbSegment[]>([]);
  return (
    <BreadcrumbTrailContext.Provider value={{ trail, setTrail }}>{children}</BreadcrumbTrailContext.Provider>
  );
}

export function useBreadcrumbTrail(): BreadcrumbSegment[] {
  const ctx = useContext(BreadcrumbTrailContext);
  return ctx?.trail ?? [];
}

/**
 * A page (usually a Server Component) renders this to register its own
 * trailing breadcrumb segments — e.g. a course edit page renders
 * `<BreadcrumbTrail segments={[{ label: course.title, href: ... }, { label: "Curriculum" }]} />`.
 * Registers on mount, clears on unmount/when `segments` changes
 * (deep-compared via `JSON.stringify` — trails are short, plain-object
 * arrays, so this is cheap and avoids every caller needing its own
 * `useMemo`), so navigating away never leaves a stale trail showing.
 */
export function BreadcrumbTrail({ segments }: { segments: BreadcrumbSegment[] }) {
  const ctx = useContext(BreadcrumbTrailContext);
  const key = JSON.stringify(segments);

  useEffect(() => {
    ctx?.setTrail(segments);
    return () => ctx?.setTrail([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}
