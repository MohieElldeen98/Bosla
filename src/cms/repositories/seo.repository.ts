import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsSeoMeta } from "@/db/schema/cms";
import type { LocalizedText } from "@/types/i18n";
import type { NewSeoMetaInput, SeoMeta } from "@/cms/types/seo";
import type { OptimisticUpdateResult } from "@/cms/types/repository-result";

type CmsSeoMetaRow = typeof cmsSeoMeta.$inferSelect;

function mapRowToSeoMeta(row: CmsSeoMetaRow): SeoMeta {
  return {
    id: row.id,
    title: (row.title as LocalizedText | null) ?? null,
    description: (row.description as LocalizedText | null) ?? null,
    ogImageId: row.ogImageId,
    canonicalPath: row.canonicalPath,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `cms_seo_meta`. `CmsSeoService` is the only caller. */
export const CmsSeoRepository = {
  async create(input: NewSeoMetaInput): Promise<SeoMeta> {
    const [row] = await getDb()
      .insert(cmsSeoMeta)
      .values({
        title: input.title ?? null,
        description: input.description ?? null,
        ogImageId: input.ogImageId ?? null,
        canonicalPath: input.canonicalPath ?? null,
      })
      .returning();
    return mapRowToSeoMeta(row);
  },

  async findById(id: string): Promise<SeoMeta | null> {
    const [row] = await getDb().select().from(cmsSeoMeta).where(eq(cmsSeoMeta.id, id)).limit(1);
    return row ? mapRowToSeoMeta(row) : null;
  },

  /** `expectedUpdatedAt`, when given, is included in the `WHERE` clause so
   *  the update itself is the atomic check-and-write — no separate
   *  read-then-write race window. If the row exists but the timestamp
   *  didn't match (someone else updated it first), a follow-up existence
   *  check distinguishes that from "no such row" so the caller gets the
   *  right `CmsActionResult` code. */
  async update(
    id: string,
    input: NewSeoMetaInput,
    expectedUpdatedAt?: string,
  ): Promise<OptimisticUpdateResult<SeoMeta>> {
    const conditions = [eq(cmsSeoMeta.id, id)];
    if (expectedUpdatedAt) {
      conditions.push(eq(cmsSeoMeta.updatedAt, new Date(expectedUpdatedAt)));
    }

    const [row] = await getDb()
      .update(cmsSeoMeta)
      .set({ ...input, updatedAt: new Date() })
      .where(and(...conditions))
      .returning();

    if (row) return { status: "ok", data: mapRowToSeoMeta(row) };
    if (!expectedUpdatedAt) return { status: "not_found" };

    const stillExists = await CmsSeoRepository.findById(id);
    return stillExists ? { status: "conflict" } : { status: "not_found" };
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(cmsSeoMeta).where(eq(cmsSeoMeta.id, id));
  },
};
