"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoveButtons } from "@/components/admin/homepage/MoveButtons";

/**
 * Generic chrome for a reorderable, add/removable content array (Hero
 * highlights/statistics/slides, Why Bosla items, Learning Experience
 * capabilities, FAQ items) — one implementation instead of six near-copies.
 * Move/remove/add are plain buttons (not drag-and-drop), so the whole
 * editor stays keyboard-operable without an extra dependency.
 *
 * Expects `fields` from `useFieldArray({..., keyName: "fieldId"})`, not
 * RHF's default `keyName: "id"` — every CMS array item already has its own
 * semantic `id` (e.g. `"highlight-evidence"`), and letting RHF inject its
 * synthetic key under that same name overwrites it, which was causing
 * `isDirty` to read `true` immediately on mount with no actual edit.
 */
export function ArrayFieldEditor<T extends { fieldId: string }>({
  label,
  fields,
  onAdd,
  onRemove,
  onMoveUp,
  onMoveDown,
  addLabel,
  removeLabel,
  moveUpLabel,
  moveDownLabel,
  emptyLabel,
  renderItem,
}: {
  label: string;
  fields: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  addLabel: string;
  removeLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  emptyLabel: string;
  renderItem: (field: T, index: number) => ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          <Plus aria-hidden="true" className="size-3.5" />
          {addLabel}
        </Button>
      </div>

      {fields.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-3">
          {fields.map((field, index) => (
            <li key={field.fieldId} className="rounded-lg border border-border bg-muted/20 p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <MoveButtons
                  onMoveUp={() => onMoveUp(index)}
                  onMoveDown={() => onMoveDown(index)}
                  disableUp={index === 0}
                  disableDown={index === fields.length - 1}
                  moveUpLabel={moveUpLabel}
                  moveDownLabel={moveDownLabel}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onRemove(index)}
                  aria-label={removeLabel}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              {renderItem(field, index)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
