/** Mirrors `db/schema/video.ts`'s `videoStatusEnum` exactly. */
export const VIDEO_STATUSES = ["uploading", "processing", "ready", "failed"] as const;
export type VideoStatus = (typeof VIDEO_STATUSES)[number];

/** Mirrors `db/schema/video.ts`'s `videoProcessingStatusEnum` exactly. */
export const VIDEO_PROCESSING_STATUSES = [
  "pending",
  "running",
  "completed",
  "failed",
  "skipped",
] as const;
export type VideoProcessingStatus = (typeof VIDEO_PROCESSING_STATUSES)[number];

/** One generated HLS rendition, stored in `videos.metadata`. */
export interface VideoRendition {
  height: number;
  width: number;
  /** Video bitrate in kbps the rendition was encoded at. */
  bitrateKbps: number;
  playlistKey: string;
}

/** Shape of the `videos.metadata` jsonb column. All fields optional —
 *  rows created before a pipeline run (or when FFmpeg is unavailable)
 *  simply have `{}`. */
export interface VideoMetadata {
  sourceWidth?: number;
  sourceHeight?: number;
  sourceCodec?: string;
  renditions?: VideoRendition[];
  originalFileName?: string;
}

export interface Video {
  id: string;
  title: string;
  courseId: string;
  lessonId: string | null;
  storageKey: string;
  manifestKey: string | null;
  thumbnailKey: string | null;
  previewKey: string | null;
  duration: number | null;
  size: number;
  mimeType: string;
  status: VideoStatus;
  processingStatus: VideoProcessingStatus;
  processingError: string | null;
  metadata: VideoMetadata;
  /** Provider multipart upload id while `status = "uploading"`, else null. */
  uploadId: string | null;
  uploadedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What `createVideoUploadAction` hands the browser to start uploading. */
export interface VideoUploadSession {
  videoId: string;
  partSize: number;
  partCount: number;
}

/** Source containers accepted for upload; the pipeline normalizes
 *  everything to HLS/H.264 anyway, so this list is about what FFmpeg can
 *  reliably ingest, not what browsers can play. */
export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
  "video/x-msvideo",
] as const;

/** 8 GB — comfortably above the required 2GB+ while still bounding abuse. */
export const MAX_VIDEO_SIZE_BYTES = 8 * 1024 * 1024 * 1024;

/** 16 MB chunks: S3/R2's minimum is 5 MB, and at 16 MB an 8 GB file is
 *  512 parts — far under the 10,000-part provider cap, big enough that
 *  presigning stays cheap, small enough that a retry wastes little. */
export const UPLOAD_PART_SIZE_BYTES = 16 * 1024 * 1024;

/** How many part URLs a single signing action call may mint. */
export const MAX_SIGNED_PARTS_PER_REQUEST = 20;
