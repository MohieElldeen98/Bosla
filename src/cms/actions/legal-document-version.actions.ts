"use server";

import { LegalDocumentVersionService } from "@/cms/services/legal-document-version.service";
import type { Locale } from "@/i18n/routing";
import type { CmsActionResult } from "@/cms/types/result";
import type { LegalDocument } from "@/cms/types/legal-document";
import type {
  LegalDocumentVersion,
  LegalDocumentVersionComparison,
  LegalDocumentVersionListItem,
} from "@/cms/types/legal-document-version";

export async function listLegalDocumentVersionsAction(
  documentId: string,
): Promise<CmsActionResult<LegalDocumentVersionListItem[]>> {
  return LegalDocumentVersionService.listVersions(documentId);
}

export async function getLegalDocumentVersionAction(
  documentId: string,
  versionId: string,
): Promise<CmsActionResult<LegalDocumentVersion>> {
  return LegalDocumentVersionService.getVersion(documentId, versionId);
}

export async function compareLegalDocumentVersionsAction(
  documentId: string,
  fromVersionId: string,
  toVersionId: string,
  locale: Locale,
): Promise<CmsActionResult<LegalDocumentVersionComparison>> {
  return LegalDocumentVersionService.compareVersions(documentId, fromVersionId, toVersionId, locale);
}

export async function restoreLegalDocumentVersionAction(
  documentId: string,
  versionId: string,
): Promise<CmsActionResult<LegalDocument>> {
  return LegalDocumentVersionService.restoreAsDraft(documentId, versionId);
}
