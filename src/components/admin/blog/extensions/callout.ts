import { Node, mergeAttributes } from "@tiptap/core";

/** The five editorial callout flavors — one node type with a variant
 *  attribute, not five node types: Note (neutral), Tip (positive),
 *  Warning (caution), Practice (an exercise/scenario for the reader),
 *  Source (primary reference for the article). Covers the lesson-page
 *  patterns (`.callout`, `.ask-claude`, `.source-box`) as one system. */
export const CALLOUT_VARIANTS = ["note", "tip", "warning", "practice", "source"] as const;
export type CalloutVariant = (typeof CALLOUT_VARIANTS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      toggleCallout: () => ReturnType;
      setCalloutVariant: (variant: CalloutVariant) => ReturnType;
    };
  }
}

/**
 * A highlighted box wrapping regular block content — serialized as
 * `<div class="callout" data-variant="...">`, which
 * `blog/utils/sanitize-article-html.ts` allowlists and
 * `.rich-text-content .callout` styles identically in the editor and on
 * the public article. No React NodeView needed: the content is ordinary
 * editable blocks; only the wrapper is special.
 */
export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: "note" as CalloutVariant,
        parseHTML: (element) => {
          const variant = element.getAttribute("data-variant");
          return CALLOUT_VARIANTS.includes(variant as CalloutVariant) ? variant : "note";
        },
        renderHTML: (attributes) => ({ "data-variant": attributes.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.callout" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "callout" }), 0];
  },

  addCommands() {
    return {
      toggleCallout:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      setCalloutVariant:
        (variant) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { variant }),
    };
  },
});
