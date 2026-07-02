import type { LocalizedText } from "@/types/i18n";
import type { CmsIconKey } from "@/cms/types/content-blocks";

/** Mirrors `db/schema/cms.ts`'s `cms_navigation_location` enum exactly.
 *  See docs/cms-overview.md §8 — the language switcher and Sign In/Get
 *  Started buttons are deliberately not represented here. */
export const NAVIGATION_LOCATIONS = [
  "header",
  "footer_product",
  "footer_company",
  "footer_resources",
] as const;

export type NavigationLocation = (typeof NAVIGATION_LOCATIONS)[number];

export interface CmsNavigationItem {
  id: string;
  location: NavigationLocation;
  label: LocalizedText;
  href: string;
  icon: CmsIconKey | null;
  position: number;
  isEnabled: boolean;
}

export interface ResolvedCmsNavigationItem {
  id: string;
  location: NavigationLocation;
  label: string;
  href: string;
  icon: CmsIconKey | null;
  position: number;
}

export interface NewCmsNavigationItemInput {
  location: NavigationLocation;
  label: LocalizedText;
  href: string;
  icon?: CmsIconKey | null;
  position?: number;
  isEnabled?: boolean;
}
