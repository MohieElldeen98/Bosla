"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { optionalLocalizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { updateMediaAction, deleteMediaAction } from "@/cms/actions/media.actions";
import { getMediaAssetStatusAction } from "@/media/actions/media-upload.actions";
import { ResumableUpload, type UploadSnapshot } from "@/media/upload/engine";
import { createMediaTransport } from "@/media/upload/media-transport";
import { optimizeImage } from "@/cms/utils/optimize-image";
import type { MediaLibraryAsset } from "@/cms/types/media-library";

const detailFormSchema = z.object({
  title: optionalLocalizedTextSchema,
  alt: optionalLocalizedTextSchema,
  caption: optionalLocalizedTextSchema,
  description: optionalLocalizedTextSchema,
  tagsText: z.string(),
  folder: z.string().trim().max(64).nullable().optional(),
});
type DetailFormValues = z.infer<typeof detailFormSchema>;

function toFormValues(asset: MediaLibraryAsset): DetailFormValues {
  return {
    title: asset.title ?? undefined,
    alt: asset.alt ?? undefined,
    caption: asset.caption ?? undefined,
    description: asset.description ?? undefined,
    tagsText: asset.tags.join(", "),
    folder: asset.folder,
  };
}

/**
 * The Media Library's edit/rename/delete/copy-URL panel (Phase 7, Step
 * 7.1) — "rename" is just this same form's `title` field (see
 * `renameMediaAssetSchema`'s doc comment), not a separate flow, so
 * everything here goes through the one `updateMediaAction` call.
 * `folder` list comes from the caller (already fetched once for the
 * whole page) via a native `<datalist>` rather than a new Combobox
 * instance, matching this step's "reuse existing primitives" scope.
 */
export function MediaDetailSheet({
  open,
  onOpenChange,
  asset,
  folders,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: MediaLibraryAsset | null;
  folders: string[];
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const t = useTranslations("Admin.media.detail");
  const [isDeleting, setIsDeleting] = useState(false);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replaceSnapshot, setReplaceSnapshot] = useState<UploadSnapshot | null>(null);

  // Poll processing state after a replacement's bytes land, then hand
  // the refreshed asset back to the page.
  useEffect(() => {
    if (!asset || replaceSnapshot?.state !== "processing") return undefined;
    const interval = window.setInterval(() => {
      void getMediaAssetStatusAction(asset.id).then((status) => {
        if (!status) return;
        if (status.processingStatus === "completed" || status.processingStatus === "skipped") {
          window.clearInterval(interval);
          setReplaceSnapshot(null);
          toast.success(t("toasts.replaced"));
          onOpenChange(false);
          onSaved();
        } else if (status.processingStatus === "failed") {
          window.clearInterval(interval);
          setReplaceSnapshot(null);
          toast.error(t("toasts.replaceFailed"));
          onSaved();
        }
      });
    }, 4000);
    return () => window.clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replaceSnapshot?.state, asset?.id]);

  function startReplace(file: File) {
    if (!asset) return;
    const upload = new ResumableUpload(file, {
      transport: createMediaTransport({
        replaceAssetId: asset.id,
        visibility: asset.visibility,
        dimensionsFor: async (candidate) => {
          if (!candidate.type.startsWith("image/")) return {};
          try {
            const optimized = await optimizeImage(candidate);
            return { width: optimized.width, height: optimized.height, placeholder: optimized.placeholder };
          } catch {
            return {};
          }
        },
      }),
      title: file.name,
      onChange: (snapshot) => {
        setReplaceSnapshot(snapshot);
        if (snapshot.state === "error") toast.error(snapshot.errorMessage ?? t("toasts.replaceFailed"));
      },
    });
    void upload.start();
  }

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DetailFormValues>({
    resolver: zodResolver(detailFormSchema),
    defaultValues: asset ? toFormValues(asset) : undefined,
  });

  useEffect(() => {
    if (open && asset) reset(toFormValues(asset));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset?.id]);

  if (!asset) return null;

  async function onSubmit(values: DetailFormValues) {
    const tags = values.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    const result = await updateMediaAction(
      asset!.id,
      {
        title: values.title,
        alt: values.alt,
        caption: values.caption,
        description: values.description,
        tags,
        folder: values.folder || null,
      },
      asset!.updatedAt,
    );
    if (!result.success) {
      toast.error(result.message);
      if (result.code === "conflict") {
        onOpenChange(false);
        onSaved();
      }
      return;
    }
    toast.success(t("toasts.saved"));
    onOpenChange(false);
    onSaved();
  }

  async function handleDelete() {
    if (!window.confirm(t("confirmDelete"))) return;
    setIsDeleting(true);
    const result = await deleteMediaAction(asset!.id);
    setIsDeleting(false);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(t("toasts.deleted"));
    onOpenChange(false);
    onDeleted();
  }

  function copyUrl() {
    navigator.clipboard.writeText(asset!.url).then(
      () => toast.success(t("toasts.urlCopied")),
      () => toast.error(t("toasts.urlCopyFailed")),
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="data-[side=right]:sm:max-w-md">
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{t("title")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <div className="aspect-video w-full overflow-hidden rounded-lg bg-muted">
              <MediaThumbnail
                url={asset.url}
                thumbnailUrl={asset.thumbnailKey ? `/api/media/${asset.id}/thumbnail` : null}
                alt={asset.alt?.en ?? ""}
                fileType={asset.fileType}
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={replaceSnapshot !== null}
                onClick={() => replaceInputRef.current?.click()}
              >
                {replaceSnapshot
                  ? replaceSnapshot.state === "processing"
                    ? t("replacing")
                    : `${Math.round(replaceSnapshot.percent)}%`
                  : t("replace")}
              </Button>
              <input
                ref={replaceInputRef}
                type="file"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) startReplace(file);
                  event.target.value = "";
                }}
              />
              <p className="text-xs text-muted-foreground">{t("replaceHint")}</p>
            </div>

            <div className="flex items-center gap-2">
              <Input readOnly dir="ltr" value={asset.url} className="text-xs" />
              <Button type="button" variant="outline" size="icon-sm" aria-label={t("copyUrl")} onClick={copyUrl}>
                <Copy aria-hidden="true" className="size-4" />
              </Button>
            </div>

            <LocalizedTextField id="media-title" label={t("titleLabel")} name="title" register={register} errors={errors} />
            <LocalizedTextField id="media-alt" label={t("altLabel")} name="alt" register={register} errors={errors} />
            <LocalizedTextField id="media-caption" label={t("captionLabel")} name="caption" register={register} errors={errors} />
            <LocalizedTextField
              id="media-description"
              label={t("descriptionLabel")}
              name="description"
              register={register}
              errors={errors}
              multiline
            />

            <div className="space-y-1.5">
              <Label htmlFor="media-tags">{t("tagsLabel")}</Label>
              <Input id="media-tags" {...register("tagsText")} placeholder={t("tagsPlaceholder")} />
              <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="media-folder">{t("folderLabel")}</Label>
              <Input id="media-folder" list="media-folder-suggestions" {...register("folder")} placeholder={t("folderPlaceholder")} />
              <datalist id="media-folder-suggestions">
                {folders.map((folder) => (
                  <option key={folder} value={folder} />
                ))}
              </datalist>
            </div>
          </div>
          <SheetFooter>
            <div className="flex items-center justify-between gap-2">
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? t("deleting") : t("delete")}
              </Button>
              <LoadingButton type="submit" isLoading={isSubmitting} disabled={isSubmitting}>
                {isSubmitting ? t("saving") : t("save")}
              </LoadingButton>
            </div>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
