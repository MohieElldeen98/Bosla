"use server";

import { CmsSectionService } from "@/cms/services/section.service";
import {
  createSectionSchema,
  reorderSectionsSchema,
  updateSectionSchema,
} from "@/cms/validators/section.validator";
import type { CmsActionResult } from "@/cms/types/result";
import type { CmsSection } from "@/cms/types/section";

export async function createSectionAction(rawInput: unknown): Promise<CmsActionResult<CmsSection>> {
  const parsed = createSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsSectionService.create(parsed.data);
}

export async function updateSectionAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CmsActionResult<CmsSection>> {
  const parsed = updateSectionSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsSectionService.update(id, parsed.data, expectedUpdatedAt);
}

export async function toggleSectionAction(
  id: string,
  isEnabled: boolean,
): Promise<CmsActionResult<CmsSection>> {
  return CmsSectionService.toggleEnabled(id, isEnabled);
}

export async function reorderSectionsAction(rawInput: unknown): Promise<CmsActionResult> {
  const parsed = reorderSectionsSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsSectionService.reorder(parsed.data.pageId, parsed.data.orderedSectionIds);
}

export async function deleteSectionAction(id: string): Promise<CmsActionResult> {
  return CmsSectionService.delete(id);
}
