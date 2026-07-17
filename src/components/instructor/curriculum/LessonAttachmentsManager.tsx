"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Paperclip, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import {
  createOwnLessonAttachmentAction,
  deleteOwnLessonAttachmentAction,
  listLessonAttachmentsAction,
  updateOwnLessonAttachmentAction,
} from "@/learning/actions/lesson-attachment.actions";
import type { LessonAttachment } from "@/learning/types/lesson-attachment";

/**
 * The lesson form's Attachments section — self-contained on purpose:
 * attachments are their own rows with their own actions, not lesson
 * columns, so they save independently of the sheet's single lesson
 * submit (and only exist once the lesson does — the sheet mounts this
 * for EDIT only). Files come from the Media Library via MediaPicker;
 * picking one creates the attachment immediately, titled after nothing —
 * the two title inputs save on blur.
 */
export function LessonAttachmentsManager({ lessonId }: { lessonId: string }) {
  const t = useTranslations("Instructor.curriculum.lessonForm.attachments");
  const [attachments, setAttachments] = useState<LessonAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    void listLessonAttachmentsAction(lessonId).then((rows) => {
      if (cancelled) return;
      setAttachments(rows);
      setIsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [lessonId]);

  async function handleAdd(mediaAssetId: string | null) {
    if (!mediaAssetId) return;
    const result = await createOwnLessonAttachmentAction({
      lessonId,
      mediaAssetId,
      title: { en: t("defaultTitle"), ar: t("defaultTitle") },
      position: attachments.length,
    });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setAttachments((current) => [...current, result.data]);
    toast.success(t("added"));
  }

  async function handleTitleBlur(attachment: LessonAttachment, lang: "en" | "ar", value: string) {
    const nextTitle = { ...attachment.title, [lang]: value };
    if (nextTitle[lang] === attachment.title[lang]) return;
    const result = await updateOwnLessonAttachmentAction(attachment.id, { title: nextTitle });
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setAttachments((current) => current.map((row) => (row.id === attachment.id ? result.data : row)));
  }

  async function handleDelete(id: string) {
    const result = await deleteOwnLessonAttachmentAction(id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    setAttachments((current) => current.filter((row) => row.id !== id));
    toast.success(t("removed"));
  }

  return (
    <div className="space-y-3 border-t border-border pt-4">
      <Label className="flex items-center gap-2">
        <Paperclip aria-hidden="true" className="size-4" />
        {t("label")}
      </Label>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      {isLoading ? (
        <div className="h-10 animate-pulse rounded-md bg-muted" aria-hidden="true" />
      ) : (
        attachments.length > 0 && (
          <ul className="space-y-3">
            {attachments.map((attachment) => (
              <li key={attachment.id} className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{t("rowTitle")}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("remove")}
                    onClick={() => handleDelete(attachment.id)}
                  >
                    <Trash2 aria-hidden="true" className="size-4" />
                  </Button>
                </div>
                <Input
                  defaultValue={attachment.title.en}
                  placeholder={t("titleEn")}
                  aria-label={t("titleEn")}
                  onBlur={(event) => handleTitleBlur(attachment, "en", event.target.value)}
                />
                <Input
                  defaultValue={attachment.title.ar}
                  placeholder={t("titleAr")}
                  aria-label={t("titleAr")}
                  dir="rtl"
                  onBlur={(event) => handleTitleBlur(attachment, "ar", event.target.value)}
                />
              </li>
            ))}
          </ul>
        )
      )}

      <MediaPicker value={null} onChange={handleAdd} accept={["pdf", "image"]} placeholderLabel={t("add")} />
    </div>
  );
}
