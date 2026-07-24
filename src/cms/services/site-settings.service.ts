import { CmsSiteSettingsRepository } from "@/cms/repositories/site-settings.repository";
import { validateSiteSetting } from "@/cms/validators/site-settings.validator";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { recordSiteSettingsAuditLog } from "@/cms/utils/site-settings-audit-log";
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
      // Logged after the write (not before, unlike a delete) — `set` is
      // an upsert, and the audit row's `settingKey` FK needs the
      // `cms_site_settings` row to already exist on a first-ever save.
      await recordSiteSettingsAuditLog({ action: "update", settingKey: key, actorId: user.id });
      return { success: true, data: result.data as SiteSettingsByKey[K] };
    });
  },

  /** The audit row is written before the delete (not after) since
   *  `cms_site_settings_audit_logs` cascades on `setting_key` — logging
   *  after the row is gone would have nothing to attach to (matches
   *  `CourseService.delete`'s/`ArticleService.delete`'s own precedent). */
  async delete(key: SiteSettingKey): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit site settings." };
      }
      await recordSiteSettingsAuditLog({ action: "delete", settingKey: key, actorId: user.id });
      await CmsSiteSettingsRepository.delete(key);
      return { success: true, data: undefined };
    });
  },
};
