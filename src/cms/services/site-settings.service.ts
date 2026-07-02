import { CmsSiteSettingsRepository } from "@/cms/repositories/site-settings.repository";
import { validateSiteSetting } from "@/cms/validators/site-settings.validator";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import type { CmsActionResult } from "@/cms/types/result";
import type { SiteSettingKey, SiteSettingsByKey } from "@/cms/types/site-settings";

/** Orchestration for `cms_site_settings` — footer content
 *  (docs/cms-overview.md §9), sitewide SEO defaults (§7), and any future
 *  sitewide setting, all through one generic, typed key/value service. */
export const CmsSiteSettingsService = {
  async get<K extends SiteSettingKey>(key: K): Promise<SiteSettingsByKey[K] | null> {
    const value = await safeRead(() => CmsSiteSettingsRepository.get(key), null);
    return (value as SiteSettingsByKey[K] | null) ?? null;
  },

  async getAll(): Promise<Partial<SiteSettingsByKey>> {
    const all = await safeRead(() => CmsSiteSettingsRepository.getAll(), {});
    return all as Partial<SiteSettingsByKey>;
  },

  async set<K extends SiteSettingKey>(
    key: K,
    value: SiteSettingsByKey[K],
  ): Promise<CmsActionResult<SiteSettingsByKey[K]>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit site settings." };
      }

      const result = validateSiteSetting(key, value);
      if (!result.success) {
        return {
          success: false,
          code: "validation_failed",
          message: result.error.issues.map((issue) => issue.message).join(" "),
        };
      }

      await CmsSiteSettingsRepository.set(key, result.data);
      return { success: true, data: result.data as SiteSettingsByKey[K] };
    });
  },

  async delete(key: SiteSettingKey): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit site settings." };
      }
      await CmsSiteSettingsRepository.delete(key);
      return { success: true, data: undefined };
    });
  },
};
