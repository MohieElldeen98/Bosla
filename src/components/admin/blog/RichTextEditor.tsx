"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { getResolvedMediaByIdAction } from "@/cms/actions/media.actions";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/** Matches `blog/utils/read-time.ts`'s words-per-minute so the editor's
 *  live estimate agrees with the value the service stores on save. */
const WORDS_PER_MINUTE = 200;

/** The curated text-color palette — theme variables / fixed accents that
 *  hold up in dark mode, never a free color picker (brand consistency).
 *  Must stay in sync with the sanitizer's `span` color allowlist
 *  (`blog/utils/sanitize-article-html.ts`). */
const TEXT_COLORS = [
  { key: "primary", value: "var(--primary)" },
  { key: "green", value: "oklch(0.63 0.17 155)" },
  { key: "amber", value: "oklch(0.68 0.16 65)" },
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

/** The exact formatting set `blog/utils/sanitize-article-html.ts` allows —
 *  the two must stay in sync: a mark/node added here without extending the
 *  sanitizer's allowlist would silently disappear on save. */
function buildExtensions(placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4] },
      link: { openOnClick: false },
    }),
    Image,
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

function Toolbar({ editor, citationCount }: { editor: Editor; citationCount: number }) {
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
          heading: false,
          headingDivider: false,
          card: false,
          cardAccent: "none" as CardAccent,
          alignLeft: false,
          alignCenter: false,
          alignRight: false,
          canUndo: false,
          canRedo: false,
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
        heading: instance.isActive("heading"),
        headingDivider: instance.getAttributes("heading").divider === true,
        card: instance.isActive("card"),
        cardAccent: (instance.getAttributes("card").accent ?? "none") as CardAccent,
        alignLeft: instance.isActive({ textAlign: "left" }),
        alignCenter: instance.isActive({ textAlign: "center" }),
        alignRight: instance.isActive({ textAlign: "right" }),
        canUndo: instance.can().undo(),
        canRedo: instance.can().redo(),
      };
    },
  });

  async function insertImage(assetId: string | null) {
    if (!assetId) return;
    const asset = await getResolvedMediaByIdAction(assetId, locale);
    if (asset) {
      editor.chain().focus().setImage({ src: asset.url, alt: asset.alt ?? "" }).run();
    }
    setPanel(null);
  }

  async function insertUploadedVideo(assetId: string | null) {
    if (!assetId) return;
    const asset = await getResolvedMediaByIdAction(assetId, locale);
    if (asset) {
      editor.chain().focus().setUploadedVideo(asset.url).run();
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
        <ToolbarDivider />
        <FontSizeInput
          editor={editor}
          label={t("fontSize")}
          explicitSize={state.fontSize}
          computedSize={state.computedFontSize}
        />
        <ToolbarDivider />
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
        <ToolbarDivider />
        <ToolbarButton
          label={t("alignLeft")}
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          isActive={state.alignLeft}
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("alignCenter")}
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          isActive={state.alignCenter}
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("alignRight")}
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          isActive={state.alignRight}
        >
          <AlignRight className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
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
        <ToolbarDivider />
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
          disabled={citationCount === 0}
        >
          <BookOpen className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label={t("table")}
          onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
          isActive={state.table}
        >
          <Grid2x2Plus className="size-4" />
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          label={t("clearFormatting")}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <Eraser className="size-4" />
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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
              )}
            >
              {t(`calloutVariants.${variant}`)}
            </button>
          ))}
        </div>
      )}

      {/* Card operations — only with the caret inside a card grid. */}
      {state.card && (
        <div className="flex flex-wrap items-center gap-1 border-t border-border p-1.5">
          <button
            type="button"
            onClick={() => editor.chain().focus().addCard().run()}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-accent-foreground"
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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
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
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground",
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
            className="ms-1 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {t("colors.default")}
          </button>
        </div>
      )}

      {panel === "citation" && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border p-2">
          <span className="me-1 text-xs text-muted-foreground">{t("citationChoose")}</span>
          {Array.from({ length: citationCount }, (_, index) => index + 1).map((number) => (
            <button
              key={number}
              type="button"
              className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-primary transition-colors hover:bg-accent"
              onClick={() => {
                editor.chain().focus().insertContent({
                  type: "text",
                  text: `[${number}]`,
                  marks: [{ type: "superscript" }, { type: "link", attrs: { href: `#ref-${number}` } }],
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
              className="flex size-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-accent"
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
  const editor = useEditor(
    {
      extensions: buildExtensions(placeholder),
      content: value,
      // Required with Next.js SSR — render only after hydration.
      immediatelyRender: false,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: {
          class: "rich-text-content min-h-96 px-5 py-4 focus:outline-none",
          dir,
        },
      },
      onUpdate: ({ editor: instance }) => {
        onChange(instance.getHTML());
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
    }
  }, [editor, value]);

  return (
    <div className="rounded-lg border border-input bg-background shadow-xs focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30">
      {editor && <Toolbar editor={editor} citationCount={citationCount} />}
      {/* The writing area scrolls internally, capped to the viewport — so
          on a long article the toolbar stays pinned above and the status
          bar below, instead of scrolling out of reach with the page. */}
      <div className="max-h-[65vh] overflow-y-auto overscroll-contain">
        <EditorContent editor={editor} />
      </div>
      {editor && <EditorStatusBar editor={editor} />}
    </div>
  );
}
