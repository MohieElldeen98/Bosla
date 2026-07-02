import type { LocalizedText } from "@/types/i18n";
import type { CmsSectionType } from "@/cms/types/section";

/** One section as captured in a published snapshot — the same raw,
 *  bilingual shape `cms_sections` rows store (`content` validated but not
 *  locale-resolved), so the exact same locale resolver
 *  (`resolve-content-locale.ts`) that reads live `cms_sections` rows can
 *  read this too. */
export interface CmsPageVersionSectionSnapshot {
  id: string;
  sectionType: CmsSectionType;
  isEnabled: boolean;
  position: number;
  content: unknown;
}

export interface CmsPageVersionSeoSnapshot {
  id: string;
  title: LocalizedText | null;
  description: LocalizedText | null;
  ogImageId: string | null;
  canonicalPath: string | null;
}

/** Everything needed to render the page — captured wholesale by
 *  `CmsPageVersionService.publish` from the draft tables at publish time. */
export interface CmsPageVersionSnapshot {
  page: { id: string; slug: string; title: string };
  sections: CmsPageVersionSectionSnapshot[];
  seo: CmsPageVersionSeoSnapshot | null;
}

/** Mirrors `db/schema/cms.ts`'s `cms_page_versions`. Immutable once
 *  created — nothing ever updates a version row, only inserts a new one. */
export interface CmsPageVersion {
  id: string;
  pageId: string;
  version: number;
  snapshot: CmsPageVersionSnapshot;
  createdAt: string;
  createdBy: string | null;
  publishedAt: string;
  publishedBy: string | null;
}

export interface NewCmsPageVersionInput {
  pageId: string;
  version: number;
  snapshot: CmsPageVersionSnapshot;
  createdBy: string | null;
  publishedBy: string | null;
}

/** What the Homepage editor shows for draft-vs-published status — derived,
 *  not stored: whether the page has ever been published, when, and
 *  whether the draft tables have changed more recently than that (a cheap
 *  timestamp comparison, not a content diff). */
export interface CmsPagePublishStatus {
  isPublished: boolean;
  publishedVersion: number | null;
  publishedAt: string | null;
  hasUnpublishedChanges: boolean;
}
