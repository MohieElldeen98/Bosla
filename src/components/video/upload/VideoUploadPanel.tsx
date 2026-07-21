"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2, CloudUpload, FileVideo, Loader2, Pause, Play, RotateCcw, Settings2, X, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getLessonVideoAction, getVideoStatusAction, isVideoStorageConfiguredAction } from "@/video/actions/video.actions";
import { useUploads } from "@/media/upload/useUploads";
import { createVideoTransport } from "./video-transport";
import type { Video } from "@/video/types/video";
import type { UploadSnapshot, UploadState } from "@/media/upload/engine";

/**
 * Phase 8 — the instructor-facing upload experience: drag & drop (multi-
 * file), per-upload progress/speed/ETA with pause/resume/cancel/retry,
 * processing status, and a graceful "not configured" placeholder when the
 * deployment has no VIDEO_STORAGE_* credentials (Phase 9). Rendered
 * inside the Curriculum Builder's lesson sheet for `type: "video"`
 * lessons that already exist (an upload needs a lesson id to attach to).
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
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `0:${String(seconds).padStart(2, "0")}`;
}

const ACTIVE_STATES: UploadState[] = ["starting", "uploading", "completing"];

/** Browser-side duration read — instant form auto-fill the moment a file
 *  is dropped. Best-effort: the pipeline's ffprobe value is the truth
 *  and overwrites the lesson later; this just saves the instructor from
 *  typing it. */
function readFileDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    const finish = (value: number | null) => {
      URL.revokeObjectURL(url);
      resolve(value);
    };
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) ? Math.round(video.duration) : null);
    video.onerror = () => finish(null);
    video.preload = "metadata";
    video.src = url;
  });
}

function UploadRow({
  snapshot,
  onPause,
  onResume,
  onRetry,
  onCancel,
  onDismiss,
}: {
  snapshot: UploadSnapshot;
  onPause: () => void;
  onResume: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  const t = useTranslations("Instructor.curriculum.videoUpload");
  const active = ACTIVE_STATES.includes(snapshot.state);
  const barColor =
    snapshot.state === "error"
      ? "bg-destructive"
      : snapshot.state === "ready"
        ? "bg-emerald-500"
        : "bg-primary";

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className="overflow-hidden rounded-xl border bg-card p-3"
    >
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          {snapshot.state === "ready" ? (
            <CheckCircle2 aria-hidden="true" className="size-5 text-emerald-500" />
          ) : snapshot.state === "error" ? (
            <XCircle aria-hidden="true" className="size-5 text-destructive" />
          ) : snapshot.state === "processing" ? (
            <Settings2 aria-hidden="true" className="size-5 animate-spin text-primary [animation-duration:3s]" />
          ) : (
            <FileVideo aria-hidden="true" className="size-5 text-muted-foreground" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{snapshot.fileName}</p>
          <p className="truncate text-xs tabular-nums text-muted-foreground">
            {snapshot.state === "uploading" && (
              <>
                {formatBytes(snapshot.uploadedBytes)} / {formatBytes(snapshot.totalBytes)}
                {snapshot.speedBps > 0 && <> · {formatBytes(snapshot.speedBps)}/s</>}
                {snapshot.etaSeconds !== null && <> · {t("eta", { time: formatEta(snapshot.etaSeconds) })}</>}
              </>
            )}
            {snapshot.state === "error" && (snapshot.errorMessage ?? t("states.error"))}
            {snapshot.state !== "uploading" && snapshot.state !== "error" && t(`states.${snapshot.state}`)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {snapshot.state === "uploading" && (
            <Button type="button" size="icon" variant="ghost" aria-label={t("actions.pause")} onClick={onPause}>
              <Pause className="size-4" />
            </Button>
          )}
          {snapshot.state === "paused" && (
            <Button type="button" size="icon" variant="ghost" aria-label={t("actions.resume")} onClick={onResume}>
              <Play className="size-4" />
            </Button>
          )}
          {snapshot.state === "error" && (
            <Button type="button" size="icon" variant="ghost" aria-label={t("actions.retry")} onClick={onRetry}>
              <RotateCcw className="size-4" />
            </Button>
          )}
          {(active || snapshot.state === "paused") && (
            <Button type="button" size="icon" variant="ghost" aria-label={t("actions.cancel")} onClick={onCancel}>
              <X className="size-4" />
            </Button>
          )}
          {(snapshot.state === "ready" || snapshot.state === "error" || snapshot.state === "canceled") && (
            <Button type="button" size="icon" variant="ghost" aria-label={t("actions.dismiss")} onClick={onDismiss}>
              <X className="size-4" />
            </Button>
          )}
        </div>
      </div>
      {(active || snapshot.state === "paused" || snapshot.state === "processing") && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <motion.div
            className={`h-full rounded-full ${barColor} ${snapshot.state === "processing" ? "animate-pulse" : ""}`}
            animate={{ width: `${snapshot.state === "processing" ? 100 : snapshot.percent}%` }}
            transition={{ ease: "easeOut", duration: 0.3 }}
          />
        </div>
      )}
    </motion.li>
  );
}

export function VideoUploadPanel({
  courseId,
  lessonId,
  disabled,
  onVideoIdChange,
  onDurationDetected,
}: {
  courseId: string;
  /** `null` while creating a lesson — the upload starts unattached and
   *  the form attaches it right after the lesson row is created. */
  lessonId: string | null;
  disabled?: boolean;
  /** Reports the newest upload's server-side video id (as soon as the
   *  session exists, not only when processing finishes) so the create
   *  flow can attach it at save time. */
  onVideoIdChange?: (videoId: string | null) => void;
  /** Fires with the dropped file's duration (seconds, browser-read) so
   *  the lesson form can auto-fill its Duration field instantly. */
  onDurationDetected?: (seconds: number) => void;
}) {
  const t = useTranslations("Instructor.curriculum.videoUpload");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);

  const refreshCurrent = useCallback(() => {
    if (!lessonId) return;
    void getLessonVideoAction(courseId, lessonId).then((result) => {
      if (result.success) setCurrentVideo(result.data);
    });
  }, [courseId, lessonId]);

  useEffect(() => {
    void isVideoStorageConfiguredAction().then(setConfigured);
    refreshCurrent();
  }, [refreshCurrent]);

  const transport = useMemo(() => createVideoTransport({ courseId, lessonId }), [courseId, lessonId]);
  const checkProcessing = useCallback(async (remoteId: string) => {
    const result = await getVideoStatusAction(remoteId);
    if (!result.success) return null;
    if (result.data.status === "ready") return { ready: true };
    if (result.data.status === "failed") {
      return { ready: false, message: result.data.processingError ?? undefined };
    }
    return null;
  }, []);
  const { snapshots, addFiles, pause, resume, retry, cancel, dismiss } = useUploads({
    transport,
    checkProcessing,
    onReady: refreshCurrent,
  });

  function handleFiles(files: FileList) {
    if (onDurationDetected && files.length > 0) {
      void readFileDuration(files[0]).then((seconds) => {
        if (seconds !== null && seconds > 0) onDurationDetected(seconds);
      });
    }
    addFiles(files);
  }

  useEffect(() => {
    if (!onVideoIdChange) return;
    const usable = [...snapshots]
      .reverse()
      .find((entry) => entry.remoteId && entry.state !== "canceled" && entry.state !== "error");
    onVideoIdChange(usable?.remoteId ?? null);
  }, [snapshots, onVideoIdChange]);

  if (configured === null) {
    return (
      <div className="flex items-center gap-2 rounded-xl border p-4 text-sm text-muted-foreground">
        <Loader2 aria-hidden="true" className="size-4 animate-spin" />
        {t("checking")}
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="rounded-xl border border-dashed p-4">
        <p className="text-sm font-medium text-foreground">{t("notConfiguredTitle")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("notConfiguredDescription")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {currentVideo && (
        <div className="flex items-center gap-2 rounded-xl border bg-muted/40 p-3 text-xs">
          <FileVideo aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-foreground">{currentVideo.title}</span>
          <span className="shrink-0 text-muted-foreground">
            {currentVideo.status === "ready"
              ? t("current.ready")
              : currentVideo.status === "failed"
                ? t("current.failed")
                : t("current.processing")}
          </span>
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          if (!disabled && event.dataTransfer.files.length > 0) handleFiles(event.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors motion-reduce:transition-none ${
          dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <motion.span animate={dragOver ? { scale: 1.1 } : { scale: 1 }}>
          <CloudUpload aria-hidden="true" className="size-8 text-muted-foreground" />
        </motion.span>
        <span className="text-sm font-medium text-foreground">{t("dropTitle")}</span>
        <span className="text-xs text-muted-foreground">{t("dropHint")}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
        multiple
        hidden
        onChange={(event) => {
          if (event.target.files?.length) handleFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {snapshots.length > 0 && (
        <ul className="space-y-2">
          <AnimatePresence initial={false}>
            {snapshots.map((snapshot) => (
              <UploadRow
                key={snapshot.id}
                snapshot={snapshot}
                onPause={() => pause(snapshot.id)}
                onResume={() => resume(snapshot.id)}
                onRetry={() => retry(snapshot.id)}
                onCancel={() => cancel(snapshot.id)}
                onDismiss={() => dismiss(snapshot.id)}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
