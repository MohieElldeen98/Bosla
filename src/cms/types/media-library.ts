import type { LocalizedText } from "@/types/i18n";
import type {
  MediaProcessingStatus,
  MediaVariants,
  MediaVisibility,
} from "@/media/types/media-platform";

/** Mirrors `db/schema/cms.ts`'s `media_file_type` Postgres enum exactly —
 *  derived from a file's MIME type at upload time
 *  (`resolveMediaFileType`), not user-chosen. */
export const MEDIA_FILE_TYPES = [
  "image",
  "video",
  "pdf",
  "audio",
  "document",
  "archive",
  "other",
] as const;
export type MediaFileType = (typeof MEDIA_FILE_TYPES)[number];

/**
 * The Media Library's own, richer counterpart to `src/types/media.ts`'s
 * lean `MediaAsset` — that type stays exactly as it is (id/url/alt/
 * width/height/placeholder) for every existing content-resolution call
 * site (Hero, course cover images, SEO og:image); this is what the
 * Media Library's own authoring surfaces (the admin grid, the
 * `MediaPicker`) work with instead, since *managing* an asset needs its
 * full metadata, not just enough to render it.
 */
export interface MediaLibraryAsset {
  id: string;
  url: string;
  storagePath: string;
  fileType: MediaFileType;
  mimeType: string;
  fileSize: number;
  alt: LocalizedText | null;
  title: LocalizedText | null;
  caption: LocalizedText | null;
  description: LocalizedText | null;
  tags: string[];
  folder: string | null;
  width: number | null;
  height: number | null;
  placeholder: string | null;
  uploadedByUserId: string | null;
  /** Media-platform fields (docs/media-platform.md). `storageKey: null`
   *  marks a legacy Supabase-era row whose bytes haven't been migrated
   *  to R2 yet — its stored `url` keeps serving until then. */
  storageKey: string | null;
  thumbnailKey: string | null;
  variants: MediaVariants;
  duration: number | null;
  processingStatus: MediaProcessingStatus;
  visibility: MediaVisibility;
  dominantColor: string | null;
  pageCount: number | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Locale-resolved view — what the admin grid and `MediaPicker` actually
 *  render, same "flatten bilingual fields to the active locale" job
 *  every other `Resolved*` type in this codebase does. */
export interface ResolvedMediaLibraryAsset {
  id: string;
  url: string;
  storagePath: string;
  fileType: MediaFileType;
  mimeType: string;
  fileSize: number;
  alt: string | null;
  title: string | null;
  caption: string | null;
  description: string | null;
  tags: string[];
  folder: string | null;
  width: number | null;
  height: number | null;
  placeholder: string | null;
  thumbnailUrl: string | null;
  processingStatus: MediaProcessingStatus;
  visibility: MediaVisibility;
  duration: number | null;
  pageCount: number | null;
  dominantColor: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewMediaLibraryAssetInput {
  id: string;
  url: string;
  storagePath: string;
  fileType: MediaFileType;
  mimeType: string;
  fileSize: number;
  alt?: LocalizedText | null;
  title?: LocalizedText | null;
  caption?: LocalizedText | null;
  description?: LocalizedText | null;
  tags?: string[];
  folder?: string | null;
  width?: number | null;
  height?: number | null;
  placeholder?: string | null;
  uploadedByUserId?: string | null;
  storageKey?: string | null;
  processingStatus?: MediaProcessingStatus;
  visibility?: MediaVisibility;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
}
