import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { videos } from "@/db/schema/video";
import type {
  Video,
  VideoMetadata,
  VideoProcessingStatus,
  VideoStatus,
} from "@/video/types/video";

type VideoRow = typeof videos.$inferSelect;

export interface NewVideoRow {
  title: string;
  courseId: string;
  lessonId: string | null;
  storageKey: string;
  size: number;
  mimeType: string;
  uploadId: string;
  uploadedBy: string;
  metadata: VideoMetadata;
}

export interface UpdateVideoRow {
  title?: string;
  storageKey?: string;
  lessonId?: string | null;
  manifestKey?: string | null;
  thumbnailKey?: string | null;
  previewKey?: string | null;
  duration?: number | null;
  size?: number;
  status?: VideoStatus;
  processingStatus?: VideoProcessingStatus;
  processingError?: string | null;
  metadata?: VideoMetadata;
  uploadId?: string | null;
}

function mapRowToVideo(row: VideoRow): Video {
  return {
    id: row.id,
    title: row.title,
    courseId: row.courseId,
    lessonId: row.lessonId,
    storageKey: row.storageKey,
    manifestKey: row.manifestKey,
    thumbnailKey: row.thumbnailKey,
    previewKey: row.previewKey,
    duration: row.duration,
    size: row.size,
    mimeType: row.mimeType,
    status: row.status,
    processingStatus: row.processingStatus,
    processingError: row.processingError,
    metadata: row.metadata as VideoMetadata,
    uploadId: row.uploadId,
    uploadedBy: row.uploadedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Data access for `videos`. The video services are the only callers. */
export const VideoRepository = {
  async create(input: NewVideoRow): Promise<Video> {
    const [row] = await getDb()
      .insert(videos)
      .values({
        title: input.title,
        courseId: input.courseId,
        lessonId: input.lessonId,
        storageKey: input.storageKey,
        size: input.size,
        mimeType: input.mimeType,
        uploadId: input.uploadId,
        uploadedBy: input.uploadedBy,
        metadata: input.metadata,
        updatedAt: new Date(),
      })
      .returning();
    return mapRowToVideo(row);
  },

  async findById(id: string): Promise<Video | null> {
    const [row] = await getDb().select().from(videos).where(eq(videos.id, id)).limit(1);
    return row ? mapRowToVideo(row) : null;
  },

  async findByCourseId(courseId: string): Promise<Video[]> {
    const rows = await getDb()
      .select()
      .from(videos)
      .where(eq(videos.courseId, courseId))
      .orderBy(desc(videos.createdAt));
    return rows.map(mapRowToVideo);
  },

  /** The newest playable video attached to a lesson — what the course
   *  player streams. Re-uploads simply win by recency. */
  async findReadyByLessonId(lessonId: string): Promise<Video | null> {
    const [row] = await getDb()
      .select()
      .from(videos)
      .where(and(eq(videos.lessonId, lessonId), eq(videos.status, "ready")))
      .orderBy(desc(videos.createdAt))
      .limit(1);
    return row ? mapRowToVideo(row) : null;
  },

  async findLatestByLessonId(lessonId: string): Promise<Video | null> {
    const [row] = await getDb()
      .select()
      .from(videos)
      .where(eq(videos.lessonId, lessonId))
      .orderBy(desc(videos.createdAt))
      .limit(1);
    return row ? mapRowToVideo(row) : null;
  },

  async findReadyByLessonIds(lessonIds: string[]): Promise<Video[]> {
    if (lessonIds.length === 0) return [];
    const rows = await getDb()
      .select()
      .from(videos)
      .where(and(inArray(videos.lessonId, lessonIds), eq(videos.status, "ready")))
      .orderBy(desc(videos.createdAt));
    return rows.map(mapRowToVideo);
  },

  async update(id: string, input: UpdateVideoRow): Promise<Video | null> {
    const [row] = await getDb()
      .update(videos)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(videos.id, id))
      .returning();
    return row ? mapRowToVideo(row) : null;
  },

  async delete(id: string): Promise<boolean> {
    const rows = await getDb().delete(videos).where(eq(videos.id, id)).returning({ id: videos.id });
    return rows.length > 0;
  },
};
