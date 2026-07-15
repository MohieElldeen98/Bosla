"use client";

import { useEffect } from "react";

/**
 * Copy deterrents for article media — blocks the right-click menu on
 * images/videos (no "Copy image" / "Copy image address" / "Save video")
 * and image drag-outs inside the article body. Pairs with the CSS
 * (`user-drag: none`) and the video player's `controlsList="nodownload"`.
 * A deterrent, not DRM — screenshots and devtools always exist; this
 * removes the casual paths, which is the accepted practice on content
 * sites. Renders nothing.
 */
export function ArticleMediaGuard({ containerId }: { containerId: string }) {
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    function isGuarded(target: EventTarget | null): boolean {
      return target instanceof Element && !!target.closest("img, video");
    }

    function onContextMenu(event: MouseEvent) {
      if (isGuarded(event.target)) event.preventDefault();
    }
    function onDragStart(event: DragEvent) {
      if (isGuarded(event.target)) event.preventDefault();
    }
    function onCopy(event: ClipboardEvent) {
      // Copying selected *text* stays allowed — only block when the
      // selection is an image element itself.
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      const node = selection.anchorNode;
      if (node instanceof Element && node.querySelector("img")) event.preventDefault();
    }

    container.addEventListener("contextmenu", onContextMenu);
    container.addEventListener("dragstart", onDragStart);
    container.addEventListener("copy", onCopy);
    return () => {
      container.removeEventListener("contextmenu", onContextMenu);
      container.removeEventListener("dragstart", onDragStart);
      container.removeEventListener("copy", onCopy);
    };
  }, [containerId]);

  return null;
}
