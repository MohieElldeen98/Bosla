"use server";

import { LegalDocumentService } from "@/cms/services/legal-document.service";
import type { CmsActionResult } from "@/cms/types/result";
import type { LegalDocument } from "@/cms/types/legal-document";

export async function saveLegalDocumentDraftAction(id: string, rawInput: unknown): Promise<CmsActionResult<LegalDocument>> {
  return LegalDocumentService.saveDraft(id, rawInput);
}

export async function publishLegalDocumentAction(id: string, rawInput: unknown): Promise<CmsActionResult<LegalDocument>> {
  return LegalDocumentService.publish(id, rawInput);
}
