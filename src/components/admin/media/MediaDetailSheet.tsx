"use client";

import { useEffect, useState } from "react";
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
              <MediaThumbnail url={asset.url} alt={asset.alt?.en ?? ""} fileType={asset.fileType} />
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
