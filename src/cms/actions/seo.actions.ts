"use server";

import { CmsSeoService } from "@/cms/services/seo.service";
import { seoMetaSchema } from "@/cms/validators/seo.validator";
import type { CmsActionResult } from "@/cms/types/result";
import type { SeoMeta } from "@/cms/types/seo";

export async function createSeoMetaAction(rawInput: unknown): Promise<CmsActionResult<SeoMeta>> {
  const parsed = seoMetaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsSeoService.create(parsed.data);
}

export async function updateSeoMetaAction(
  id: string,
  rawInput: unknown,
): Promise<CmsActionResult<SeoMeta>> {
  const parsed = seoMetaSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CmsSeoService.update(id, parsed.data);
}

export async function deleteSeoMetaAction(id: string): Promise<CmsActionResult> {
  return CmsSeoService.delete(id);
}
