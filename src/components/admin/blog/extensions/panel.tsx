"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer, type NodeViewProps } from "@tiptap/react";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Header colors — theme-stable accents shared with the callout family. */
export const PANEL_VARIANTS = ["primary", "green", "red", "amber", "slate"] as const;
export type PanelVariant = (typeof PANEL_VARIANTS)[number];

export interface PanelAttrs {
  title: string;
  meta: string;
  variant: PanelVariant;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    panel: {
      insertPanel: () => ReturnType;
    };
  }
}

function normalize(attrs: Record<string, unknown>): PanelAttrs {
  return {
    title: typeof attrs.title === "string" ? attrs.title : "",
    meta: typeof attrs.meta === "string" ? attrs.meta : "",
    variant: PANEL_VARIANTS.includes(attrs.variant as PanelVariant)
      ? (attrs.variant as PanelVariant)
      : "primary",
  };
}

/**
 * The panel's editing surface — the header (title, side meta, variant
 * dots, delete) is NodeView chrome editing attributes; the body is real
 * editable document content via `NodeViewContent`.
 */
function PanelNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const t = useTranslations("Admin.articleEditor.panel");
  const attrs = normalize(node.attrs);

  return (
    <NodeViewWrapper
      className={cn("panel my-4", selected && "ring-2 ring-primary/40 rounded-lg")}
      data-variant={attrs.variant}
      data-drag-handle
    >
      <div className="panel-header" contentEditable={false}>
        <input
          value={attrs.title}
          onChange={(event) => updateAttributes({ title: event.target.value })}
          placeholder={t("titlePlaceholder")}
          dir="auto"
          className="min-w-0 flex-1 bg-transparent font-semibold outline-none placeholder:text-white/50"
        />
        <input
          value={attrs.meta}
          onChange={(event) => updateAttributes({ meta: event.target.value })}
          placeholder={t("metaPlaceholder")}
          dir="auto"
          className="w-24 bg-transparent text-end text-sm outline-none placeholder:text-white/50"
        />
        <span className="flex items-center gap-1">
          {PANEL_VARIANTS.map((variant) => (
            <button
              key={variant}
              type="button"
              title={t(`variants.${variant}`)}
              aria-label={t(`variants.${variant}`)}
              onClick={() => updateAttributes({ variant })}
              className={cn(
                "size-4 rounded-full border-2 transition-transform hover:scale-110",
                attrs.variant === variant ? "border-white" : "border-white/30",
              )}
              style={{ backgroundColor: `var(--panel-${variant})` }}
            />
          ))}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={deleteNode}
          aria-label={t("deletePanel")}
          className="text-white/70 hover:bg-white/15 hover:text-white"
        >
          <Trash2 aria-hidden="true" className="size-4" />
        </Button>
      </div>
      <NodeViewContent className="panel-body" />
    </NodeViewWrapper>
  );
}

/**
 * A titled section panel — colored header bar with a title and an
 * optional right-side meta label ("Week 1–2"), over a free-content body.
 * Serialized as:
 *
 *   <div class="panel" data-variant="…">
 *     <div class="panel-header"><span class="panel-title">…</span><span class="panel-meta">…</span></div>
 *     <div class="panel-body">…blocks…</div>
 *   </div>
 */
export const Panel = Node.create({
  name: "panel",
  group: "block",
  content: "block+",
  defining: true,
  draggable: true,

  addAttributes() {
    return {
      title: { default: "", rendered: false },
      meta: { default: "", rendered: false },
      variant: { default: "primary" as PanelVariant, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div.panel",
        contentElement: ".panel-body",
        getAttrs: (element) => {
          const variant = element.getAttribute("data-variant");
          return {
            title: element.querySelector(".panel-title")?.textContent ?? "",
            meta: element.querySelector(".panel-meta")?.textContent ?? "",
            variant: PANEL_VARIANTS.includes(variant as PanelVariant) ? variant : "primary",
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const attrs = normalize(node.attrs);
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "panel", "data-variant": attrs.variant }),
      [
        "div",
        { class: "panel-header" },
        ["span", { class: "panel-title" }, attrs.title],
        ["span", { class: "panel-meta" }, attrs.meta],
      ],
      ["div", { class: "panel-body" }, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PanelNodeView);
  },

  addCommands() {
    return {
      insertPanel:
        () =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            attrs: { title: "", meta: "", variant: "primary" },
            content: [{ type: "paragraph" }],
          }),
    };
  },
});
