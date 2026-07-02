"use server";

import { CmsNavigationService } from "@/cms/services/navigation.service";
import {
  createNavigationItemSchema,
  updateNavigationItemSchema,
} from "@/cms/validators/navigation.validator";
import type { CmsActionResult } from "@/cms/types/result";
import type { CmsNavigationItem } from "@/cms/types/navigation";

export async function createNavigationItemAction(
  rawInput: unknown,
): Promise<CmsActionResult<CmsNavigationItem>> {
  const parsed = createNavigationItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsNavigationService.create(parsed.data);
}

export async function updateNavigationItemAction(
  id: string,
  rawInput: unknown,
): Promise<CmsActionResult<CmsNavigationItem>> {
  const parsed = updateNavigationItemSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsNavigationService.update(id, parsed.data);
}

export async function deleteNavigationItemAction(id: string): Promise<CmsActionResult> {
  return CmsNavigationService.delete(id);
}
