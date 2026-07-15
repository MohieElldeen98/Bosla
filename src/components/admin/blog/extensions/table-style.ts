import { Extension } from "@tiptap/core";

/** The table's visual variants — one attribute, not separate node types.
 *  Serialized as `data-style` on `<table>`, allowlisted exactly by the
 *  sanitizer and styled by `.rich-text-content table[data-style=...]`. */
export const TABLE_STYLES = ["default", "striped", "minimal"] as const;
export type TableStyle = (typeof TABLE_STYLES)[number];

/**
 * Adds the `tableStyle` attribute to TableKit's `table` node — a global
 * attribute extension (the same mechanism as `LeadParagraph`) rather than
 * subclassing the Table node, so TableKit stays untouched.
 */
export const TableStyleAttribute = Extension.create({
  name: "tableStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["table"],
        attributes: {
          tableStyle: {
            default: "default" as TableStyle,
            parseHTML: (element) => {
              const style = element.getAttribute("data-style");
              return TABLE_STYLES.includes(style as TableStyle) ? style : "default";
            },
            renderHTML: (attributes) =>
              attributes.tableStyle && attributes.tableStyle !== "default"
                ? { "data-style": attributes.tableStyle }
                : {},
          },
        },
      },
    ];
  },
});
