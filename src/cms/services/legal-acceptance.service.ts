import "server-only";

import { LegalAcceptanceRepository } from "@/cms/repositories/legal-acceptance.repository";
import { LegalDocumentRepository } from "@/cms/repositories/legal-document.repository";
import { LegalDocumentVersionRepository } from "@/cms/repositories/legal-document-version.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { ProfileService } from "@/auth/services/profile.service";
import { logger } from "@/lib/logger";
import {
  LEGAL_ACCEPTANCE_SLUGS,
  type LegalAcceptanceActionResult,
  type LegalAcceptanceStatus,
  type LegalDocumentVersionAcceptanceStats,
  type LegalDocumentVersionAcceptor,
  type LegalDocumentVersionAcceptorFilters,
  type LegalDocumentVersionAcceptorResult,
} from "@/cms/types/legal-acceptance";
import type { CmsActionResult } from "@/cms/types/result";
import type { LegalDocument } from "@/cms/types/legal-document";
import type { LegalDocumentVersion } from "@/cms/types/legal-document-version";

/** Resolves a published document's CURRENT immutable snapshot — the one
 *  and only thing an acceptance is ever allowed to reference. `null`
 *  means the document is published but has no matching snapshot, which
 *  should never happen (every `publish` call creates one in the same
 *  transaction) but is handled defensively rather than assumed. */
async function resolveCurrentVersion(document: LegalDocument): Promise<LegalDocumentVersion | null> {
  return safeRead(
    () => LegalDocumentVersionRepository.findByDocumentIdAndVersion(document.id, document.version),
    null,
  );
}

export const LegalAcceptanceService = {
  /** A document is pending acceptance if the user has no acceptance row
   *  for its slug, OR that row's `acceptedDocumentVersionId` does not
   *  match the document's CURRENT published snapshot's id — an id
   *  comparison, not a version-number comparison, so it stays correct
   *  through every scenario: editing a draft never changes
   *  `legalDocuments.version` (invisible here by construction); a
   *  restore only repopulates the draft, it doesn't publish or snapshot
   *  anything; and a republish — even of content identical to a past
   *  version — always mints a brand-new snapshot with a brand-new id,
   *  so a user who accepted the old one is correctly asked again. A
   *  `null`/legacy (not-yet-backfilled) `acceptedDocumentVersionId` is
   *  treated exactly like "never accepted" — there is no way to prove
   *  what that row actually saw, so it can't satisfy the check. */
  async getAcceptanceStatus(userId: string): Promise<LegalAcceptanceStatus> {
    const [documents, acceptances] = await Promise.all([
      Promise.all(LEGAL_ACCEPTANCE_SLUGS.map((slug) => safeRead(() => LegalDocumentRepository.findBySlug(slug), null))),
      safeRead(() => LegalAcceptanceRepository.findByUserAndSlugs(userId, LEGAL_ACCEPTANCE_SLUGS), []),
    ]);
    const acceptanceBySlug = new Map(acceptances.map((acceptance) => [acceptance.slug, acceptance]));

    const publishedDocuments = documents.filter(
      (document): document is LegalDocument => Boolean(document?.published && document.publishedAt),
    );
    const currentVersions = await Promise.all(publishedDocuments.map((document) => resolveCurrentVersion(document)));
    const versionByDocumentId = new Map(
      publishedDocuments.map((document, index) => [document.id, currentVersions[index]]),
    );

    const pending = publishedDocuments.flatMap((document) => {
      const currentVersion = versionByDocumentId.get(document.id);
      if (!currentVersion) {
        // No snapshot exists for the published state — nothing valid to
        // compare against, so don't ask the user to accept a document
        // the platform itself hasn't recorded an immutable version of.
        logger.warn("[cms:legal-acceptance] published document has no matching version snapshot", {
          documentId: document.id,
          slug: document.slug,
          version: document.version,
        });
        return [];
      }
      const acceptance = acceptanceBySlug.get(document.slug);
      if (acceptance?.acceptedDocumentVersionId === currentVersion.id) return [];
      return [
        {
          slug: document.slug as (typeof LEGAL_ACCEPTANCE_SLUGS)[number],
          title: { en: document.titleEn, ar: document.titleAr },
          version: document.version,
        },
      ];
    });
    return { needsAcceptance: pending.length > 0, pending };
  },

  /** Accepts the CURRENT published version of every gated document —
   *  always resolved via its immutable snapshot, never the mutable
   *  draft row. If a published document has no matching snapshot (see
   *  `resolveCurrentVersion`'s doc comment), it's skipped rather than
   *  recording a reference to nothing. */
  async acceptCurrentVersions(userId: string): Promise<LegalAcceptanceActionResult> {
    return safeMutation(async () => {
      const documents = (
        await Promise.all(LEGAL_ACCEPTANCE_SLUGS.map((slug) => LegalDocumentRepository.findBySlug(slug)))
      ).filter((document): document is LegalDocument => Boolean(document?.published && document.publishedAt));

      const versions = await Promise.all(documents.map((document) => resolveCurrentVersion(document)));

      await Promise.all(
        documents.flatMap((document, index) => {
          const version = versions[index];
          if (!version) {
            logger.warn("[cms:legal-acceptance] skipped accepting a document with no version snapshot", {
              documentId: document.id,
              slug: document.slug,
            });
            return [];
          }
          return [LegalAcceptanceRepository.upsert(userId, document.slug, document.version, version.id)];
        }),
      );
      return { success: true, data: undefined };
    });
  },

  /** The version history page's "Accepted by" block — admin-gated,
   *  reuses the same total-user-count source `/admin`'s dashboard stat
   *  card already computes (`ProfileService.searchPaginated({pageSize:
   *  1}).total`), so the percentage is never a second, divergent count
   *  of "how many users exist." */
  async getVersionStats(versionId: string): Promise<CmsActionResult<LegalDocumentVersionAcceptanceStats>> {
    const user = await requireCmsAccess();
    if (!user) {
      return { success: false, code: "forbidden", message: "You cannot view legal content." };
    }
    const [counts, users] = await Promise.all([
      safeRead(() => LegalAcceptanceRepository.countByVersionId(versionId), {
        count: 0,
        firstAcceptedAt: null,
        lastAcceptedAt: null,
      }),
      safeRead(() => ProfileService.searchPaginated({ pageSize: 1 }), { items: [], total: 0, page: 1, pageSize: 1, totalPages: 1 }),
    ]);
    const totalUsers = users.total;
    return {
      success: true,
      data: {
        versionId,
        acceptedCount: counts.count,
        totalUsers,
        acceptancePercentage: totalUsers > 0 ? Math.round((counts.count / totalUsers) * 1000) / 10 : 0,
        firstAcceptedAt: counts.firstAcceptedAt,
        lastAcceptedAt: counts.lastAcceptedAt,
      },
    };
  },

  /** "Users who accepted this version" — admin-gated, paginated,
   *  searchable by name/email. Resolves display identity via
   *  `ProfileService.getByUserIds` for exactly the page's rows, the
   *  same "compose display data at the service layer" convention
   *  `page.tsx`'s `publisherNames` resolution already uses. */
  async searchVersionAcceptors(
    versionId: string,
    filters: LegalDocumentVersionAcceptorFilters,
  ): Promise<CmsActionResult<LegalDocumentVersionAcceptorResult>> {
    const user = await requireCmsAccess();
    if (!user) {
      return { success: false, code: "forbidden", message: "You cannot view legal content." };
    }
    const result = await safeRead(() => LegalAcceptanceRepository.searchByVersionId(versionId, filters), {
      items: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
      totalPages: 1,
    });
    const profiles = await ProfileService.getByUserIds(result.items.map((item) => item.userId));
    const profileByUserId = new Map(profiles.map((profile) => [profile.userId, profile]));

    const items: LegalDocumentVersionAcceptor[] = result.items.map((item) => {
      const profile = profileByUserId.get(item.userId);
      return {
        userId: item.userId,
        name: profile?.displayName ?? profile?.fullName ?? profile?.email ?? item.userId,
        email: profile?.email ?? "",
        acceptedAt: item.acceptedAt,
      };
    });

    return { success: true, data: { ...result, items } };
  },
};
