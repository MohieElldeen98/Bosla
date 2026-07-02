import type { ResolvedCmsSection } from "@/cms/types/section";
import type { ResolvedSeoMeta } from "@/cms/types/seo";

/** Mirrors `db/schema/cms.ts`'s `cms_pages`. `slug: "home"` is the
 *  homepage; any other slug is a landing page (docs/cms-overview.md §11) —
 *  both are the same table/shape, no separate schema per page type. */
export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  seoMetaId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewCmsPageInput {
  slug: string;
  title: string;
  seoMetaId?: string | null;
}

/** A page with its enabled sections resolved and ordered — what a future
 *  page-rendering pipeline would fetch in one call. */
export interface ResolvedCmsPage {
  id: string;
  slug: string;
  title: string;
  seo: ResolvedSeoMeta | null;
  sections: ResolvedCmsSection[];
}
