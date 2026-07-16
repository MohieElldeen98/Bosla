import { FileText, Film, File as FileIcon } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { MediaFileType } from "@/cms/types/media-library";

/** The one place that decides how to render an asset's thumbnail —
 *  shared by the admin grid, the detail panel, and `MediaPicker`, so
 *  "what a video/PDF/other file looks like" is defined once. Video gets
 *  an actual `<video>` element (its first frame, muted, no controls) for
 *  a real filmstrip-style preview rather than a static icon; PDF/other
 *  stay icon-only — a PDF thumbnail would need a render pipeline this
 *  step doesn't build. */
export function MediaThumbnail({
  url,
  alt,
  fileType,
  className,
}: {
  url: string;
  alt: string;
  fileType: MediaFileType;
  className?: string;
}) {
  if (fileType === "image") {
    return (
      <div className="relative size-full">
        <Image
          src={url}
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

  const Icon = fileType === "pdf" ? FileText : FileIcon;
  return (
    <div className={cn("flex size-full items-center justify-center bg-muted", className)}>
      <Icon aria-hidden="true" className="size-8 text-muted-foreground" />
    </div>
  );
}

export function MediaFileTypeIcon({ fileType, className }: { fileType: MediaFileType; className?: string }) {
  if (fileType === "video") return <Film aria-hidden="true" className={className} />;
  return <FileText aria-hidden="true" className={className} />;
}
