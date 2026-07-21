import { FileArchive, FileAudio, FileSpreadsheet, FileText, Film, File as FileIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MediaFileType } from "@/cms/types/media-library";

/** The one place that decides how to render an asset's thumbnail —
 *  shared by the admin grid, the detail panel, and `MediaPicker`, so
 *  "what a video/PDF/audio/document looks like" is defined once.
 *  Priority: a pipeline-generated `thumbnailUrl` (image ladder thumb,
 *  video frame) beats everything; then images render themselves, videos
 *  show their first frame via `<video>`, and everything else gets its
 *  category icon. */
export function MediaThumbnail({
  url,
  thumbnailUrl,
  alt,
  fileType,
  className,
}: {
  url: string;
  thumbnailUrl?: string | null;
  alt: string;
  fileType: MediaFileType;
  className?: string;
}) {
  if (thumbnailUrl || fileType === "image") {
    return (
      <div className="relative size-full">
        <Image
          src={thumbnailUrl ?? url}
          alt={alt}
          fill
          sizes="(max-width: 768px) 50vw, 16rem"
          className={cn("size-full object-cover", className)}
        />
      </div>
    );
  }

  if (fileType === "video") {
    return (
      <video src={`${url}#t=0.1`} muted playsInline preload="metadata" className={cn("size-full object-cover", className)} />
    );
  }

  const Icon = MEDIA_TYPE_ICONS[fileType] ?? FileIcon;
  return (
    <div className={cn("flex size-full items-center justify-center bg-muted", className)}>
      <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
    </div>
  );
}

const MEDIA_TYPE_ICONS: Partial<Record<MediaFileType, typeof FileIcon>> = {
  pdf: FileText,
  audio: FileAudio,
  document: FileSpreadsheet,
  archive: FileArchive,
  video: Film,
};

export function MediaFileTypeIcon({ fileType, className }: { fileType: MediaFileType; className?: string }) {
  const Icon = MEDIA_TYPE_ICONS[fileType] ?? FileText;
  return <Icon aria-hidden="true" className={className} />;
}
