"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { cn } from "@/lib/utils";
import type { ResolvedMediaLibraryAsset } from "@/cms/types/media-library";

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** One grid tile — shared by the admin Media Library grid and
 *  `MediaPicker`'s own browse grid, so a thumbnail/filename/badge looks
 *  identical in both places. `selected` only ever applies in the
 *  Picker's context (the admin grid doesn't have a "current selection"
 *  concept). */
export function MediaGridCard({
  asset,
  selected,
  onClick,
}: {
  asset: ResolvedMediaLibraryAsset;
  selected?: boolean;
  onClick: () => void;
}) {
  const t = useTranslations("Admin.media");
  const displayName = asset.title ?? asset.alt ?? asset.storagePath.split("/").pop() ?? asset.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border bg-card text-start transition-colors",
        selected ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
      )}
    >
      <div className="aspect-square w-full overflow-hidden bg-muted">
        <MediaThumbnail url={asset.url} alt={asset.alt ?? ""} fileType={asset.fileType} />
      </div>
      <div className="space-y-1 p-2">
        <p className="truncate text-xs font-medium text-foreground">{displayName}</p>
        <div className="flex items-center gap-1.5">
          <Badge variant="outline" className="text-[10px]">
            {t(`fileTypes.${asset.fileType}`)}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{formatFileSize(asset.fileSize)}</span>
        </div>
      </div>
    </button>
  );
}
