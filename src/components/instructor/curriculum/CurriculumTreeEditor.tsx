"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/EmptyState";
import { CurriculumModuleRow } from "@/components/instructor/curriculum/CurriculumModuleRow";
import { ModuleFormSheet } from "@/components/instructor/curriculum/ModuleFormSheet";
import { LessonFormSheet } from "@/components/instructor/curriculum/LessonFormSheet";
import { reorderOwnModulesAction, deleteOwnModuleAction } from "@/learning/actions/module.actions";
import { reorderOwnLessonsAction, deleteOwnLessonAction } from "@/learning/actions/lesson.actions";
import { resolveLocalizedText } from "@/cms/utils/resolve-localized";
import type { CurriculumModule } from "@/learning/types/curriculum";
import type { Lesson } from "@/learning/types/lesson";
import type { Locale } from "@/i18n/routing";

type DragItemData = { type: "module" } | { type: "lesson"; moduleId: string };

/**
 * The Curriculum Builder's tree (`/instructor/courses/[id]/curriculum`,
 * Phase 6, Step 6.4) — one `DndContext` for the whole tree, with a
 * top-level `SortableContext` for modules and one nested `SortableContext`
 * per module for its own lessons (`CurriculumModuleRow`). `onDragEnd`
 * inspects the dragged item's tagged `data.type` to decide which reorder
 * action to fire; a lesson can only be dropped within its own module's
 * list (cross-module moves aren't supported this step).
 *
 * `editable` is `false` once the course is no longer `draft` — the tree
 * still renders (an Instructor can review what they built), but every
 * drag handle/Add/Edit/Delete affordance is hidden; the Server Actions
 * would reject the mutation anyway (`requireOwnCourseAccess`'s
 * `requireDraft`), this just avoids offering a guaranteed-to-fail
 * action.
 */
export function CurriculumTreeEditor({
  courseId,
  initialModules,
  editable,
  quizHrefBase,
}: {
  courseId: string;
  initialModules: CurriculumModule[];
  editable: boolean;
  /** Base route (minus the trailing lesson id) that a `"quiz"` lesson row
   *  links into — the caller builds it for its own workspace (the
   *  instructor id-based route or the public slug-based course pages), so
   *  the tree renders identically in both. */
  quizHrefBase: string;
}) {
  const t = useTranslations("Instructor.curriculum");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [modules, setModules] = useState(initialModules);
  const [savingOrder, setSavingOrder] = useState(false);

  // `router.refresh()` re-runs the Server Component and hands down a new
  // `initialModules`, but a `useState` initializer only seeds *once* —
  // without this, canonical post-refresh data (after a create/edit/
  // delete/reorder) would never actually reach this component's own
  // local copy, the same "resync local state from server-provided
  // props" pattern `CoursesManager`/`InstructorCoursesManager` already
  // use for their own filter state.
  useEffect(() => {
    setModules(initialModules);
  }, [initialModules]);

  const [moduleSheet, setModuleSheet] = useState<{ open: boolean; module: CurriculumModule | null }>({
    open: false,
    module: null,
  });
  const [lessonSheet, setLessonSheet] = useState<{ open: boolean; moduleId: string; lesson: Lesson | null }>({
    open: false,
    moduleId: "",
    lesson: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function refresh() {
    router.refresh();
  }

  // Drag-reorders are STAGED locally, not fired per drop — the sticky
  // "unsaved changes" bar below persists (or discards) the whole
  // arrangement in one go. Create/edit/delete stay immediate: they run
  // through their own sheets/confirms and refresh the canonical tree
  // (which also resyncs any staged-but-unsaved order — deliberate:
  // structural edits mid-reorder reset to server truth).
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as DragItemData | undefined;
    if (!activeData) return;

    if (activeData.type === "module") {
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      setModules(arrayMove(modules, oldIndex, newIndex));
      return;
    }

    const overData = over.data.current as DragItemData | undefined;
    if (!overData || overData.type !== "lesson" || overData.moduleId !== activeData.moduleId) return;

    const moduleIndex = modules.findIndex((m) => m.id === activeData.moduleId);
    if (moduleIndex === -1) return;
    const lessons = modules[moduleIndex].lessons;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const nextModules = [...modules];
    nextModules[moduleIndex] = { ...nextModules[moduleIndex], lessons: arrayMove(lessons, oldIndex, newIndex) };
    setModules(nextModules);
  }

  const orderDirty =
    modules.map((m) => m.id).join(",") !== initialModules.map((m) => m.id).join(",") ||
    modules.some((m) => {
      const original = initialModules.find((candidate) => candidate.id === m.id);
      return (
        original &&
        m.lessons.map((l) => l.id).join(",") !== original.lessons.map((l) => l.id).join(",")
      );
    });

  async function saveOrder() {
    setSavingOrder(true);
    try {
      const failures: string[] = [];
      if (modules.map((m) => m.id).join(",") !== initialModules.map((m) => m.id).join(",")) {
        const result = await reorderOwnModulesAction({ courseId, moduleIds: modules.map((m) => m.id) });
        if (!result.success) failures.push(result.message);
      }
      for (const currentModule of modules) {
        const original = initialModules.find((candidate) => candidate.id === currentModule.id);
        if (!original) continue;
        const currentOrder = currentModule.lessons.map((l) => l.id).join(",");
        if (currentOrder === original.lessons.map((l) => l.id).join(",")) continue;
        const result = await reorderOwnLessonsAction({
          moduleId: currentModule.id,
          lessonIds: currentModule.lessons.map((l) => l.id),
        });
        if (!result.success) failures.push(result.message);
      }
      if (failures.length > 0) {
        toast.error(failures[0]);
      } else {
        toast.success(t("toasts.orderSaved"));
      }
      refresh();
    } finally {
      setSavingOrder(false);
    }
  }

  function discardOrder() {
    setModules(initialModules);
  }

  function handleDeleteModule(module: CurriculumModule) {
    if (!window.confirm(t("confirmDeleteModule", { title: resolveLocalizedText(module.title, locale) }))) return;
    startDeleteModule(module.id);
  }

  async function startDeleteModule(moduleId: string) {
    const result = await deleteOwnModuleAction(moduleId);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(t("toasts.moduleDeleted"));
    setModules((prev) => prev.filter((m) => m.id !== moduleId));
    refresh();
  }

  function handleDeleteLesson(lesson: Lesson) {
    if (!window.confirm(t("confirmDeleteLesson", { title: resolveLocalizedText(lesson.title, locale) }))) return;
    startDeleteLesson(lesson);
  }

  async function startDeleteLesson(lesson: Lesson) {
    const result = await deleteOwnLessonAction(lesson.id);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success(t("toasts.lessonDeleted"));
    setModules((prev) =>
      prev.map((m) => (m.id === lesson.moduleId ? { ...m, lessons: m.lessons.filter((l) => l.id !== lesson.id) } : m)),
    );
    refresh();
  }

  return (
    <div className="space-y-4">
      {editable && orderDirty && (
        <div className="sticky top-2 z-20 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card/95 px-3 py-2 shadow-md backdrop-blur">
          <span className="text-sm text-foreground">{t("unsavedOrder")}</span>
          <span className="flex-1" />
          <Button type="button" size="sm" variant="ghost" disabled={savingOrder} onClick={discardOrder}>
            {t("discardOrder")}
          </Button>
          <Button type="button" size="sm" disabled={savingOrder} onClick={() => void saveOrder()}>
            {savingOrder ? t("savingOrder") : t("saveChanges")}
          </Button>
        </div>
      )}

      {modules.length === 0 ? (
        <EmptyState
          title={t("emptyTitle")}
          description={t("emptyDescription")}
          action={
            editable ? (
              <Button type="button" size="sm" onClick={() => setModuleSheet({ open: true, module: null })}>
                <Plus aria-hidden="true" />
                {t("addModule")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {modules.map((module) => (
                <CurriculumModuleRow
                  key={module.id}
                  module={module}
                  editable={editable}
                  onEditModule={() => setModuleSheet({ open: true, module })}
                  onDeleteModule={() => handleDeleteModule(module)}
                  onAddLesson={() => setLessonSheet({ open: true, moduleId: module.id, lesson: null })}
                  onEditLesson={(lesson) => setLessonSheet({ open: true, moduleId: module.id, lesson })}
                  onDeleteLesson={handleDeleteLesson}
                  quizHrefBase={quizHrefBase}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editable && modules.length > 0 && (
        <Button type="button" variant="outline" onClick={() => setModuleSheet({ open: true, module: null })}>
          <Plus aria-hidden="true" />
          {t("addModule")}
        </Button>
      )}

      <ModuleFormSheet
        open={moduleSheet.open}
        onOpenChange={(open) => setModuleSheet((prev) => ({ ...prev, open }))}
        courseId={courseId}
        module={moduleSheet.module}
        onSaved={refresh}
      />
      <LessonFormSheet
        open={lessonSheet.open}
        onOpenChange={(open) => setLessonSheet((prev) => ({ ...prev, open }))}
        courseId={courseId}
        moduleId={lessonSheet.moduleId}
        lesson={lessonSheet.lesson}
        onSaved={refresh}
      />
    </div>
  );
}
