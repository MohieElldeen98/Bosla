import "server-only";

import { LegalDocumentRepository } from "@/cms/repositories/legal-document.repository";
import { LegalDocumentVersionRepository } from "@/cms/repositories/legal-document-version.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import { diffLegalContent } from "@/cms/utils/legal-diff";
import { sanitizeLegalHtml } from "@/cms/utils/sanitize-legal-html";
import type { CmsActionResult } from "@/cms/types/result";
import type { LegalDocument } from "@/cms/types/legal-document";
import type {
  LegalDocumentVersion,
  LegalDocumentVersionComparison,
  LegalDocumentVersionListItem,
} from "@/cms/types/legal-document-version";
import type { Locale } from "@/i18n/routing";

export const LegalDocumentVersionService = {
  async listVersions(documentId: string): Promise<CmsActionResult<LegalDocumentVersionListItem[]>> {
    const user = await requireCmsAccess();
    if (!user) return { success: false, code: "forbidden", message: "You cannot manage legal content." };
    const versions = await safeRead(() => LegalDocumentVersionRepository.findByDocumentId(documentId), []);
    return { success: true, data: versions };
  },

  async getVersion(documentId: string, versionId: string): Promise<CmsActionResult<LegalDocumentVersion>> {
    const user = await requireCmsAccess();
    if (!user) return { success: false, code: "forbidden", message: "You cannot manage legal content." };
    const version = await safeRead(() => LegalDocumentVersionRepository.findById(documentId, versionId), null);
    if (!version) return { success: false, code: "not_found", message: "Version not found." };
    return { success: true, data: version };
  },

  async compareVersions(
    documentId: string,
    fromVersionId: string,
    toVersionId: string,
    locale: Locale,
  ): Promise<CmsActionResult<LegalDocumentVersionComparison>> {
    const user = await requireCmsAccess();
    if (!user) return { success: false, code: "forbidden", message: "You cannot manage legal content." };
    const comparison = await safeRead(async () => {
      const [fromVersion, toVersion] = await Promise.all([
        LegalDocumentVersionRepository.findById(documentId, fromVersionId),
        LegalDocumentVersionRepository.findById(documentId, toVersionId),
      ]);
      if (!fromVersion || !toVersion) return null;
      const fromContent = locale === "ar" ? fromVersion.contentAr : fromVersion.contentEn;
      const toContent = locale === "ar" ? toVersion.contentAr : toVersion.contentEn;
      return {
        fromVersionId,
        toVersionId,
        locale,
        segments: diffLegalContent(fromContent, toContent),
      } satisfies LegalDocumentVersionComparison;
    }, null);
    if (!comparison) return { success: false, code: "not_found", message: "One or both versions were not found." };
    return { success: true, data: comparison };
  },

  async restoreAsDraft(documentId: string, versionId: string): Promise<CmsActionResult<LegalDocument>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) return { success: false, code: "forbidden", message: "You cannot manage legal content." };
      const version = await LegalDocumentVersionRepository.findById(documentId, versionId);
      if (!version) return { success: false, code: "not_found", message: "Version not found." };
      const restored = await LegalDocumentRepository.saveDraft(
        documentId,
        {
          titleEn: version.titleEn,
          titleAr: version.titleAr,
          contentEn: sanitizeLegalHtml(version.contentEn),
          contentAr: sanitizeLegalHtml(version.contentAr),
        },
        user.id,
      );
      if (!restored) return { success: false, code: "not_found", message: "Document not found." };
      return { success: true, data: restored };
    });
  },
};
