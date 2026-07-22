"use client";

import Image from "next/image";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface FeaturedInstructorOption {
  id: string;
  name: string;
  thumbnailUrl: string | null;
}

/** One draggable row in the Featured Instructors panel — same
 *  `useSortable`/drag-handle convention as `CurriculumModuleRow`. */
export function FeaturedInstructorRow({
  instructor,
  onRemove,
  removeLabel,
}: {
  instructor: FeaturedInstructorOption;
  onRemove: () => void;
  removeLabel: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instructor.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-dragging={isDragging || undefined}
      className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 data-dragging:opacity-60"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      {instructor.thumbnailUrl ? (
        <Image
          src={instructor.thumbnailUrl}
          alt=""
          width={32}
          height={32}
          sizes="32px"
          className="size-8 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
        />
      ) : (
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/10">
          <ImageIcon aria-hidden="true" className="size-3.5" />
        </span>
      )}
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{instructor.name}</span>
      <Button type="button" variant="ghost" size="icon-sm" aria-label={removeLabel} onClick={onRemove}>
        <X aria-hidden="true" className="size-4" />
      </Button>
    </div>
  );
}
