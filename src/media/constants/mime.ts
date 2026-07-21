import type { MediaFileType } from "@/cms/types/media-library";

/**
 * The one MIME vocabulary for the whole Media Platform — every upload
 * surface (library, editor, attachments) validates against these maps;
 * nothing else in the codebase hardcodes an accept list. Replaces the
 * deleted `src/cms/constants/storage.ts` (Supabase-era).
 */

export const MEDIA_ALLOWED_MIME_TYPES: Record<Exclude<MediaFileType, "other">, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml", "image/avif"],
  video: ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "video/x-msvideo"],
  pdf: ["application/pdf"],
  audio: ["audio/mpeg", "audio/mp4", "audio/wav", "audio/ogg", "audio/aac", "audio/flac"],
  document: [
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
  ],
  archive: ["application/zip", "application/x-zip-compressed"],
};

export const MEDIA_ACCEPTED_MIME_TYPES: string[] = Object.values(MEDIA_ALLOWED_MIME_TYPES).flat();

/** Per-category upload caps — images/documents stay tight; video/audio
 *  get room. (Lesson videos have their own 8 GB limit in the video
 *  domain; library videos are trailers/embeds, not full lectures.) */
export const MEDIA_MAX_FILE_SIZE_BYTES: Record<Exclude<MediaFileType, "other">, number> = {
  image: 50 * 1024 * 1024,
  video: 1024 * 1024 * 1024,
  pdf: 100 * 1024 * 1024,
  audio: 300 * 1024 * 1024,
  document: 100 * 1024 * 1024,
  archive: 500 * 1024 * 1024,
};

const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/x-msvideo": "avi",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/wav": "wav",
  "audio/ogg": "ogg",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
};

export function resolveMediaFileType(mimeType: string): MediaFileType {
  for (const [type, mimes] of Object.entries(MEDIA_ALLOWED_MIME_TYPES) as [
    Exclude<MediaFileType, "other">,
    string[],
  ][]) {
    if (mimes.includes(mimeType)) return type;
  }
  return "other";
}

export function resolveFileExtension(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] ?? "bin";
}

export function maxSizeForMime(mimeType: string): number {
  const type = resolveMediaFileType(mimeType);
  return type === "other" ? 0 : MEDIA_MAX_FILE_SIZE_BYTES[type];
}
