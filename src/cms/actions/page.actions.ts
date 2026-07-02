"use server";

import { CmsPageService } from "@/cms/services/page.service";
import { createPageSchema, updatePageSchema } from "@/cms/validators/page.validator";
import type { CmsActionResult } from "@/cms/types/result";
import type { CmsPage } from "@/cms/types/page";

/**
 * Real `"use server"` bodies — call `CmsPageService` only, never a
 * repository or Drizzle directly. No Admin UI calls these yet; they exist
 * so the future Admin Panel has a stable contract to build against (the
 * same relationship `auth/actions/*` has to the Auth UI).
 */
export async function createPageAction(rawInput: unknown): Promise<CmsActionResult<CmsPage>> {
  const parsed = createPageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsPageService.create(parsed.data);
}

export async function updatePageAction(
  id: string,
  rawInput: unknown,
): Promise<CmsActionResult<CmsPage>> {
  const parsed = updatePageSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsPageService.update(id, parsed.data);
}

export async function deletePageAction(id: string): Promise<CmsActionResult> {
  return CmsPageService.delete(id);
}
