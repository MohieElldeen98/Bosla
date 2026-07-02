"use server";

import { CmsPageVersionService } from "@/cms/services/page-version.service";
import type { CmsActionResult } from "@/cms/types/result";
import type { CmsPagePublishStatus, CmsPageVersion } from "@/cms/types/page-version";

export async function publishPageAction(
  pageId: string,
  expectedPublishedVersion?: number | null,
): Promise<CmsActionResult<CmsPageVersion>> {
  return CmsPageVersionService.publish(pageId, expectedPublishedVersion);
}

export async function revertToPublishedAction(
  pageId: string,
  expectedPublishedVersion?: number | null,
): Promise<CmsActionResult> {
  return CmsPageVersionService.revertToPublished(pageId, expectedPublishedVersion);
}

export async function getPublishStatusAction(pageId: string): Promise<CmsPagePublishStatus> {
  return CmsPageVersionService.getPublishStatus(pageId);
}
