"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, CheckCircle2, Copy, FileText, Loader2, Pause, Play, RotateCcw,
  Settings2, UploadCloud, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMediaByIdAction } from "@/cms/actions/media.actions";
import { getMediaAssetStatusAction } from "@/media/actions/media-upload.actions";
import { MEDIA_ACCEPTED_MIME_TYPES, maxSizeForMime } from "@/media/constants/mime";
import { createMediaTransport } from "@/media/upload/media-transport";
import { useUploads } from "@/media/upload/useUploads";
import { optimizeImage } from "@/cms/utils/optimize-image";
import type { MediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaVisibility } from "@/media/types/media-platform";
import type { UploadSnapshot, UploadState } from "@/media/upload/engine";

/**
 * THE upload surface of the Media Platform — shared by the admin Media
 * Library, `MediaPicker` (and through it every form and the rich text
 * editor). Drag & drop, multi-file, per-file progress/speed/ETA with
 * pause/resume/retry/cancel, duplicate reuse, and processing status —
 * all on the shared `ResumableUpload` engine (docs/media-platform.md).
 * Bytes go browser → object storage; nothing passes through Next.js.
 */

function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function formatEta(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

const ACTIVE_STATES: UploadState[] = ["starting", "uploading", "completing"];

export function MediaUploadZone({
  folder,
  visibility = "public",
  relatedEntity,
  relatedEntityId,
  onUploaded,
}: {
  /** Every file in this batch gets the same folder, if set. */
  folder?: string | null;
  visibility?: MediaVisibility;
  relatedEntity?: string | null;
  relatedEntityId?: string | null;
  onUploaded: (assets: MediaLibraryAsset[]) => void;
}) {
  const t = useTranslations("Admin.media.upload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const transport = useMemo(
    () =>
      createMediaTransport({
        folder,
        visibility,
        relatedEntity,
        relatedEntityId,
        dimensionsFor: async (file) => {
          if (!file.type.startsWith("image/")) return {};
          try {
            const optimized = await optimizeImage(file);
            return { width: optimized.width, height: optimized.height, placeholder: optimized.placeholder };
          } catch {
            return {};
          }
        },
      }),
    [folder, visibility, relatedEntity, relatedEntityId],
  );

  const checkProcessing = useCallback(async (assetId: string) => {
    const status = await getMediaAssetStatusAction(assetId);
    if (!status) return null;
    if (status.processingStatus === "completed" || status.processingStatus === "skipped") {
      return { ready: true };
    }
    if (status.processingStatus === "failed") {
      return { ready: false, message: undefined };
    }
    return null;
  }, []);

  const handleReady = useCallback(
    (assetId: string) => {
      void getMediaByIdAction(assetId).then((asset) => {
        if (asset) {
          toast.success(t("toasts.uploaded", { count: 1 }));
          onUploaded([asset]);
        }
      });
    },
    [onUploaded, t],
  );

  const { snapshots, addFiles, pause, resume, retry, cancel, dismiss, canPause } = useUploads({
    transport,
    checkProcessing,
    onReady: handleReady,
  });

  function handleFiles(files: FileList | File[]) {
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (!MEDIA_ACCEPTED_MIME_TYPES.includes(file.type)) {
        toast.error(t("unsupportedType"));
        continue;
      }
      if (file.size > maxSizeForMime(file.type)) {
        toast.error(t("tooLarge"));
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) addFiles(accepted);
  }

  function stateLine(snapshot: UploadSnapshot): string {
    if (snapshot.state === "uploading") {
      const parts = [`${formatBytes(snapshot.uploadedBytes)} / ${formatBytes(snapshot.totalBytes)}`];
      if (snapshot.speedBps > 0) parts.push(`${formatBytes(snapshot.speedBps)}/s`);
      if (snapshot.etaSeconds !== null) parts.push(t("eta", { time: formatEta(snapshot.etaSeconds) }));
      return parts.join(" · ");
    }
    if (snapshot.state === "error") return snapshot.errorMessage ?? t("states.error");
    if (snapshot.state === "ready" && snapshot.duplicate) return t("states.duplicate");
    return t(`states.${snapshot.state}`);
  }

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") inputRef.current?.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (event.dataTransfer.files.length > 0) handleFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors motion-reduce:transition-none ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <motion.span animate={isDragging ? { scale: 1.1 } : { scale: 1 }}>
          <UploadCloud aria-hidden="true" className="size-8 text-muted-foreground" />
        </motion.span>
        <p className="text-sm font-medium text-foreground">{t("dropzoneTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("dropzoneHint")}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MEDIA_ACCEPTED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            if (event.target.files && event.target.files.length > 0) handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {snapshots.length > 0 && (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {snapshots.map((snapshot) => {
              const active = ACTIVE_STATES.includes(snapshot.state);
              return (
                <motion.li
                  key={snapshot.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden rounded-xl border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                      {snapshot.state === "ready" ? (
                        snapshot.duplicate ? (
                          <Copy aria-hidden="true" className="size-5 text-primary" />
                        ) : (
                          <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-500" />
                        )
                      ) : snapshot.state === "error" ? (
                        <AlertCircle aria-hidden="true" className="size-5 text-destructive" />
                      ) : snapshot.state === "processing" ? (
                        <Settings2 aria-hidden="true" className="size-5 animate-spin text-primary [animation-duration:3s]" />
                      ) : active ? (
                        <Loader2 aria-hidden="true" className="size-5 animate-spin text-muted-foreground" />
                      ) : (
                        <FileText aria-hidden="true" className="size-5 text-muted-foreground" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{snapshot.fileName}</p>
                      <p className="truncate text-xs tabular-nums text-muted-foreground">{stateLine(snapshot)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {snapshot.state === "uploading" && canPause(snapshot.id) && (
                        <Button type="button" size="icon" variant="ghost" aria-label={t("actions.pause")} onClick={() => pause(snapshot.id)}>
                          <Pause className="size-4" />
                        </Button>
                      )}
                      {snapshot.state === "paused" && (
                        <Button type="button" size="icon" variant="ghost" aria-label={t("actions.resume")} onClick={() => resume(snapshot.id)}>
                          <Play className="size-4" />
                        </Button>
                      )}
                      {snapshot.state === "error" && (
                        <Button type="button" size="icon" variant="ghost" aria-label={t("actions.retry")} onClick={() => retry(snapshot.id)}>
                          <RotateCcw className="size-4" />
                        </Button>
                      )}
                      {(active || snapshot.state === "paused") && (
                        <Button type="button" size="icon" variant="ghost" aria-label={t("actions.cancel")} onClick={() => cancel(snapshot.id)}>
                          <X className="size-4" />
                        </Button>
                      )}
                      {(snapshot.state === "ready" || snapshot.state === "error" || snapshot.state === "canceled") && (
                        <Button type="button" size="icon" variant="ghost" aria-label={t("actions.dismiss")} onClick={() => dismiss(snapshot.id)}>
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {(active || snapshot.state === "paused" || snapshot.state === "processing") && (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        className={`h-full rounded-full bg-primary ${snapshot.state === "processing" ? "animate-pulse" : ""}`}
                        animate={{ width: `${snapshot.state === "processing" ? 100 : snapshot.percent}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                      />
                    </div>
                  )}
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
