import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsSiteSettings } from "@/db/schema/cms";

/** Data access for `cms_site_settings` — a generic key/value store.
 *  `CmsSiteSettingsService` is the only caller, and is what gives each key
 *  a typed shape (see `cms/types/site-settings.ts`). */
export const CmsSiteSettingsRepository = {
  async get(key: string): Promise<unknown | null> {
    const [row] = await getDb()
      .select()
      .from(cmsSiteSettings)
      .where(eq(cmsSiteSettings.key, key))
      .limit(1);
    return row ? row.value : null;
  },

  async getAll(): Promise<Record<string, unknown>> {
    const rows = await getDb().select().from(cmsSiteSettings);
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  },

  /** Upsert — a setting either doesn't exist yet or is being overwritten;
   *  there's no meaningful "create vs. update" distinction for a singleton
   *  key/value row. */
  async set(key: string, value: unknown): Promise<void> {
    await getDb()
      .insert(cmsSiteSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: cmsSiteSettings.key,
        set: { value, updatedAt: new Date() },
      });
  },

  async delete(key: string): Promise<void> {
    await getDb().delete(cmsSiteSettings).where(eq(cmsSiteSettings.key, key));
  },
};
