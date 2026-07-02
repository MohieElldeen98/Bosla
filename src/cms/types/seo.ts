import type { LocalizedText } from "@/types/i18n";

/** Mirrors `db/schema/cms.ts`'s `cms_seo_meta`. See docs/cms-overview.md §7. */
export interface SeoMeta {
  id: string;
  title: LocalizedText | null;
  description: LocalizedText | null;
  ogImageId: string | null;
  canonicalPath: string | null;
}

export interface ResolvedSeoMeta {
  id: string;
  title: string | null;
  description: string | null;
  ogImageId: string | null;
  canonicalPath: string | null;
}

export interface NewSeoMetaInput {
  title?: LocalizedText | null;
  description?: LocalizedText | null;
  ogImageId?: string | null;
  canonicalPath?: string | null;
}
