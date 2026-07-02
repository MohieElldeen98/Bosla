import { revalidatePath } from "next/cache";
import { CmsPageRepository } from "@/cms/repositories/page.repository";
import { CmsPageVersionRepository, isUniqueViolation } from "@/cms/repositories/page-version.repository";
import { CmsSectionRepository, type CmsSectionRecord } from "@/cms/repositories/section.repository";
import { CmsSeoRepository } from "@/cms/repositories/seo.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { resolveContentLocale } from "@/cms/utils/resolve-content-locale";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { validateSectionContent } from "@/cms/validators/section-content.schemas";
import { seoMetaSchema } from "@/cms/validators/seo.validator";
import type { Locale } from "@/i18n/routing";
import type { CmsPage, ResolvedCmsPage } from "@/cms/types/page";
import type {
  CmsPagePublishStatus,
  CmsPageVersion,
  CmsPageVersionSnapshot,
} from "@/cms/types/page-version";
import type { CmsActionResult } from "@/cms/types/result";
import type { SeoMeta } from "@/cms/types/seo";

/**
 * Orchestration for publish/revert/version-read (Step 6.5 —
 * docs/cms-overview.md §15). `CmsPageVersionRepository` is pure data
 * access (plus the two cross-table transactions publish/revert each need
 * for atomicity); every validation, authorization, and resolution rule
 * lives here, reusing the exact same building blocks
 * `CmsSectionService`/`CmsSeoService`/`CmsPageService` already use — this
 * step adds no new validation or auth logic of its own.
 */
export const CmsPageVersionService = {
  /** The published counterpart of `CmsPageService.getResolvedBySlug` — same
   *  output shape, but reads the latest `cms_page_versions` snapshot
   *  instead of the live draft tables, so a draft edit never reaches
   *  visitors before Publish. `null` when the page has never been
   *  published. */
  async getPublishedResolvedBySlug(slug: string, locale: Locale): Promise<ResolvedCmsPage | null> {
    const page = await safeRead(() => CmsPageRepository.findBySlug(slug), null);
    if (!page) return null;

    const version = await safeRead(
      () => CmsPageVersionRepository.findLatestByPageId(page.id),
      null,
    );
    if (!version) return null;

    return snapshotToResolvedPage(version.snapshot, locale);
  },

  async getPublishStatus(pageId: string): Promise<CmsPagePublishStatus> {
    const [page, version, sections] = await Promise.all([
      safeRead(() => CmsPageRepository.findById(pageId), null),
      safeRead(() => CmsPageVersionRepository.findLatestByPageId(pageId), null),
      safeRead(() => CmsSectionRepository.findByPageId(pageId), []),
    ]);
    if (!page) {
      return { isPublished: false, publishedVersion: null, publishedAt: null, hasUnpublishedChanges: sections.length > 0 };
    }

    const seo = page.seoMetaId ? await safeRead(() => CmsSeoRepository.findById(page.seoMetaId as string), null) : null;
    return computePublishStatus(page, sections, seo, version);
  },

  /** The one query `computePublishStatus` needs that a caller like
   *  `admin/homepage/page.tsx` doesn't already have lying around (it
   *  already fetches `page`/`sections`/`seo` for the editor itself) — pairs
   *  with `computePublishStatus` below to compute status without
   *  `getPublishStatus`'s redundant re-fetch (Step 6.6, docs/cms-overview.md
   *  §16). */
  async getLatestVersion(pageId: string): Promise<CmsPageVersion | null> {
    return safeRead(() => CmsPageVersionRepository.findLatestByPageId(pageId), null);
  },

  /** Validates every draft section + SEO field against the same schemas
   *  the editor already uses, snapshots the current draft state, and
   *  writes it as the new highest version — atomically, alongside
   *  stamping `cms_pages.published_at` — then revalidates the public
   *  homepage route so the change is live immediately. */
  async publish(
    pageId: string,
    expectedPublishedVersion?: number | null,
  ): Promise<CmsActionResult<CmsPageVersion>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot publish CMS content." };
      }

      const page = await CmsPageRepository.findById(pageId);
      if (!page) {
        return { success: false, code: "not_found", message: "Page not found." };
      }

      const sections = await CmsSectionRepository.findByPageId(pageId);
      for (const section of sections) {
        const result = validateSectionContent(section.sectionType, section.content);
        if (!result.success) {
          return {
            success: false,
            code: "validation_failed",
            message: `Section "${section.sectionType}" is invalid: ${result.error.issues
              .map((issue) => issue.message)
              .join(" ")}`,
          };
        }
      }

      const seo = page.seoMetaId ? await CmsSeoRepository.findById(page.seoMetaId) : null;
      if (seo) {
        const seoResult = seoMetaSchema.safeParse({
          title: seo.title ?? undefined,
          description: seo.description ?? undefined,
          ogImageId: seo.ogImageId ?? undefined,
          canonicalPath: seo.canonicalPath ?? undefined,
        });
        if (!seoResult.success) {
          return {
            success: false,
            code: "validation_failed",
            message: `SEO settings are invalid: ${seoResult.error.issues.map((issue) => issue.message).join(" ")}`,
          };
        }
      }

      const latest = await CmsPageVersionRepository.findLatestByPageId(pageId);

      // Someone else already published since this admin last loaded the
      // editor (docs/cms-overview.md §16 "if another admin publishes while
      // someone is editing") — don't silently publish on top of a baseline
      // they never saw.
      if (expectedPublishedVersion !== undefined && (latest?.version ?? null) !== expectedPublishedVersion) {
        return {
          success: false,
          code: "conflict",
          message: "Someone else published a newer version while you were working. Reload to see it before publishing again.",
        };
      }

      const nextVersion = (latest?.version ?? 0) + 1;

      const snapshot: CmsPageVersionSnapshot = {
        page: { id: page.id, slug: page.slug, title: page.title },
        sections: sections.map((section) => ({
          id: section.id,
          sectionType: section.sectionType,
          isEnabled: section.isEnabled,
          position: section.position,
          content: section.content,
        })),
        seo: seo
          ? {
              id: seo.id,
              title: seo.title,
              description: seo.description,
              ogImageId: seo.ogImageId,
              canonicalPath: seo.canonicalPath,
            }
          : null,
      };

      let created: CmsPageVersion;
      try {
        created = await CmsPageVersionRepository.createAndMarkPublished({
          pageId,
          version: nextVersion,
          snapshot,
          createdBy: user.id,
          publishedBy: user.id,
        });
      } catch (error) {
        // The rare true-simultaneous-publish race that slips past the
        // expectedPublishedVersion check above: the `(page_id, version)`
        // unique index is the actual last line of defense.
        if (isUniqueViolation(error)) {
          return {
            success: false,
            code: "conflict",
            message: "Someone else published at the same moment. Reload and try again.",
          };
        }
        throw error;
      }

      if (page.slug === "home") {
        revalidatePath("/[locale]", "page");
      }

      return { success: true, data: created };
    });
  },

  /** Restores the draft (`cms_sections`/`cms_seo_meta`) to match the latest
   *  published snapshot — discarding unpublished draft edits. Does not
   *  change which version is published; publishing again after a revert
   *  creates a new version with the restored content. */
  async revertToPublished(
    pageId: string,
    expectedPublishedVersion?: number | null,
  ): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }

      const version = await CmsPageVersionRepository.findLatestByPageId(pageId);
      if (!version) {
        return { success: false, code: "not_found", message: "This page has never been published." };
      }

      if (expectedPublishedVersion !== undefined && version.version !== expectedPublishedVersion) {
        return {
          success: false,
          code: "conflict",
          message: "Someone else published a newer version while you were working. Reload to see it before reverting.",
        };
      }

      await CmsPageVersionRepository.restoreDraftFromSnapshot(version.snapshot, version.version, user.id);
      return { success: true, data: undefined };
    });
  },
};

/** Pure — no I/O — so a caller that already has `page`/`sections`/`seo` in
 *  scope (e.g. `admin/homepage/page.tsx`, which fetches all three anyway
 *  for the editor itself) can compute status without `getPublishStatus`
 *  re-fetching data it already has (Step 6.6, avoid duplicate queries —
 *  docs/cms-overview.md §16). "Has unpublished changes" is an
 *  `updatedAt`-vs-`publishedAt` comparison across sections *and* SEO, not a
 *  content diff. */
export function computePublishStatus(
  page: CmsPage,
  sections: CmsSectionRecord[],
  seo: SeoMeta | null,
  version: CmsPageVersion | null,
): CmsPagePublishStatus {
  if (!version) {
    return {
      isPublished: false,
      publishedVersion: null,
      publishedAt: null,
      hasUnpublishedChanges: sections.length > 0 || seo !== null,
    };
  }

  const publishedAtMs = new Date(version.publishedAt).getTime();
  const hasUnpublishedChanges =
    sections.some((section) => new Date(section.updatedAt).getTime() > publishedAtMs) ||
    (seo !== null && new Date(seo.updatedAt).getTime() > publishedAtMs);

  return {
    isPublished: true,
    publishedVersion: version.version,
    publishedAt: version.publishedAt,
    hasUnpublishedChanges,
  };
}

function snapshotToResolvedPage(snapshot: CmsPageVersionSnapshot, locale: Locale): ResolvedCmsPage {
  return {
    id: snapshot.page.id,
    slug: snapshot.page.slug,
    title: snapshot.page.title,
    seo: snapshot.seo
      ? {
          id: snapshot.seo.id,
          title: resolveLocalizedText(snapshot.seo.title, locale),
          description: resolveLocalizedText(snapshot.seo.description, locale),
          ogImageId: snapshot.seo.ogImageId,
          canonicalPath: snapshot.seo.canonicalPath,
        }
      : null,
    sections: snapshot.sections
      .filter((section) => section.isEnabled)
      .sort((a, b) => a.position - b.position)
      .map((section) => ({
        id: section.id,
        sectionType: section.sectionType,
        isEnabled: section.isEnabled,
        position: section.position,
        content: resolveContentLocale(section.content, locale, ["en", "ar"]) as ResolvedCmsPage["sections"][number]["content"],
      })),
  };
}
