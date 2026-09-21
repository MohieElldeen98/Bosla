"use client";

import "@/lib/polyfills/array-find-last";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Youtube from "@tiptap/extension-youtube";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { Color, FontSize, TextStyle } from "@tiptap/extension-text-style";
import { TableKit } from "@tiptap/extension-table";
import { Callout, CALLOUT_VARIANTS, type CalloutVariant } from "@/components/admin/blog/extensions/callout";
import { LeadParagraph } from "@/components/admin/blog/extensions/lead-paragraph";
import { Quiz } from "@/components/admin/blog/extensions/quiz";
import { Card, CardGrid, CARD_ACCENTS, type CardAccent } from "@/components/admin/blog/extensions/card-grid";
import { HeadingDivider } from "@/components/admin/blog/extensions/heading-divider";
import { Panel } from "@/components/admin/blog/extensions/panel";
import { TableStyleAttribute, TABLE_STYLES, type TableStyle } from "@/components/admin/blog/extensions/table-style";
import { UploadedVideo } from "@/components/admin/blog/extensions/uploaded-video";
import { useLocale, useTranslations } from "next-intl";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowRightToLine,
  Bold,
  Eraser,
  Grid2x2Plus,
  Grid2x2X,
  LayoutGrid,
  PanelTop,
  Highlighter,
  ImagePlus,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Lightbulb,
  Link as LinkIcon,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  MinusSquare,
  Palette,
  Pilcrow,
  Quote,
  Redo2,
  Smile,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline,
  Undo2,
  Unlink,
  Video,
  X,
  BookOpen,
  Code2,
  Eye,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { getResolvedMediaByIdAction } from "@/cms/actions/media.actions";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** Per-block text direction — lets authors mix LTR and RTL paragraphs
 *  within a single article (e.g. an English quote inside an Arabic piece).
 *  The `dir` HTML attribute is serialised as-is; the sanitizer allows it. */
const TextDirection = Extension.create({
  name: "textDirection",
  addOptions() {
    return { types: ["heading", "paragraph"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          dir: {
            default: null,
            parseHTML: (el: HTMLElement) => el.getAttribute("dir"),
            renderHTML: (attrs: Record<string, unknown>) => (attrs.dir ? { dir: attrs.dir } : {}),
          },
        },
      },
    ];
  },
});

/** Matches `blog/utils/read-time.ts`'s words-per-minute so the editor's
 *  live estimate agrees with the value the service stores on save. */
const WORDS_PER_MINUTE = 200;

/** The curated text-color palette — theme variables / fixed accents that
 *  hold up in dark mode, never a free color picker (brand consistency).
 *  Must stay in sync with the sanitizer's `span` color allowlist
 *  (`blog/utils/sanitize-article-html.ts`). */
const TEXT_COLORS = [
  { key: "primary", value: "var(--primary)" },
  { key: "green", value: "#00a659" },
  { key: "amber", value: "#da7f00" },
  { key: "red", value: "var(--destructive)" },
] as const;

/** Free-typed font size, clamped to a sane editorial range — the
 *  sanitizer's `font-size` allowlist accepts exactly this range. */
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 72;

/** Curated set — general reactions plus the clinical ones medical writers
 *  actually reach for. Inserted as plain text, so no schema/sanitizer
 *  work is needed. */
const EMOJIS = [
  "😀", "😊", "😉", "😂", "🤔", "😴", "😷", "🤒", "🤕", "🤢",
  "❤️", "💪", "👍", "👎", "👏", "🙏", "✍️", "👨‍⚕️", "👩‍⚕️", "🏃",
  "🩺", "💊", "💉", "🩹", "🧠", "🫀", "🫁", "🦴", "🦵", "🔬",
  "🧪", "🩻", "🥗", "💧", "😴", "⚠️", "✅", "❌", "⭐", "🔥",
  "💡", "📌", "📚", "📝", "📊", "⏰", "🔎", "➡️", "🎯", "🎉",
] as const;

/** Image with editorial controls — alignment + width presets stored as
 *  data-attributes (`data-align`, `data-width`) that the sanitizer
 *  allowlists and `.rich-text-content` styles, so what the author sets is
 *  exactly what readers see. */
const ArticleImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-align"),
        renderHTML: (attributes) => (attributes.align ? { "data-align": attributes.align } : {}),
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-width"),
        renderHTML: (attributes) => (attributes.width ? { "data-width": attributes.width } : {}),
      },
      intrinsicWidth: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => (attributes.intrinsicWidth ? { width: attributes.intrinsicWidth } : {}),
      },
      intrinsicHeight: {
        default: null,
        parseHTML: (element) => element.getAttribute("height"),
        renderHTML: (attributes) => (attributes.intrinsicHeight ? { height: attributes.intrinsicHeight } : {}),
      },
    };
  },
});

/** The exact formatting set `blog/utils/sanitize-article-html.ts` allows —
 *  the two must stay in sync: a mark/node added here without extending the
 *  sanitizer's allowlist would silently disappear on save. */
function buildExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      link: { openOnClick: false },
    }),
    ArticleImage,
    Youtube.configure({ nocookie: true }),
    Placeholder.configure({ placeholder }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Highlight,
    // Smart quotes, real ellipses, proper dashes — writing-quality
    // niceties with no schema/sanitizer impact (plain unicode text).
    Typography,
    CharacterCount,
    Subscript,
    Superscript,
    TextStyle,
    Color,
    FontSize,
    TableKit.configure({ table: { resizable: false } }),
    TableStyleAttribute,
    Callout,
    LeadParagraph,
    HeadingDivider,
    Quiz,
    UploadedVideo,
    Panel,
    Card,
    CardGrid,
    TextDirection,
  ];
}

function ToolbarButton({
  onClick,
  isActive,
  disabled,
  label,
  children,
  className,
}: {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
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
        "inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-tint hover:text-tint-foreground disabled:pointer-events-none disabled:opacity-40",
        isActive && "bg-tint text-tint-foreground",
        className,
      )}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="mx-1 h-5 w-px bg-border" />;
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

/**
 * Word-style size box: always displays the *rendered* size of the text at
 * the caret (explicit mark, or the computed default/heading size), and
 * accepts any typed value — applied on Enter/blur, clamped to
 * [FONT_SIZE_MIN, FONT_SIZE_MAX] (the sanitizer accepts exactly that
 * range). Local draft state so typing isn't fought by selection updates.
 */
function FontSizeInput({
  editor,
  label,
  explicitSize,
  computedSize,
}: {
  editor: Editor;
  label: string;
  explicitSize: string | null;
  computedSize: number | null;
}) {
  const explicit = explicitSize ? Math.round(parseFloat(explicitSize)) : null;
  const shown = Number.isFinite(explicit as number) ? explicit : computedSize;
  const [draft, setDraft] = useState<string | null>(null);

  function apply(raw: string) {
    setDraft(null);
    const parsed = Math.round(parseFloat(raw));
    if (Number.isNaN(parsed)) return;
    const clamped = Math.min(FONT_SIZE_MAX, Math.max(FONT_SIZE_MIN, parsed));
    editor.chain().focus().setFontSize(`${clamped}px`).run();
  }

  return (
    <input
      type="number"
      min={FONT_SIZE_MIN}
      max={FONT_SIZE_MAX}
      value={draft ?? (shown ?? "")}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => draft !== null && apply(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          apply((event.target as HTMLInputElement).value);
        }
        if (event.key === "Escape") setDraft(null);
      }}
      title={label}
      aria-label={label}
      className="ms-0.5 h-8 w-14 rounded-md border border-border bg-background px-1.5 text-center text-xs text-foreground outline-none focus:border-ring"
    />
  );
}

function Toolbar({
  editor,
  citationCount,
  mode,
  onModeChange,
}: {
  editor: Editor;
  citationCount: number;
  mode: "visual" | "html" | "preview";
  onModeChange: (mode: "visual" | "html" | "preview") => void;
}) {
  const t = useTranslations("Admin.articleEditor.richText");
  const locale = useLocale() as Locale;
  const [panel, setPanel] = useState<"link" | "image" | "video" | "color" | "emoji" | "citation" | null>(null);

  // v3's recommended pattern: `useEditor` no longer re-renders per
  // transaction, so active/enabled states are selected explicitly. The
  // selector must tolerate a `null`/destroyed instance — flipping the
  // article language recreates the editor (`useEditor`'s `[dir]` dep),
  // and this still runs once against the torn-down old instance.
  const state = useEditorState({
    editor,
    selector: ({ editor: instance }) => {
      if (!instance || instance.isDestroyed) {
        return {
          lede: false,
          callout: false,
          calloutVariant: "note" as CalloutVariant,
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          highlight: false,
          subscript: false,
          superscript: false,
          textColor: null as string | null,
          fontSize: null as string | null,
          computedFontSize: null as number | null,
          canIndent: false,
          canOutdent: false,
          h1: false,
          h2: false,
          h3: false,
          h4: false,
          bulletList: false,
          orderedList: false,
          blockquote: false,
          link: false,
          table: false,
          tableStyle: "default" as TableStyle,
          image: false,
          imageAlign: null as string | null,
          imageWidth: null as string | null,
          heading: false,
          headingDivider: false,
          card: false,
          cardAccent: "none" as CardAccent,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
          canUndo: false,
          canRedo: false,
          dirLtr: false,
          dirRtl: false,
        };
      }
      return {
        lede: instance.isActive("paragraph", { lede: true }),
        callout: instance.isActive("callout"),
        calloutVariant: (instance.getAttributes("callout").variant ?? "note") as CalloutVariant,
        bold: instance.isActive("bold"),
        italic: instance.isActive("italic"),
        underline: instance.isActive("underline"),
        strike: instance.isActive("strike"),
        highlight: instance.isActive("highlight"),
        subscript: instance.isActive("subscript"),
        superscript: instance.isActive("superscript"),
        textColor: (instance.getAttributes("textStyle").color ?? null) as string | null,
        fontSize: (instance.getAttributes("textStyle").fontSize ?? null) as string | null,
        computedFontSize: (() => {
          // The *rendered* size at the caret — so the box shows 17 for
          // default text and e.g. 31 inside an H1 even with no explicit
          // size mark set.
          try {
            const dom = instance.view.domAtPos(instance.state.selection.from).node;
            const el = (dom.nodeType === 3 ? dom.parentElement : dom) as HTMLElement | null;
            if (!el || !(el instanceof HTMLElement)) return null;
            const parsed = Math.round(parseFloat(window.getComputedStyle(el).fontSize));
            // NaN would leak into the input's `value` — null renders "".
            return Number.isFinite(parsed) ? parsed : null;
          } catch {
            return null;
          }
        })(),
        canIndent: instance.can().sinkListItem("listItem"),
        canOutdent: instance.can().liftListItem("listItem"),
        h1: instance.isActive("heading", { level: 1 }),
        h2: instance.isActive("heading", { level: 2 }),
        h3: instance.isActive("heading", { level: 3 }),
        h4: instance.isActive("heading", { level: 4 }),
        bulletList: instance.isActive("bulletList"),
        orderedList: instance.isActive("orderedList"),
        blockquote: instance.isActive("blockquote"),
        link: instance.isActive("link"),
        table: instance.isActive("table"),
        tableStyle: (instance.getAttributes("table").tableStyle ?? "default") as TableStyle,
        image: instance.isActive("image"),
        imageAlign: (instance.getAttributes("image").align ?? null) as string | null,
        imageWidth: (instance.getAttributes("image").width ?? null) as string | null,
        heading: instance.isActive("heading"),
        headingDivider: instance.getAttributes("heading").divider === true,
        card: instance.isActive("card"),
        cardAccent: (instance.getAttributes("card").accent ?? "none") as CardAccent,
        alignLeft: instance.isActive({ textAlign: "left" }),
        alignCenter: instance.isActive({ textAlign: "center" }),
        alignRight: instance.isActive({ textAlign: "right" }),
        canUndo: instance.can().undo(),
        canRedo: instance.can().redo(),
        dirLtr: (() => {
          const { from } = instance.state.selection;
          const node = instance.state.doc.nodeAt(from) ?? instance.state.doc.resolve(from).parent;
          return node?.attrs.dir === "ltr";
        })(),
        dirRtl: (() => {
          const { from } = instance.state.selection;
          const node = instance.state.doc.nodeAt(from) ?? instance.state.doc.resolve(from).parent;
          return node?.attrs.dir === "rtl";
        })(),
      };
    },
  });

  async function insertImage(assetId: string | null) {
    if (!assetId) return;
    const asset = await getResolvedMediaByIdAction(assetId, locale);
    if (asset) {
      const dimensions = asset.width && asset.height
        ? { intrinsicWidth: asset.width, intrinsicHeight: asset.height }
        : {};
      // A relative path, not `asset.url` — this `src` gets serialized
      // straight into `articles.body`/`legal_documents.content_*`
      // (`RichTextEditor` backs both editors), a persisted column read
      // back verbatim forever after, never re-resolved. `asset.url` is
      // absolute (`mediaDeliveryUrl` built on `NEXT_PUBLIC_SITE_URL`,
      // `http://localhost:3000` if unset), so saving it here would bake
      // in whatever origin was active at insert time — the exact bug
      // `profiles.avatar_url` had (see `WorkspaceProfileForm`'s own doc
      // comment). `/api/media/{id}/file` has no origin to go stale: it
      // resolves against whatever domain actually serves the published
      // page, dev or prod, and the route itself already handles both
      // R2-backed and legacy pre-migration assets.
      editor.chain().focus().setImage({ src: `/api/media/${asset.id}/file`, alt: asset.alt ?? "", ...dimensions }).run();
    }
    setPanel(null);
  }

  async function insertUploadedVideo(assetId: string | null) {
    if (!assetId) return;
    const asset = await getResolvedMediaByIdAction(assetId, locale);
    if (asset) {
      // Same reasoning as `insertImage` above — relative, not `asset.url`.
      editor.chain().focus().setUploadedVideo(`/api/media/${asset.id}/file`).run();
    }
    setPanel(null);
  }

  return (
    <div className="rounded-t-lg bg-muted/50">
      {/* Mode switcher — pinned at the top so it's never scrolled off screen */}
      <div className="flex items-center justify-between gap-1 border-b border-border px-2 py-1">
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            label="Visual"
            onClick={() => onModeChange("visual")}
            isActive={mode === "visual"}
            className={cn("gap-1 px-2 text-xs font-medium", mode === "visual" && "bg-tint text-tint-foreground")}
          >
            <BookOpen className="size-3.5" />
            <span className="hidden xs:inline sm:inline">Visual</span>
          </ToolbarButton>
          <ToolbarButton
            label="HTML"
            onClick={() => onModeChange("html")}
            isActive={mode === "html"}
            className={cn("gap-1 px-2 text-xs font-medium", mode === "html" && "bg-tint text-tint-foreground")}
          >
            <Code2 className="size-3.5" />
            <span className="hidden xs:inline sm:inline">HTML</span>
          </ToolbarButton>
          <ToolbarButton
            label="Preview"
            onClick={() => onModeChange("preview")}
            isActive={mode === "preview"}
            className={cn("gap-1 px-2 text-xs font-medium", mode === "preview" && "bg-tint text-tint-foreground")}
          >
            <Eye className="size-3.5" />
            <span className="hidden xs:inline sm:inline">Preview</span>
          </ToolbarButton>
        </div>
        <ToolbarButton
          label={t("clearFormatting")}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser className="size-4" />
        </ToolbarButton>
      </div>

      {/* Formatting toolbar — standard order matching Google Docs / Word / Notion */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5">

        {/* ── Group 1: History ── */}
        <ToolbarButton label={t("undo")} onClick={() => editor.chain().focus().undo().run()} disabled={!state.canUndo}>
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("redo")} onClick={() => editor.chain().focus().redo().run()} disabled={!state.canRedo}>
          <Redo2 className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />

        {/* ── Group 2: Text style & size ── */}
        <select
          value={state.h1 ? "h1" : state.h2 ? "h2" : state.h3 ? "h3" : state.h4 ? "h4" : "p"}
          onChange={(event) => {
            const value = event.target.value;
            if (value === "p") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().setHeading({ level: Number(value.slice(1)) as 1 | 2 | 3 | 4 }).run();
          }}
          title={t("textStyleLabel")}
          aria-label={t("textStyleLabel")}
          className="h-8 rounded-md border border-border bg-background px-1.5 text-xs font-medium text-foreground outline-none focus:border-ring"
        >
          <option value="p">{t("paragraph")}</option>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
          <option value="h4">H4</option>
        </select>
        <FontSizeInput
          editor={editor}
          label={t("fontSize")}
          explicitSize={state.fontSize}
          computedSize={state.computedFontSize}
        />
        <ToolbarDivider />

        {/* ── Group 3: Character formatting ── */}
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
        <ToolbarButton
          label={t("highlight")}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          isActive={state.highlight}
        >
          <Highlighter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("textColor")}
          onClick={() => setPanel(panel === "color" ? null : "color")}
          isActive={panel === "color" || state.textColor !== null}
        >
          <Palette className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("subscript")}
          onClick={() => editor.chain().focus().toggleSubscript().run()}
          isActive={state.subscript}
        >
          <SubscriptIcon className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("superscript")}
          onClick={() => editor.chain().focus().toggleSuperscript().run()}
          isActive={state.superscript}
        >
          <SuperscriptIcon className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />

        {/* ── Group 4: Paragraph alignment & direction ── */}
        <ToolbarButton
          label={t("alignLeft")}
          onClick={() =>
            state.image
              ? editor.chain().focus().updateAttributes("image", { align: "left" }).run()
              : editor.chain().focus().setTextAlign("left").run()
          }
          isActive={state.image ? state.imageAlign === "left" : state.alignLeft}
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("alignCenter")}
          onClick={() =>
            state.image
              ? editor.chain().focus().updateAttributes("image", { align: "center" }).run()
              : editor.chain().focus().setTextAlign("center").run()
          }
          isActive={state.image ? state.imageAlign === "center" : state.alignCenter}
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("alignRight")}
          onClick={() =>
            state.image
              ? editor.chain().focus().updateAttributes("image", { align: "right" }).run()
              : editor.chain().focus().setTextAlign("right").run()
          }
          isActive={state.image ? state.imageAlign === "right" : state.alignRight}
        >
          <AlignRight className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("dirLtr")}
          onClick={() =>
            state.dirLtr
              ? editor.chain().focus().resetAttributes("paragraph", "dir").resetAttributes("heading", "dir").run()
              : editor.chain().focus().updateAttributes("paragraph", { dir: "ltr" }).updateAttributes("heading", { dir: "ltr" }).run()
          }
          isActive={state.dirLtr}
          className="text-[10px] font-bold"
        >
          LTR
        </ToolbarButton>
        <ToolbarButton
          label={t("dirRtl")}
          onClick={() =>
            state.dirRtl
              ? editor.chain().focus().resetAttributes("paragraph", "dir").resetAttributes("heading", "dir").run()
              : editor.chain().focus().updateAttributes("paragraph", { dir: "rtl" }).updateAttributes("heading", { dir: "rtl" }).run()
          }
          isActive={state.dirRtl}
          className="text-[10px] font-bold"
        >
          RTL
        </ToolbarButton>
        <ToolbarDivider />

        {/* ── Group 5: Lists & structure ── */}
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
          label={t("outdent")}
          onClick={() => editor.chain().focus().liftListItem("listItem").run()}
          disabled={!state.canOutdent}
        >
          <IndentDecrease className="size-4 rtl:-scale-x-100" />
        </ToolbarButton>
        <ToolbarButton
          label={t("indent")}
          onClick={() => editor.chain().focus().sinkListItem("listItem").run()}
          disabled={!state.canIndent}
        >
          <IndentIncrease className="size-4 rtl:-scale-x-100" />
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
        <ToolbarDivider />

        {/* ── Group 6: Insert ── */}
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
          label={t("video")}
          onClick={() => setPanel(panel === "video" ? null : "video")}
          isActive={panel === "video"}
        >
          <Video className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("table")}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          isActive={state.table}
        >
          <Grid2x2Plus className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("emoji")}
          onClick={() => setPanel(panel === "emoji" ? null : "emoji")}
          isActive={panel === "emoji"}
        >
          <Smile className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("citation")}
          onClick={() => setPanel(panel === "citation" ? null : "citation")}
          isActive={panel === "citation"}
        >
          <BookOpen className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />

        {/* ── Group 7: Special blocks (Bosla-specific) ── */}
        <ToolbarButton
          label={t("callout")}
          onClick={() => editor.chain().focus().toggleCallout().run()}
          isActive={state.callout}
        >
          <Lightbulb className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("panel")} onClick={() => editor.chain().focus().insertPanel().run()}>
          <PanelTop className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("cardGrid")}
          onClick={() => editor.chain().focus().insertCardGrid(2).run()}
          isActive={state.card}
        >
          <LayoutGrid className="size-4" />
        </ToolbarButton>
        <ToolbarButton label={t("quiz")} onClick={() => editor.chain().focus().insertQuiz().run()}>
          <ListChecks className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("lede")}
          onClick={() =>
            editor.chain().focus().updateAttributes("paragraph", { lede: !state.lede }).run()
          }
          isActive={state.lede}
        >
          <Pilcrow className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("headingDivider")}
          onClick={() =>
            editor.chain().focus().updateAttributes("heading", { divider: !state.headingDivider }).run()
          }
          isActive={state.headingDivider}
          disabled={!state.heading}
        >
          <MinusSquare className="size-4" />
        </ToolbarButton>

      </div>

      {/* Callout variant switcher — only with the caret inside a callout. */}
      {state.callout && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border p-1.5">
          {CALLOUT_VARIANTS.map((variant) => (
            <button
              key={variant}
              type="button"
              onClick={() => editor.chain().focus().setCalloutVariant(variant).run()}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                state.calloutVariant === variant
                  ? "bg-tint text-tint-foreground"
                  : "text-muted-foreground hover:bg-tint/60 hover:text-tint-foreground",
              )}
            >
              {t(`calloutVariants.${variant}`)}
            </button>
          ))}
        </div>
      )}

      {/* Image operations — only with an image selected. Alignment uses
          the main toolbar's align buttons (image-aware above). */}
      {state.image && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border p-1.5">
          <span className="me-1 text-xs text-muted-foreground">{t("imageSize")}</span>
          {["25", "50", "75", "100"].map((width) => (
            <button
              key={width}
              type="button"
              onClick={() =>
                editor.chain().focus().updateAttributes("image", { width: width === "100" ? null : width }).run()
              }
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                (state.imageWidth ?? "100") === width
                  ? "bg-tint text-tint-foreground"
                  : "text-muted-foreground hover:bg-tint/60 hover:text-tint-foreground",
              )}
            >
              {width}%
            </button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <button
            type="button"
            onClick={() => editor.chain().focus().updateAttributes("image", { align: null }).run()}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-tint/60 hover:text-tint-foreground"
          >
            {t("imageAlignReset")}
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteSelection().run()}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            {t("removeImage")}
          </button>
        </div>
      )}

      {/* Card operations — only with the caret inside a card grid. */}
      {state.card && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border p-1.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().addCard().run()}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-tint/60 hover:text-tint-foreground"
          >
            {t("addCard")}
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteCard().run()}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            {t("deleteCard")}
          </button>
          <span className="mx-1 h-5 w-px bg-border" />
          {CARD_ACCENTS.map((accent) => (
            <button
              key={accent}
              type="button"
              onClick={() => editor.chain().focus().setCardAccent(accent).run()}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                state.cardAccent === accent
                  ? "bg-tint text-tint-foreground"
                  : "text-muted-foreground hover:bg-tint/60 hover:text-tint-foreground",
              )}
            >
              {t(`cardAccents.${accent}`)}
            </button>
          ))}
        </div>
      )}

      {/* Table operations — only meaningful with the caret inside a table. */}
      {state.table && (
        <div className="flex flex-wrap items-center gap-0.5 border-t border-border p-1.5">
          <ToolbarButton label={t("addRowBelow")} onClick={() => editor.chain().focus().addRowAfter().run()}>
            <ArrowDownToLine className="size-4" />
          </ToolbarButton>
          <ToolbarButton label={t("addColumnAfter")} onClick={() => editor.chain().focus().addColumnAfter().run()}>
            <ArrowRightToLine className="size-4" />
          </ToolbarButton>
          <ToolbarButton label={t("deleteRow")} onClick={() => editor.chain().focus().deleteRow().run()}>
            <Minus className="size-4 rotate-0" />
          </ToolbarButton>
          <ToolbarButton label={t("deleteColumn")} onClick={() => editor.chain().focus().deleteColumn().run()}>
            <Minus className="size-4 rotate-90" />
          </ToolbarButton>
          <ToolbarButton label={t("deleteTable")} onClick={() => editor.chain().focus().deleteTable().run()}>
            <Grid2x2X className="size-4" />
          </ToolbarButton>
          <span className="mx-1 h-5 w-px bg-border" />
          {TABLE_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => editor.chain().focus().updateAttributes("table", { tableStyle: style }).run()}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                state.tableStyle === style
                  ? "bg-tint text-tint-foreground"
                  : "text-muted-foreground hover:bg-tint/60 hover:text-tint-foreground",
              )}
            >
              {t(`tableStyles.${style}`)}
            </button>
          ))}
        </div>
      )}

      {panel === "color" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border p-2">
          {TEXT_COLORS.map(({ key, value }) => (
            <button
              key={key}
              type="button"
              title={t(`colors.${key}`)}
              aria-label={t(`colors.${key}`)}
              onClick={() => {
                editor.chain().focus().setColor(value).run();
                setPanel(null);
              }}
              className={cn(
                "size-7 rounded-full border-2 transition-transform hover:scale-110",
                state.textColor === value ? "border-foreground" : "border-transparent",
              )}
              style={{ backgroundColor: value }}
            />
          ))}
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().unsetColor().run();
              setPanel(null);
            }}
            className="ms-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-tint hover:text-tint-foreground"
          >
            {t("colors.default")}
          </button>
        </div>
      )}

      {panel === "citation" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border p-2">
          <span className="me-1 text-xs text-muted-foreground">
            {citationCount === 0 ? t("citationEmpty") : t("citationChoose")}
          </span>
          {Array.from({ length: citationCount }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-tint"
              onClick={() => {
                editor.chain().focus().insertContent({
                  type: "text",
                  text: `[${number}]`,
                  marks: [{ type: "superscript" }, { type: "link", attrs: { href: `#ref-${number}`, target: null } }],
                }).run();
                setPanel(null);
              }}
            >
              [{number}]
            </button>
          ))}
        </div>
      )}

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
      {panel === "video" && (
        <div className="space-y-2 border-t border-border p-2">
          {/* Either paste a YouTube link… */}
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
          {/* …or upload/pick a video from the Media Library. */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("orUpload")}</span>
            <div className="flex-1">
              <MediaPicker value={null} onChange={insertUploadedVideo} accept={["video"]} placeholderLabel={t("videoUploadPlaceholder")} />
            </div>
          </div>
        </div>
      )}
      {panel === "image" && (
        <div className="space-y-2 border-t border-border p-2">
          {/* Either paste a direct image URL… */}
          <UrlPanel
            placeholder={t("imageUrlPlaceholder")}
            confirmLabel={t("apply")}
            cancelLabel={t("cancel")}
            onConfirm={(url) => {
              editor.chain().focus().setImage({ src: url }).run();
              setPanel(null);
            }}
            onCancel={() => setPanel(null)}
          />
          {/* …or upload/pick from the Media Library. */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("orUpload")}</span>
            <div className="flex-1">
              <MediaPicker value={null} onChange={insertImage} accept={["image"]} placeholderLabel={t("imagePlaceholder")} />
            </div>
          </div>
        </div>
      )}
      {panel === "emoji" && (
        <div className="flex max-h-40 flex-wrap gap-0.5 overflow-y-auto border-t border-border p-2">
          {EMOJIS.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              type="button"
              onClick={() => editor.chain().focus().insertContent(emoji).run()}
              className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-tint"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Live word count + read-time estimate under the editor — the same
 *  200-wpm math the service persists, so what the author sees while
 *  writing is what the card will say. */
function EditorStatusBar({ editor }: { editor: Editor }) {
  const t = useTranslations("Admin.articleEditor.richText");
  // Same null/destroyed tolerance as the Toolbar's selector.
  const words = useEditorState({
    editor,
    selector: ({ editor: instance }) =>
      !instance || instance.isDestroyed ? 0 : (instance.storage.characterCount.words() as number),
  });
  const minutes = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));

  return (
    <div className="flex items-center justify-end gap-3 rounded-b-lg border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
      <span>{t("wordCount", { count: words })}</span>
      <span aria-hidden="true">·</span>
      <span>{t("readTime", { minutes })}</span>
    </div>
  );
}

/**
 * The article-body editor (Tiptap) — a controlled component over an HTML
 * string, so it slots behind a react-hook-form `Controller` exactly like
 * `MediaPicker` does. What the editor can produce is bounded by
 * `buildExtensions` above and re-bounded server-side by
 * `sanitizeArticleHtml` on every save — the sanitizer, not this UI, is
 * the security boundary.
 */
export function RichTextEditor({
  value,
  onChange,
  dir,
  placeholder,
  citationCount = 0,
}: {
  value: string;
  onChange: (html: string) => void;
  /** Text direction of the *content* being written (`rtl` for an Arabic
   *  article even when the admin UI itself is in English). */
  dir: "ltr" | "rtl";
  placeholder: string;
  citationCount?: number;
}) {
  const [mode, setMode] = useState<"visual" | "html" | "preview">("visual");
  const [htmlValue, setHtmlValue] = useState(value);
  const [cssValue, setCssValue] = useState("");
  const [jsValue, setJsValue] = useState("");
  const [codeTab, setCodeTab] = useState<"html" | "css" | "js">("html");
  const [previewLayout, setPreviewLayout] = useState<"split" | "full">("split");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor(
    {
      extensions: buildExtensions(placeholder),
      content: value,
      // Required with Next.js SSR — render only after hydration.
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: "rich-text-content min-h-48 px-3 py-3 focus:outline-none sm:min-h-96 sm:px-5 sm:py-4",
          dir,
        },
      },
      onUpdate: ({ editor: instance }) => {
        const html = instance.getHTML();
        onChange(html);
        setHtmlValue(html);
      },
    },
    // Recreate when the author flips the article language — `editorProps`
    // isn't reactive, and the writing direction must follow.
    [dir],
  );

  // External resets (form `reset()` after save/cancel) — push the new
  // value in without re-emitting an update, guarding against the echo of
  // our own `onUpdate` (`getHTML()` already equals `value` then).
  useEffect(() => {
    if (editor && !editor.isDestroyed && value !== editor.getHTML()) {
      editor.commands.setContent(value, { emitUpdate: false });
      setHtmlValue(value);
    }
  }, [editor, value]);

  // Sync HTML mode changes back to the visual editor
  const handleHtmlChange = (newHtml: string) => {
    setHtmlValue(newHtml);
    onChange(newHtml);
    if (editor && !editor.isDestroyed) {
      editor.commands.setContent(newHtml, { emitUpdate: false });
    }
  };

  // Read dropped/selected files and route each to the matching tab by extension.
  function handleImportFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        const ext = file.name.split(".").pop()?.toLowerCase();
        if (ext === "html") { handleHtmlChange(text); setCodeTab("html"); }
        else if (ext === "css") { setCssValue(text); setCodeTab("css"); }
        else if (ext === "js") { setJsValue(text); setCodeTab("js"); }
      };
      reader.readAsText(file);
    });
    // Reset so the same file can be imported again if needed.
    e.target.value = "";
  }

  return (
    <div className="overflow-x-hidden rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
      {/* Hidden file input — triggered by Import buttons in HTML/Preview modes */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".html,.css,.js"
        multiple
        className="hidden"
        onChange={handleImportFiles}
      />
      {editor && <Toolbar editor={editor} citationCount={citationCount} mode={mode} onModeChange={setMode} />}

      {mode === "visual" && (
        <>
          {/* The writing area scrolls internally, capped to the viewport — so
              on a long article the toolbar stays pinned above and the status
              bar below, instead of scrolling out of reach with the page. */}
          <div className="max-h-[50vh] overflow-y-auto overscroll-contain sm:max-h-[65vh]">
            <EditorContent editor={editor} />
          </div>
          {editor && <EditorStatusBar editor={editor} />}
        </>
      )}

      {mode === "html" && (
        <div className="flex max-h-[65vh] flex-col">
          {/* Tab bar */}
          <div className="flex items-center border-b border-border bg-muted/30">
            {(["html", "css", "js"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCodeTab(tab)}
                className={cn(
                  "px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                  codeTab === tab
                    ? "border-b-2 border-primary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab}
              </button>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Import .html / .css / .js file"
              className="ms-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Upload className="size-3.5" />
              <span>Import</span>
            </button>
          </div>
          {codeTab === "html" && (
            <textarea
              value={htmlValue}
              onChange={(e) => handleHtmlChange(e.target.value)}
              placeholder={placeholder}
              className="min-h-48 flex-1 resize-none px-5 py-4 font-mono text-sm focus:outline-none"
              spellCheck="false"
            />
          )}
          {codeTab === "css" && (
            <textarea
              value={cssValue}
              onChange={(e) => setCssValue(e.target.value)}
              placeholder="/* Add custom CSS styles here */"
              className="min-h-48 flex-1 resize-none px-5 py-4 font-mono text-sm focus:outline-none"
              spellCheck="false"
            />
          )}
          {codeTab === "js" && (
            <textarea
              value={jsValue}
              onChange={(e) => setJsValue(e.target.value)}
              placeholder="// Add custom JavaScript here"
              className="min-h-48 flex-1 resize-none px-5 py-4 font-mono text-sm focus:outline-none"
              spellCheck="false"
            />
          )}
          <div className="border-t border-border bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
            {codeTab === "html" && "HTML — edit raw markup"}
            {codeTab === "css" && "CSS — styles applied in preview"}
            {codeTab === "js" && "JS — script executed in preview"}
          </div>
        </div>
      )}

      {mode === "preview" && (
        <div className="flex max-h-[65vh] flex-col">
          {/* Layout toggle bar */}
          <div className="flex items-center gap-1 border-b border-border bg-muted/30 px-3 py-1">
            <span className="me-1 text-xs text-muted-foreground">Layout:</span>
            <button
              type="button"
              onClick={() => setPreviewLayout("split")}
              className={cn(
                "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
                previewLayout === "split"
                  ? "bg-tint text-tint-foreground"
                  : "text-muted-foreground hover:bg-tint/60 hover:text-tint-foreground",
              )}
            >
              Split
            </button>
            <button
              type="button"
              onClick={() => setPreviewLayout("full")}
              className={cn(
                "rounded px-2.5 py-0.5 text-xs font-medium transition-colors",
                previewLayout === "full"
                  ? "bg-tint text-tint-foreground"
                  : "text-muted-foreground hover:bg-tint/60 hover:text-tint-foreground",
              )}
            >
              Preview only
            </button>
          </div>

          <div className={cn("flex min-h-0 flex-1", previewLayout === "split" ? "flex-col md:flex-row" : "flex-col")}>
            {/* Code editor panel — hidden in full-preview layout */}
            {previewLayout === "split" && (
              <div className="flex flex-col border-b border-border md:w-1/2 md:border-b-0 md:border-r">
                <div className="flex items-center border-b border-border bg-muted/50">
                  {(["html", "css", "js"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setCodeTab(tab)}
                      className={cn(
                        "px-4 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors",
                        codeTab === tab
                          ? "border-b-2 border-primary text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title="Import .html / .css / .js file"
                    className="ms-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <Upload className="size-3.5" />
                    <span>Import</span>
                  </button>
                </div>
                {codeTab === "html" && (
                  <textarea
                    value={htmlValue}
                    onChange={(e) => handleHtmlChange(e.target.value)}
                    placeholder={placeholder}
                    className="h-48 w-full resize-none px-4 py-4 font-mono text-sm focus:outline-none md:h-full"
                    spellCheck="false"
                  />
                )}
                {codeTab === "css" && (
                  <textarea
                    value={cssValue}
                    onChange={(e) => setCssValue(e.target.value)}
                    placeholder="/* Add custom CSS styles here */"
                    className="h-48 w-full resize-none px-4 py-4 font-mono text-sm focus:outline-none md:h-full"
                    spellCheck="false"
                  />
                )}
                {codeTab === "js" && (
                  <textarea
                    value={jsValue}
                    onChange={(e) => setJsValue(e.target.value)}
                    placeholder="// Add custom JavaScript here"
                    className="h-48 w-full resize-none px-4 py-4 font-mono text-sm focus:outline-none md:h-full"
                    spellCheck="false"
                  />
                )}
              </div>
            )}

            {/* Live preview in sandboxed iframe */}
            <div className={cn("flex min-h-48 flex-col overflow-hidden", previewLayout === "split" ? "md:w-1/2" : "flex-1")}>
              <iframe
                ref={iframeRef}
                title="preview"
                sandbox="allow-scripts"
                className="flex-1 bg-white"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:sans-serif;padding:1rem;margin:0}${cssValue}</style></head><body>${htmlValue}<script>${jsValue}<\/script></body></html>`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
