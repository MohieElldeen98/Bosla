"use client";

import { useEffect, useState } from "react";
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
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxIcon,
  ComboboxInput,
  ComboboxInputGroup,
  ComboboxItem,
} from "@/components/ui/combobox";
import { FeaturedInstructorRow, type FeaturedInstructorOption } from "@/components/admin/instructors/FeaturedInstructorRow";
import { setFeaturedInstructorsAction } from "@/courses/actions/instructor.actions";
import { useRouter } from "@/i18n/navigation";

const MAX_FEATURED = 4;

/**
 * The Featured Instructors picker — up to 4 instructors, searchable add,
 * drag-and-drop reorder (`@dnd-kit`, same pattern as
 * `CurriculumTreeEditor`), staged locally and saved explicitly (not one
 * mutation per drag). Writes straight to `instructors.is_featured`/
 * `display_order` via `setFeaturedInstructorsAction` — this panel is the
 * only place in the Admin Panel that edits those two columns.
 */
export function FeaturedInstructorsPanel({
  options,
  initialFeatured,
}: {
  options: FeaturedInstructorOption[];
  initialFeatured: string[];
}) {
  const t = useTranslations("Admin.instructors.featuredPanel");
  const router = useRouter();

  const [featured, setFeatured] = useState(initialFeatured);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setFeatured(initialFeatured);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFeatured.join(",")]);

  const optionById = new Map(options.map((option) => [option.id, option]));
  const featuredRows = featured.map((id) => optionById.get(id)).filter((row): row is FeaturedInstructorOption => !!row);
  const addableOptions = options.filter((option) => !featured.includes(option.id));
  const atMax = featured.length >= MAX_FEATURED;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = featured.indexOf(String(active.id));
    const newIndex = featured.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    setFeatured(arrayMove(featured, oldIndex, newIndex));
  }

  function handleAdd(option: FeaturedInstructorOption | null) {
    if (!option || atMax || featured.includes(option.id)) return;
    setFeatured((prev) => [...prev, option.id]);
  }

  const dirty = featured.join(",") !== initialFeatured.join(",");

  async function handleSave() {
    setSaving(true);
    try {
      const result = await setFeaturedInstructorsAction(featured);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(t("saved"));
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="text-base font-semibold text-foreground">{t("title")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>

      <div className="mt-4 max-w-sm">
        <Combobox
          items={addableOptions}
          value={null}
          onValueChange={handleAdd}
          itemToStringLabel={(option: FeaturedInstructorOption) => option.name}
          isItemEqualToValue={(a: FeaturedInstructorOption, b: FeaturedInstructorOption) => a.id === b.id}
          disabled={atMax}
        >
          <ComboboxInputGroup>
            <ComboboxInput placeholder={t("addPlaceholder")} />
            <ComboboxIcon />
          </ComboboxInputGroup>
          <ComboboxContent>
            {(option: FeaturedInstructorOption) => (
              <ComboboxItem key={option.id} value={option}>
                {option.name}
              </ComboboxItem>
            )}
          </ComboboxContent>
        </Combobox>
        {atMax && <p className="mt-1.5 text-xs text-muted-foreground">{t("maxReached")}</p>}
      </div>

      <div className="mt-4 space-y-2">
        {featuredRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <DndContext
            id="featured-instructors"
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={featuredRows.map((row) => row.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {featuredRows.map((row) => (
                  <FeaturedInstructorRow
                    key={row.id}
                    instructor={row}
                    onRemove={() => setFeatured((prev) => prev.filter((id) => id !== row.id))}
                    removeLabel={t("remove", { name: row.name })}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {dirty && (
        <div className="mt-4 flex items-center gap-2">
          <Button type="button" size="sm" disabled={saving} onClick={() => void handleSave()}>
            {saving ? t("saving") : t("save")}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={saving} onClick={() => setFeatured(initialFeatured)}>
            {t("discard")}
          </Button>
        </div>
      )}
    </section>
  );
}
