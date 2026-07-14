"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import { useLocale, useTranslations } from "next-intl";
import {
  Bold,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Underline,
  Undo2,
  Unlink,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { getResolvedMediaByIdAction } from "@/cms/actions/media.actions";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** The exact formatting set `blog/utils/sanitize-article-html.ts` allows —
 *  the two must stay in sync: a mark/node added here without extending the
 *  sanitizer's allowlist would silently disappear on save. */
function buildExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: { openOnClick: false },
      codeBlock: {},
    }),
    Image,
    Youtube.configure({ nocookie: true }),
    Placeholder.configure({ placeholder }),
  ];
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-accent text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** One inline URL panel shared by the link and YouTube flows — kept inside
 *  the toolbar instead of a `window.prompt` so the flow stays styled,
 *  translatable, and RTL-aware. */
function UrlPanel({
  placeholder,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: (url: string) => void;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  return (
    <div className="flex items-center gap-2 border-t border-border p-2">
      <Input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder={placeholder}
        dir="ltr"
        className="h-8"
        autoFocus
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            if (url.trim()) onConfirm(url.trim());
          }
          if (event.key === "Escape") onCancel();
        }}
      />
      <Button type="button" size="sm" variant="secondary" onClick={() => url.trim() && onConfirm(url.trim())}>
        {confirmLabel}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={onCancel} aria-label={cancelLabel}>
        <X className="size-4" />
      </Button>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const t = useTranslations("Admin.articleEditor.richText");
  const locale = useLocale() as Locale;
  const [panel, setPanel] = useState<"link" | "image" | "youtube" | null>(null);

  // v3's recommended pattern: `useEditor` no longer re-renders per
  // transaction, so active/enabled states are selected explicitly.
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      underline: instance.isActive("underline"),
      strike: instance.isActive("strike"),
      h2: instance.isActive("heading", { level: 2 }),
      h3: instance.isActive("heading", { level: 3 }),
      bulletList: instance.isActive("bulletList"),
      orderedList: instance.isActive("orderedList"),
      blockquote: instance.isActive("blockquote"),
      link: instance.isActive("link"),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    }),
  });

  async function insertImage(assetId: string | null) {
    if (!assetId) return;
    const asset = await getResolvedMediaByIdAction(assetId, locale);
    if (asset) {
      editor.chain().focus().setImage({ src: asset.url, alt: asset.alt ?? "" }).run();
    }
    setPanel(null);
  }

  return (
    <div className="rounded-t-lg bg-muted/50">
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">
        <ToolbarButton label={t("undo")} onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("redo")} onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo}>
          <Redo2 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t("heading2")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={state.h2}
        >
          <Heading2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("heading3")}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={state.h3}
        >
          <Heading3 className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton label={t("bold")} onClick={() => editor.chain().focus().toggleBold().run()} isActive={state.bold}>
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} isActive={state.italic}>
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={state.underline}
        >
          <Underline className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("strikethrough")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={state.strike}
        >
          <Strikethrough className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={state.bulletList}
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={state.orderedList}
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={state.blockquote}
        >
          <Quote className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("horizontalRule")} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-border" />
        <ToolbarButton
          label={t("link")}
          onClick={() => setPanel(panel === "link" ? null : "link")}
          isActive={state.link || panel === "link"}
        >
          <LinkIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("unlink")}
          onClick={() => editor.chain().focus().unsetLink().run()}
          disabled={!state.link}
        >
          <Unlink className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("image")}
          onClick={() => setPanel(panel === "image" ? null : "image")}
          isActive={panel === "image"}
        >
          <ImagePlus className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("youtube")}
          onClick={() => setPanel(panel === "youtube" ? null : "youtube")}
          isActive={panel === "youtube"}
        >
          <Video className="size-4" />
        </ToolbarButton>
      </div>

      {panel === "link" && (
        <UrlPanel
          placeholder={t("linkPlaceholder")}
          confirmLabel={t("apply")}
          cancelLabel={t("cancel")}
          onConfirm={(url) => {
            editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            setPanel(null);
          }}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel === "youtube" && (
        <UrlPanel
          placeholder={t("youtubePlaceholder")}
          confirmLabel={t("apply")}
          cancelLabel={t("cancel")}
          onConfirm={(url) => {
            editor.chain().focus().setYoutubeVideo({ src: url }).run();
            setPanel(null);
          }}
          onCancel={() => setPanel(null)}
        />
      )}
      {panel === "image" && (
        <div className="border-t border-border p-2">
          <MediaPicker value={null} onChange={insertImage} accept={["image"]} placeholderLabel={t("imagePlaceholder")} />
        </div>
      )}
    </div>
  );
}

/**
 * The bilingual article-body editor (Tiptap) — a controlled component
 * over an HTML string, so it slots behind a react-hook-form `Controller`
 * exactly like `MediaPicker` does. What the editor can produce is bounded
 * by `buildExtensions` above and re-bounded server-side by
 * `sanitizeArticleBody` on every save — the sanitizer, not this UI, is
 * the security boundary.
 */
export function RichTextEditor({
  value,
  onChange,
  dir,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Text direction of the *content* being written (`rtl` for the Arabic
   *  body even when the admin UI itself is in English). */
  dir: "ltr" | "rtl";
  placeholder: string;
}) {
  const editor = useEditor({
    extensions: buildExtensions(placeholder),
    content: value,
    // Required with Next.js SSR — render only after hydration.
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class: "rich-text-content min-h-72 px-4 py-3 focus:outline-none",
        dir,
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(instance.getHTML());
    },
  });

  // External resets (form `reset()` after save/cancel) — push the new
  // value in without re-emitting an update, guarding against the echo of
  // our own `onUpdate` (`getHTML()` already equals `value` then).
  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  return (
    <div className="rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
      {editor && <Toolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
