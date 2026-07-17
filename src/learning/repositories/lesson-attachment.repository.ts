import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { lessonAttachments } from "@/db/schema/learning";
import type { LocalizedText } from "@/types/i18n";
import type { LessonAttachment } from "@/learning/types/lesson-attachment";

type LessonAttachmentRow = typeof lessonAttachments.$inferSelect;

export interface NewLessonAttachmentInput {
  lessonId: string;
  mediaAssetId: string;
  title: LocalizedText;
  position: number;
}

export interface UpdateLessonAttachmentRow {
  title?: LocalizedText;
  position?: number;
}

function mapRow(row: LessonAttachmentRow): LessonAttachment {
  return {
    id: row.id,
    lessonId: row.lessonId,
    mediaAssetId: row.mediaAssetId,
    title: row.title as LocalizedText,
    position: row.position,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const LessonAttachmentRepository = {
  async findById(id: string): Promise<LessonAttachment | null> {
    const rows = await getDb().select().from(lessonAttachments).where(eq(lessonAttachments.id, id)).limit(1);
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async findByLessonId(lessonId: string): Promise<LessonAttachment[]> {
    const rows = await getDb()
      .select()
      .from(lessonAttachments)
      .where(eq(lessonAttachments.lessonId, lessonId))
      .orderBy(asc(lessonAttachments.position), asc(lessonAttachments.createdAt));
    return rows.map(mapRow);
  },

  async create(input: NewLessonAttachmentInput): Promise<LessonAttachment> {
    const rows = await getDb()
      .insert(lessonAttachments)
      .values({
        lessonId: input.lessonId,
        mediaAssetId: input.mediaAssetId,
        title: input.title,
        position: input.position,
      })
      .returning();
    return mapRow(rows[0]);
  },

  async update(id: string, row: UpdateLessonAttachmentRow): Promise<LessonAttachment | null> {
    const rows = await getDb()
      .update(lessonAttachments)
      .set({ ...row, updatedAt: new Date() })
      .where(eq(lessonAttachments.id, id))
      .returning();
    return rows[0] ? mapRow(rows[0]) : null;
  },

  async delete(id: string): Promise<void> {
    await getDb().delete(lessonAttachments).where(eq(lessonAttachments.id, id));
  },
};
