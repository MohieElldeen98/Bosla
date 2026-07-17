import { FileText, ImageIcon, File as FileIcon, Download } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ResolvedLessonAttachment } from "@/learning/types/lesson-attachment";

function iconFor(mimeType: string): LucideIcon {
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.startsWith("image/")) return ImageIcon;
  return FileIcon;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

/** The Resources tab's download list — plain anchor downloads (assets are
 *  public-bucket media; the gate is the player payload they arrived in). */
export function LessonResourcesList({ attachments }: { attachments: ResolvedLessonAttachment[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {attachments.map((attachment) => {
        const Icon = iconFor(attachment.mimeType);
        return (
          <li key={attachment.id}>
            <a
              href={attachment.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:border-primary/50 hover:bg-muted/40"
            >
              <Icon aria-hidden="true" className="size-4 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">{attachment.title}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
              </span>
              <Download aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
