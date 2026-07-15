import { Extension } from "@tiptap/core";

/**
 * The article's opening "lede" — a paragraph rendered larger and softer
 * (`.rich-text-content .lede`). Implemented as a boolean attribute on the
 * ordinary paragraph node (serialized as `class="lede"`), not a separate
 * node type, so toggling it never restructures the document.
 */
export const LeadParagraph = Extension.create({
  name: "leadParagraph",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          lede: {
            default: false,
            parseHTML: (element) => element.classList.contains("lede"),
            renderHTML: (attributes) => (attributes.lede ? { class: "lede" } : {}),
          },
        },
      },
    ];
  },
});
