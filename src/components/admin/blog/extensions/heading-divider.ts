import { Extension } from "@tiptap/core";

/**
 * The "section heading" underline — a thin rule under a heading
 * (serialized as `class="heading-divider"`), toggled per heading from the
 * toolbar. Same global-attribute mechanism as `LeadParagraph`.
 */
export const HeadingDivider = Extension.create({
  name: "headingDivider",

  addGlobalAttributes() {
    return [
      {
        types: ["heading"],
        attributes: {
          divider: {
            default: false,
            parseHTML: (element) => element.classList.contains("heading-divider"),
            renderHTML: (attributes) => (attributes.divider ? { class: "heading-divider" } : {}),
          },
        },
      },
    ];
  },
});
