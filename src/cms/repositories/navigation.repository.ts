import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsNavigationItems } from "@/db/schema/cms";
import type { CmsNavigationItem, NavigationLocation, NewCmsNavigationItemInput } from "@/cms/types/navigation";
import type { UpdateNavigationItemInput } from "@/cms/validators/navigation.validator";
import type { LocalizedText } from "@/types/i18n";

type CmsNavigationItemRow = typeof cmsNavigationItems.$inferSelect;

function mapRowToNavigationItem(row: CmsNavigationItemRow): CmsNavigationItem {
  return {
    id: row.id,
    location: row.location,
    label: row.label as LocalizedText,
    href: row.href,
    icon: row.icon,
    position: row.position,
    isEnabled: row.isEnabled,
  };
}

/** Data access for `cms_navigation_items`. `CmsNavigationService` is the
 *  only caller. */
export const CmsNavigationRepository = {
  async create(input: NewCmsNavigationItemInput): Promise<CmsNavigationItem> {
    const [row] = await getDb()
      .insert(cmsNavigationItems)
      .values({
        location: input.location,
        label: input.label,
        href: input.href,
        icon: input.icon ?? null,
        position: input.position ?? 0,
        isEnabled: input.isEnabled ?? true,
      })
      .returning();
    return mapRowToNavigationItem(row);
  },

  async findById(id: string): Promise<CmsNavigationItem | null> {
    const [row] = await getDb()
      .select()
      .from(cmsNavigationItems)
      .where(eq(cmsNavigationItems.id, id))
      .limit(1);
    return row ? mapRowToNavigationItem(row) : null;
  },

  /** Ordered by `position` ascending. */
  async findByLocation(location: NavigationLocation): Promise<CmsNavigationItem[]> {
    const rows = await getDb()
      .select()
      .from(cmsNavigationItems)
      .where(eq(cmsNavigationItems.location, location))
      .orderBy(asc(cmsNavigationItems.position));
    return rows.map(mapRowToNavigationItem);
  },

  async update(id: string, input: UpdateNavigationItemInput): Promise<CmsNavigationItem | null> {
    const [row] = await getDb()
      .update(cmsNavigationItems)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(cmsNavigationItems.id, id))
      .returning();
    return row ? mapRowToNavigationItem(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsNavigationItems).where(eq(cmsNavigationItems.id, id));
  },
};
