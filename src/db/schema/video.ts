import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "./auth-users";
import { courses } from "./course";
import { lessons } from "./learning";

/**
 * The Video Domain — source-of-truth rows for course lesson videos that
 * live in the dedicated video object store (R2/S3, `src/video/storage`),
 * NOT in the CMS media library: these need multipart resumable uploads,
 * FFmpeg-derived HLS artifacts, and per-request signed playback that the
 * Supabase-backed `cms_media_assets` pipeline was never shaped for.
 * Storage keys are bucket-relative paths (`videos/<id>/…`); permanent
 * URLs are deliberately never stored — every URL a client sees is minted
 * short-lived at request time (docs/video-system.md).
 */

/** Upload → processing → playable lifecycle of the whole video record. */
export const videoStatusEnum = pgEnum("video_status", [
  "uploading",
  "processing",
  "ready",
  "failed",
]);

/**
 * The background pipeline's own state, separate from `status` on purpose:
 * a video whose transcode failed (or was skipped because FFmpeg isn't
 * installed) can still be `ready` for playback via its source file —
 * `status` answers "can students watch this," `processingStatus` answers
 * "did the HLS/thumbnail pipeline finish."
 */
export const videoProcessingStatusEnum = pgEnum("video_processing_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
]);

export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    /** `set null`, not cascade — deleting a lesson must not destroy an
     *  expensive uploaded/transcoded video; it becomes reattachable. */
    lessonId: uuid("lesson_id").references(() => lessons.id, { onDelete: "set null" }),
    /** The original uploaded file (`videos/<id>/source/<filename>`). */
    storageKey: text("storage_key").notNull(),
    /** `master.m3u8` once HLS generation completes. */
    manifestKey: text("manifest_key"),
    thumbnailKey: text("thumbnail_key"),
    previewKey: text("preview_key"),
    /** Seconds, extracted by ffprobe. */
    duration: integer("duration"),
    /** Bytes. `bigint` — a 2GB+ source overflows a 4-byte integer. */
    size: bigint("size", { mode: "number" }).notNull().default(0),
    mimeType: text("mime_type").notNull(),
    status: videoStatusEnum("status").notNull().default("uploading"),
    processingStatus: videoProcessingStatusEnum("processing_status").notNull().default("pending"),
    /** Human-readable failure reason for the instructor UI. */
    processingError: text("processing_error"),
    /** Rendition list, source dimensions, codec info — shape owned by
     *  `video/types/video.ts` (`VideoMetadata`), free to grow without
     *  migrations. */
    metadata: jsonb("metadata").notNull().default({}),
    /** The provider's multipart upload id while `status = "uploading"` —
     *  kept so the server can abort/garbage-collect abandoned uploads. */
    uploadId: text("upload_id"),
    uploadedBy: uuid("uploaded_by").references(() => authUsers.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    index("videos_course_id_idx").on(table.courseId, table.createdAt),
    index("videos_lesson_id_idx").on(table.lessonId),
    index("videos_status_idx").on(table.status),
    check("videos_duration_check", sql`${table.duration} IS NULL OR ${table.duration} >= 0`),
    check("videos_size_check", sql`${table.size} >= 0`),
  ],
);
