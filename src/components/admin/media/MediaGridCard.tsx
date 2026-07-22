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
  checked,
  onCheckedChange,
  unused,
  unusedLabel,
}: {
  asset: ResolvedMediaLibraryAsset;
  selected?: boolean;
  onClick: () => void;
  /** Bulk-selection state — rendering a checkbox overlay when provided
   *  (the admin grid); `MediaPicker` never passes these. */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** `true` once `MediaLibraryManager` has confirmed this asset shows up
   *  in none of `findMediaUsages`'s sources — omitted (not `false`)
   *  while that check is still in flight, so a card never flashes the
   *  badge on and back off. `MediaPicker`'s browse grid never passes
   *  this — usage-checking every asset in a picker few users open would
   *  be a lot of DB work for a badge nobody there needs. */
  unused?: boolean;
  unusedLabel?: string;
}) {
  const t = useTranslations("Admin.media");
  const displayName = asset.title ?? asset.alt ?? asset.storagePath.split("/").pop() ?? asset.id;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border bg-card text-start transition-colors",
        selected || checked ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50",
      )}
    >
      {onCheckedChange && (
        <span
          role="checkbox"
          aria-checked={checked}
          aria-label={displayName}
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            onCheckedChange(!checked);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onCheckedChange(!checked);
            }
          }}
          className={cn(
            "absolute start-2 top-2 z-10 flex size-5 items-center justify-center rounded border bg-background/90 transition-opacity",
            checked ? "border-primary bg-primary text-primary-foreground opacity-100" : "border-border opacity-0 group-hover:opacity-100",
          )}
        >
          {checked && <span className="text-[10px] leading-none">✓</span>}
        </span>
      )}
      <div className="aspect-square w-full overflow-hidden bg-muted">
        <MediaThumbnail
          url={asset.url}
          thumbnailUrl={asset.thumbnailUrl}
          alt={asset.alt ?? ""}
          fileType={asset.fileType}
        />
      </div>
      {unused && (
        <span className="absolute bottom-2 start-2 rounded bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
          {unusedLabel}
        </span>
      )}
      {asset.processingStatus === "pending" || asset.processingStatus === "running" ? (
        <span className="absolute end-2 top-2 rounded bg-background/90 px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {t("processingBadge")}
        </span>
      ) : null}
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
