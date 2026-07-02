"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shared up/down reorder control — used for both homepage section order
 *  and every reorderable content array, so there's one keyboard-operable
 *  reorder affordance in the whole editor, not several near-copies. */
export function MoveButtons({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
  moveUpLabel,
  moveDownLabel,
}: {
  onMoveUp: () => void;
  onMoveDown: () => void;
  disableUp: boolean;
  disableDown: boolean;
  moveUpLabel: string;
  moveDownLabel: string;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onMoveUp}
        disabled={disableUp}
        aria-label={moveUpLabel}
      >
        <ChevronUp className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onMoveDown}
        disabled={disableDown}
        aria-label={moveDownLabel}
      >
        <ChevronDown className="size-4" />
      </Button>
    </div>
  );
}
