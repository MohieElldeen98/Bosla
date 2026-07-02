"use server";

import { CmsSiteSettingsService } from "@/cms/services/site-settings.service";
import type { CmsActionResult } from "@/cms/types/result";
import type { SiteSettingKey, SiteSettingsByKey } from "@/cms/types/site-settings";

/** Validation happens inside `CmsSiteSettingsService.set` (keyed against
 *  `SITE_SETTING_SCHEMAS`) — the action itself stays a thin pass-through,
 *  same as every other CMS action. */
export async function setSiteSettingAction<K extends SiteSettingKey>(
  key: K,
  value: unknown,
): Promise<CmsActionResult<SiteSettingsByKey[K]>> {
  return CmsSiteSettingsService.set(key, value as SiteSettingsByKey[K]);
}

export async function deleteSiteSettingAction(key: SiteSettingKey): Promise<CmsActionResult> {
  return CmsSiteSettingsService.delete(key);
}
