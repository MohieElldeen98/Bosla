import { Node, mergeAttributes } from "@tiptap/core";

/** Card top-accent colors (the reference's green-vs-red comparison
 *  cards) — `none` renders a plain bordered card. */
export const CARD_ACCENTS = ["none", "green", "red", "primary", "amber"] as const;
export type CardAccent = (typeof CARD_ACCENTS)[number];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    cardGrid: {
      insertCardGrid: (cards?: number) => ReturnType;
      addCard: () => ReturnType;
      setCardAccent: (accent: CardAccent) => ReturnType;
      deleteCard: () => ReturnType;
    };
  }
}

/**
 * One card inside a `cardGrid` — free block content with an optional
 * colored top accent. Never appears outside a grid (`content` rule on
 * `cardGrid` + no group membership here).
 */
export const Card = Node.create({
  name: "card",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      accent: {
        default: "none" as CardAccent,
        parseHTML: (element) => {
          const accent = element.getAttribute("data-accent");
          return CARD_ACCENTS.includes(accent as CardAccent) ? accent : "none";
        },
        renderHTML: (attributes) =>
          attributes.accent && attributes.accent !== "none"
            ? { "data-accent": attributes.accent }
            : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.card" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "card" }), 0];
  },
});

/**
 * Side-by-side cards (2–4) — the reference's comparison cards and test
 * grids. Serialized as `<div class="card-grid"><div class="card">…</div>…</div>`;
 * `.rich-text-content .card-grid` lays them out responsively (single
 * column on mobile).
 */
export const CardGrid = Node.create({
  name: "cardGrid",
  group: "block",
  content: "card{1,4}",
  defining: true,
  draggable: true,

  parseHTML() {
    return [{ tag: "div.card-grid" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "card-grid" }), 0];
  },

  addCommands() {
    return {
      insertCardGrid:
        (cards = 2) =>
        ({ commands }) =>
          commands.insertContent({
            type: this.name,
            content: Array.from({ length: Math.min(4, Math.max(1, cards)) }, () => ({
              type: "card",
              content: [{ type: "paragraph" }],
            })),
          }),

      /** Appends a card to the grid the caret is inside (max 4). */
      addCard:
        () =>
        ({ state, chain }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name === this.name) {
              if (node.childCount >= 4) return false;
              const gridEnd = $from.end(depth);
              return chain()
                .insertContentAt(gridEnd, { type: "card", content: [{ type: "paragraph" }] })
                .run();
            }
          }
          return false;
        },

      setCardAccent:
        (accent) =>
        ({ commands }) =>
          commands.updateAttributes("card", { accent }),

      /** Deletes the card the caret is inside; deleting the last card
       *  removes the whole grid (an empty grid is invalid). */
      deleteCard:
        () =>
        ({ state, tr, dispatch }) => {
          const { $from } = state.selection;
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            const node = $from.node(depth);
            if (node.type.name === "card") {
              const grid = $from.node(depth - 1);
              const start = $from.before(depth);
              const end = $from.after(depth);
              if (dispatch) {
                if (grid.type.name === this.name && grid.childCount <= 1) {
                  tr.delete($from.before(depth - 1), $from.after(depth - 1));
                } else {
                  tr.delete(start, end);
                }
                dispatch(tr);
              }
              return true;
            }
          }
          return false;
        },
    };
  },
});
