"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { Button } from "@/components/ui/button";
import { LocalizedTextField } from "@/components/admin/homepage/LocalizedTextField";
import { localizedTextSchema } from "@/cms/validators/content-blocks.validator";
import { createOwnModuleAction, updateOwnModuleAction } from "@/learning/actions/module.actions";
import type { CurriculumModule } from "@/learning/types/curriculum";

const moduleFormSchema = z.object({ title: localizedTextSchema });
type ModuleFormValues = z.infer<typeof moduleFormSchema>;

/**
 * Create/Edit Module (Curriculum Builder, Phase 6, Step 6.4) — reuses
 * `Sheet` (already built on `@base-ui/react/dialog`, previously unused)
 * rather than a new modal primitive, and `LocalizedTextField` from the
 * Homepage/Course Editor infra as-is for the one bilingual field a
 * module has. `courseId`/`position` are never form fields — `courseId`
 * is fixed by the page this is rendered on, `position` only ever
 * changes through drag reordering.
 */
export function ModuleFormSheet({
  open,
  onOpenChange,
  courseId,
  module: editingModule,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  module: CurriculumModule | null;
  onSaved: () => void;
}) {
  const t = useTranslations("Instructor.curriculum.moduleForm");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleFormSchema),
    defaultValues: { title: { en: "", ar: "" } },
  });

  useEffect(() => {
    if (open) {
      reset({ title: editingModule ? editingModule.title : { en: "", ar: "" } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingModule?.id]);

  async function onSubmit(values: ModuleFormValues) {
    const result = editingModule
      ? await updateOwnModuleAction(editingModule.id, values, editingModule.updatedAt)
      : await createOwnModuleAction({ courseId, title: values.title });

    if (!result.success) {
      toast.error(result.message);
      if (result.code === "conflict") {
        onOpenChange(false);
        onSaved();
      }
      return;
    }
    toast.success(editingModule ? t("toasts.updated") : t("toasts.created"));
    onOpenChange(false);
    onSaved();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex h-full flex-col">
          <SheetHeader>
            <SheetTitle>{editingModule ? t("editTitle") : t("createTitle")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4">
            <LocalizedTextField id="module-title" label={t("titleLabel")} name="title" register={register} errors={errors} />
          </div>
          <SheetFooter>
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t("cancel")}
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
