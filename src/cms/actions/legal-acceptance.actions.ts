"use server";

import { SessionService } from "@/auth/services/session.service";
import { LegalAcceptanceService } from "@/cms/services/legal-acceptance.service";
import type {
  LegalAcceptanceActionResult,
  LegalAcceptanceStatus,
  LegalDocumentVersionAcceptanceStats,
  LegalDocumentVersionAcceptorFilters,
  LegalDocumentVersionAcceptorResult,
} from "@/cms/types/legal-acceptance";
import type { CmsActionResult } from "@/cms/types/result";

export async function getLegalAcceptanceStatusAction(): Promise<LegalAcceptanceStatus> {
  const user = await SessionService.getCurrentUser();
  return user
    ? LegalAcceptanceService.getAcceptanceStatus(user.id)
    : { needsAcceptance: false, pending: [] };
}

export async function acceptLegalDocumentsAction(): Promise<LegalAcceptanceActionResult> {
  const user = await SessionService.getCurrentUser();
  if (!user) {
    return { success: false, code: "forbidden", message: "You must be signed in to accept legal documents." };
  }
  return LegalAcceptanceService.acceptCurrentVersions(user.id);
}

/** `/admin/content/[id]`'s version history — the "Accepted by" summary
 *  shown per version. */
export async function getLegalDocumentVersionStatsAction(
  versionId: string,
): Promise<CmsActionResult<LegalDocumentVersionAcceptanceStats>> {
  return LegalAcceptanceService.getVersionStats(versionId);
}

/** "Users who accepted this version" — paginated, searchable. */
export async function searchLegalDocumentVersionAcceptorsAction(
  versionId: string,
  filters: LegalDocumentVersionAcceptorFilters,
): Promise<CmsActionResult<LegalDocumentVersionAcceptorResult>> {
  return LegalAcceptanceService.searchVersionAcceptors(versionId, filters);
}
