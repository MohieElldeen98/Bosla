import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { categories } from "@/db/schema/course";
import type { LocalizedText } from "@/types/i18n";
import type { Category, NewCategoryInput } from "@/courses/types/category";
import type { UpdateCategoryInput } from "@/courses/validators/category.validator";

type CategoryRow = typeof categories.$inferSelect;

function mapRowToCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name as LocalizedText,
    description: (row.description as LocalizedText | null) ?? null,
    icon: row.icon,
    specialtyId: row.specialtyId,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `categories`. `CategoryService` is the only caller. */
export const CategoryRepository = {
  async create(input: NewCategoryInput): Promise<Category> {
    const [row] = await getDb()
      .insert(categories)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        specialtyId: input.specialtyId ?? null,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();
    return mapRowToCategory(row);
  },

  async findById(id: string): Promise<Category | null> {
    const [row] = await getDb().select().from(categories).where(eq(categories.id, id)).limit(1);
    return row ? mapRowToCategory(row) : null;
  },

  async findBySlug(slug: string): Promise<Category | null> {
    const [row] = await getDb().select().from(categories).where(eq(categories.slug, slug)).limit(1);
    return row ? mapRowToCategory(row) : null;
  },

  /** Ordered by `displayOrder` ascending. */
  async findAll(): Promise<Category[]> {
    const rows = await getDb().select().from(categories).orderBy(asc(categories.displayOrder));
    return rows.map(mapRowToCategory);
  },

  async findBySpecialtyId(specialtyId: string): Promise<Category[]> {
    const rows = await getDb()
      .select()
      .from(categories)
      .where(eq(categories.specialtyId, specialtyId))
      .orderBy(asc(categories.displayOrder));
    return rows.map(mapRowToCategory);
  },

  /** Batch lookup — for composing a list of courses with their category
   *  names resolved without one query per row (Step 3.2 admin listing). */
  async findByIds(ids: string[]): Promise<Category[]> {
    if (ids.length === 0) return [];
    const rows = await getDb().select().from(categories).where(inArray(categories.id, ids));
    return rows.map(mapRowToCategory);
  },

  async update(id: string, input: UpdateCategoryInput): Promise<Category | null> {
    const [row] = await getDb()
      .update(categories)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(categories.id, id))
      .returning();
    return row ? mapRowToCategory(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(categories).where(eq(categories.id, id));
  },
};
