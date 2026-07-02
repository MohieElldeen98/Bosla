import { asc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { specialties } from "@/db/schema/course";
import type { LocalizedText } from "@/types/i18n";
import type { NewSpecialtyInput, Specialty } from "@/courses/types/specialty";
import type { UpdateSpecialtyInput } from "@/courses/validators/specialty.validator";

type SpecialtyRow = typeof specialties.$inferSelect;

function mapRowToSpecialty(row: SpecialtyRow): Specialty {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name as LocalizedText,
    description: (row.description as LocalizedText | null) ?? null,
    icon: row.icon,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `specialties`. `SpecialtyService` is the only caller. */
export const SpecialtyRepository = {
  async create(input: NewSpecialtyInput): Promise<Specialty> {
    const [row] = await getDb()
      .insert(specialties)
      .values({
        slug: input.slug,
        name: input.name,
        description: input.description ?? null,
        icon: input.icon ?? null,
        isActive: input.isActive ?? true,
        displayOrder: input.displayOrder ?? 0,
      })
      .returning();
    return mapRowToSpecialty(row);
  },

  async findById(id: string): Promise<Specialty | null> {
    const [row] = await getDb().select().from(specialties).where(eq(specialties.id, id)).limit(1);
    return row ? mapRowToSpecialty(row) : null;
  },

  async findBySlug(slug: string): Promise<Specialty | null> {
    const [row] = await getDb().select().from(specialties).where(eq(specialties.slug, slug)).limit(1);
    return row ? mapRowToSpecialty(row) : null;
  },

  /** Ordered by `displayOrder` ascending — the same order a catalog nav
   *  would render specialties in. */
  async findAll(): Promise<Specialty[]> {
    const rows = await getDb().select().from(specialties).orderBy(asc(specialties.displayOrder));
    return rows.map(mapRowToSpecialty);
  },

  /** Batch lookup — for composing a list of courses with their specialty
   *  names resolved without one query per row (Step 3.2 admin listing). */
  async findByIds(ids: string[]): Promise<Specialty[]> {
    if (ids.length === 0) return [];
    const rows = await getDb().select().from(specialties).where(inArray(specialties.id, ids));
    return rows.map(mapRowToSpecialty);
  },

  async update(id: string, input: UpdateSpecialtyInput): Promise<Specialty | null> {
    const [row] = await getDb()
      .update(specialties)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(specialties.id, id))
      .returning();
    return row ? mapRowToSpecialty(row) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(specialties).where(eq(specialties.id, id));
  },
};
