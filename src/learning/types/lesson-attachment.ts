import type { LocalizedText } from "@/types/i18n";

/** A downloadable resource on a lesson — the row shape. The file itself
 *  is a Media Library asset; this type carries only linkage, display
 *  title, and ordering (see the `lesson_attachments` schema comment). */
export interface LessonAttachment {
  id: string;
  lessonId: string;
  mediaAssetId: string;
  title: LocalizedText;
  position: number;
  createdAt: string;
  updatedAt: string;
}

/** Player-facing shape: locale-resolved title plus the media fields a
 *  download row renders (url, type icon, human file size). */
export interface ResolvedLessonAttachment {
  id: string;
  title: string;
  url: string;
  mimeType: string;
  fileSize: number;
  position: number;
}
