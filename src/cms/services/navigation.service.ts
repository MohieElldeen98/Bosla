import { CmsNavigationRepository } from "@/cms/repositories/navigation.repository";
import { requireCmsAccess } from "@/cms/utils/require-cms-access";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import { recordNavigationAuditLog } from "@/cms/utils/navigation-audit-log";
import { safeMutation, safeRead } from "@/cms/utils/safe-operation";
import type { Locale } from "@/i18n/routing";
import type {
  CmsNavigationItem,
  NavigationLocation,
  NewCmsNavigationItemInput,
  ResolvedCmsNavigationItem,
} from "@/cms/types/navigation";
import type { CmsActionResult } from "@/cms/types/result";
import type { UpdateNavigationItemInput } from "@/cms/validators/navigation.validator";

/** Orchestration for `cms_navigation_items` (docs/cms-overview.md §8). */
export const CmsNavigationService = {
  async getByLocation(location: NavigationLocation): Promise<CmsNavigationItem[]> {
    return safeRead(() => CmsNavigationRepository.findByLocation(location), []);
  },

  /** Enabled items only, resolved to the active locale, ordered by
   *  position — what the header/footer would render. */
  async getResolvedByLocation(
    location: NavigationLocation,
    locale: Locale,
  ): Promise<ResolvedCmsNavigationItem[]> {
    const items = await safeRead(() => CmsNavigationRepository.findByLocation(location), []);
    return items
      .filter((item) => item.isEnabled)
      .map((item) => ({
        id: item.id,
        location: item.location,
        label: resolveLocalizedText(item.label, locale),
        href: item.href,
        icon: item.icon,
        position: item.position,
      }));
  },

  async create(input: NewCmsNavigationItemInput): Promise<CmsActionResult<CmsNavigationItem>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const created = await CmsNavigationRepository.create(input);
      await recordNavigationAuditLog({ action: "create", navigationItemId: created.id, actorId: user.id });
      return { success: true, data: created };
    });
  },

  async update(id: string, input: UpdateNavigationItemInput): Promise<CmsActionResult<CmsNavigationItem>> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot edit CMS content." };
      }
      const updated = await CmsNavigationRepository.update(id, input);
      if (!updated) {
        return { success: false, code: "not_found", message: "Navigation item not found." };
      }
      await recordNavigationAuditLog({ action: "update", navigationItemId: id, actorId: user.id });
      return { success: true, data: updated };
    });
  },

  /** The audit row is written before the delete (not after) since a
   *  dangling `navigation_item_id` can't be inserted once the referenced
   *  row is gone — `onDelete: "set null"` only rewrites *existing* rows
   *  when the item disappears, it doesn't permit inserting a new
   *  reference to an already-deleted one. */
  async delete(id: string): Promise<CmsActionResult> {
    return safeMutation(async () => {
      const user = await requireCmsAccess();
      if (!user) {
        return { success: false, code: "forbidden", message: "You cannot delete CMS content." };
      }
      await recordNavigationAuditLog({ action: "delete", navigationItemId: id, actorId: user.id });
      await CmsNavigationRepository.delete(id);
      return { success: true, data: undefined };
    });
  },
};
