"use server";

import { CmsPageVersionService } from "@/cms/services/page-version.service";
import type { CmsActionResult } from "@/cms/types/result";
import type { CmsPagePublishStatus, CmsPageVersion } from "@/cms/types/page-version";

export async function publishPageAction(pageId: string): Promise<CmsActionResult<CmsPageVersion>> {
  return CmsPageVersionService.publish(pageId);
}

export async function revertToPublishedAction(pageId: string): Promise<CmsActionResult> {
  return CmsPageVersionService.revertToPublished(pageId);
}

export async function getPublishStatusAction(pageId: string): Promise<CmsPagePublishStatus> {
  return CmsPageVersionService.getPublishStatus(pageId);
}
