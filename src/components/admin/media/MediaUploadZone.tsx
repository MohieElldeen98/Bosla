"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { UploadCloud, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createMediaUploadUrlAction, registerMediaUploadAction } from "@/cms/actions/media.actions";
import { MEDIA_ACCEPTED_MIME_TYPES, MEDIA_BUCKET, MEDIA_MAX_FILE_SIZE_BYTES } from "@/cms/constants/storage";
import { createClient } from "@/lib/supabase/client";
import { optimizeImage } from "@/cms/utils/optimize-image";
import type { MediaLibraryAsset } from "@/cms/types/media-library";

interface QueuedFile {
  key: string;
  file: File;
  previewUrl: string | null;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

/** Reads video dimensions client-side. Dimensions are optional metadata,
 *  never a reason to block an otherwise-valid upload. */
function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  if (file.type.startsWith("video/")) {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);
      video.onloadedmetadata = () => {
        resolve({ width: video.videoWidth, height: video.videoHeight });
        URL.revokeObjectURL(url);
      };
      video.onerror = () => {
        resolve(null);
        URL.revokeObjectURL(url);
      };
      video.src = url;
    });
  }
  return Promise.resolve(null);
}

/**
 * Drag & drop + multi-file upload — shared by the admin Media Library
 * page and `MediaPicker`'s own "Upload new" section, so neither
 * reimplements dropzone/queue/progress handling separately. "Multiple
 * upload" is this component looping the signed-upload flow once per file
 * (sequentially — a real batch endpoint would only add complexity for
 * upload volumes this admin tool will ever see), not a batch Server
 * Action.
 */
export function MediaUploadZone({
  folder,
  onUploaded,
}: {
  /** Every file in this batch gets the same folder, if set — the
   *  common case (an admin uploading a set of images for one course
   *  into one folder) without a per-file folder picker. */
  folder?: string | null;
  onUploaded: (assets: MediaLibraryAsset[]) => void;
}) {
  const t = useTranslations("Admin.media.upload");
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const next: QueuedFile[] = Array.from(files).map((file) => ({
      key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      status: "pending",
    }));
    setQueue((prev) => [...prev, ...next]);
  }

  function removeQueued(key: string) {
    setQueue((prev) => prev.filter((item) => item.key !== key));
  }

  async function uploadAll() {
    setIsUploading(true);
    const uploaded: MediaLibraryAsset[] = [];

    for (const item of queue) {
      if (item.status === "done") continue;

      const optimized = await optimizeImage(item.file);
      setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, file: optimized.file } : q)));
      const file = optimized.file;

      if (!MEDIA_ACCEPTED_MIME_TYPES.includes(file.type)) {
        setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, status: "error", error: t("unsupportedType") } : q)));
        continue;
      }
      if (file.size > MEDIA_MAX_FILE_SIZE_BYTES) {
        setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, status: "error", error: t("tooLarge") } : q)));
        continue;
      }

      setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, status: "uploading" } : q)));

      try {
        const dimensions = file.type.startsWith("video/") ? await readDimensions(file) : null;
        const width = optimized.width ?? dimensions?.width;
        const height = optimized.height ?? dimensions?.height;
        const urlResult = await createMediaUploadUrlAction({ fileName: file.name, contentType: file.type, fileSize: file.size });
        if (!urlResult.success) throw new Error(urlResult.message);
        const supabase = createClient();
        const { error: uploadError } = await supabase.storage
          .from(MEDIA_BUCKET)
          .uploadToSignedUrl(urlResult.data.storagePath, urlResult.data.token, file, { contentType: file.type });
        if (uploadError) throw uploadError;
        const result = await registerMediaUploadAction({
          assetId: urlResult.data.assetId,
          storagePath: urlResult.data.storagePath,
          fileName: file.name,
          width,
          height,
          placeholder: optimized.placeholder,
          metadata: folder ? { folder } : undefined,
        });
        if (!result.success) throw new Error(result.message);
        setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, status: "done" } : q)));
        uploaded.push(result.data);
      } catch (error) {
        setQueue((prev) => prev.map((q) => (q.key === item.key ? { ...q, status: "error", error: error instanceof Error ? error.message : t("directUploadFailed") } : q)));
      }
    }

    setIsUploading(false);
    if (uploaded.length > 0) {
      toast.success(t("toasts.uploaded", { count: uploaded.length }));
      onUploaded(uploaded);
    }
  }

  const hasPending = queue.some((item) => item.status === "pending" || item.status === "error");

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
          if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
      >
        <UploadCloud aria-hidden="true" className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium text-foreground">{t("dropzoneTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("dropzoneHint")}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={MEDIA_ACCEPTED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            if (event.target.files && event.target.files.length > 0) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <div className="space-y-2">
          {queue.map((item) => (
            <div key={item.key} className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
              {item.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.previewUrl} alt="" className="size-10 shrink-0 rounded object-cover" />
              ) : (
                <div className="size-10 shrink-0 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{item.file.name}</p>
                <p className="text-xs text-muted-foreground">{(item.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                {item.status === "error" && <p className="text-xs text-destructive">{item.error}</p>}
              </div>
              {item.status === "uploading" && <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin text-muted-foreground" />}
              {item.status === "done" && <CheckCircle2 aria-hidden="true" className="size-4 shrink-0 text-primary" />}
              {item.status === "error" && <AlertCircle aria-hidden="true" className="size-4 shrink-0 text-destructive" />}
              {item.status !== "uploading" && item.status !== "done" && (
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t("remove")} onClick={() => removeQueued(item.key)}>
                  <X aria-hidden="true" className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {queue.length > 0 && (
        <div className="flex justify-end">
          <Button type="button" disabled={!hasPending || isUploading} onClick={uploadAll}>
            {isUploading ? t("uploading") : t("uploadAll", { count: queue.filter((q) => q.status !== "done").length })}
          </Button>
        </div>
      )}
    </div>
  );
}
