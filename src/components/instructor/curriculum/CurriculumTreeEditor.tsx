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
}: {
  courseId: string;
  initialModules: CurriculumModule[];
  editable: boolean;
}) {
  const t = useTranslations("Instructor.curriculum");
  const locale = useLocale() as Locale;
  const router = useRouter();

  const [modules, setModules] = useState(initialModules);

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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const activeData = active.data.current as DragItemData | undefined;
    if (!activeData) return;

    if (activeData.type === "module") {
      const oldIndex = modules.findIndex((m) => m.id === active.id);
      const newIndex = modules.findIndex((m) => m.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(modules, oldIndex, newIndex);
      setModules(reordered);
      const result = await reorderOwnModulesAction({ courseId, moduleIds: reordered.map((m) => m.id) });
      if (!result.success) {
        toast.error(result.message);
        refresh();
      }
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

    const reorderedLessons = arrayMove(lessons, oldIndex, newIndex);
    const nextModules = [...modules];
    nextModules[moduleIndex] = { ...nextModules[moduleIndex], lessons: reorderedLessons };
    setModules(nextModules);

    const result = await reorderOwnLessonsAction({
      moduleId: activeData.moduleId,
      lessonIds: reorderedLessons.map((l) => l.id),
    });
    if (!result.success) {
      toast.error(result.message);
      refresh();
    }
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
                  courseId={courseId}
                  module={module}
                  editable={editable}
                  onEditModule={() => setModuleSheet({ open: true, module })}
                  onDeleteModule={() => handleDeleteModule(module)}
                  onAddLesson={() => setLessonSheet({ open: true, moduleId: module.id, lesson: null })}
                  onEditLesson={(lesson) => setLessonSheet({ open: true, moduleId: module.id, lesson })}
                  onDeleteLesson={handleDeleteLesson}
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
        moduleId={lessonSheet.moduleId}
        lesson={lessonSheet.lesson}
        onSaved={refresh}
      />
    </div>
  );
}
