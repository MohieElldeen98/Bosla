import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    uploadedVideo: {
      setUploadedVideo: (src: string) => ReturnType;
    };
  }
}

/**
 * A self-hosted video block — the Media Library counterpart to the
 * Youtube embed extension. Serialized as a plain
 * `<video src controls preload="metadata">`, which the sanitizer
 * allowlists and `.rich-text-content video` styles like the other media
 * blocks.
 */
export const UploadedVideo = Node.create({
  name: "uploadedVideo",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, {
        controls: "controls",
        preload: "metadata",
        controlslist: "nodownload",
        disablepictureinpicture: "",
      }),
    ];
  },

  addCommands() {
    return {
      setUploadedVideo:
        (src) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { src } }),
    };
  },
});
