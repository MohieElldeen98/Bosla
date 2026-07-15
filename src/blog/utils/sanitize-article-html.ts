import sanitizeHtml from "sanitize-html";

/**
 * The single sanitization point for article bodies — `ArticleService`
 * runs every body write (create *and* update) through this before it
 * reaches the repository, so `articles.body` only ever holds HTML that is
 * safe to render with `dangerouslySetInnerHTML` on the public page.
 * Sanitizing at write time (not render time) means the public page never
 * pays the cost per request, and a tampered direct call to the Server
 * Action can't smuggle script past the editor UI.
 *
 * The allowlist mirrors what the admin Tiptap editor can actually produce
 * (StarterKit + Link + Image + Youtube) — anything else is stripped, not
 * escaped. `iframe` is allowed for YouTube embeds only, locked to the
 * YouTube hostnames Tiptap's extension emits.
 */
const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "sub",
    "sup",
    "mark",
    "span",
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "img",
    "figure",
    "figcaption",
    "iframe",
    "video",
    "div",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "colgroup",
    "col",
    // The quiz block's choices — safe without event handlers; the public
    // page's `ArticleQuizzes` hydrator is what makes them interactive.
    "button",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding", "draggable", "data-align", "data-width"],
    iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "start"],
    // Media Library uploads (`UploadedVideo`) — src is scheme-checked by
    // `allowedSchemes` like every other src/href.
    video: ["src", "controls", "preload", "controlslist", "disablepictureinpicture"],
    table: ["data-style"],
    div: ["data-youtube-video", "data-variant", "data-accent"],
    // Tiptap's TextAlign extension writes an inline `text-align` style on
    // blocks — `allowedStyles` below restricts it to exactly that.
    p: ["style"],
    h1: ["style"],
    h2: ["style"],
    h3: ["style"],
    h4: ["style"],
    th: ["colspan", "rowspan", "colwidth", "style"],
    td: ["colspan", "rowspan", "colwidth", "style"],
    col: ["span", "style"],
    button: ["type", "data-correct", "data-feedback"],
    // The curated text-color palette (`RichTextEditor`'s TEXT_COLORS) —
    // the regex below allowlists exactly those values, nothing else.
    span: ["style"],
  },
  // Classes are the hooks `.rich-text-content` styles and the quiz
  // hydrator key off — allowlisted exactly, never wholesale (`class` is
  // deliberately NOT in `allowedAttributes`).
  allowedClasses: {
    div: ["callout", "quiz", "quiz-choices", "panel", "panel-header", "panel-body", "card-grid", "card"],
    p: ["lede", "quiz-question", "quiz-feedback"],
    span: ["panel-title", "panel-meta"],
    button: ["quiz-choice"],
    h1: ["heading-divider"],
    h2: ["heading-divider"],
    h3: ["heading-divider"],
    h4: ["heading-divider"],
  },
  allowedStyles: {
    "*": { "text-align": [/^(left|right|center|justify)$/] },
    col: { width: [/^\d+(px|%)$/] },
    span: {
      color: [/^(var\(--primary\)|var\(--destructive\)|oklch\(0\.63 0\.17 155\)|oklch\(0\.68 0\.16 65\))$/],
      // The editor's free-typed size, clamped to its editorial range.
      "font-size": [/^([1-6][0-9]|7[0-2])px$/],
    },
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "youtube.com"],
  transformTags: {
    // Every external link opens safely — but in-page citation anchors
    // (#ref-n) must NOT inherit Tiptap's default target="_blank", or the
    // jump-to-source opens a new tab instead of scrolling.
    a: (tagName, attribs) => {
      if (attribs.href?.startsWith("#")) {
        const { target: _target, rel: _rel, ...rest } = attribs;
        return { tagName, attribs: rest };
      }
      return { tagName, attribs: { ...attribs, rel: "noopener noreferrer" } };
    },
    // Performance + protection stamped at write time so the public page
    // renders them with zero per-request work: lazy/async images that
    // can't be drag-saved, and a player without the download button.
    img: sanitizeHtml.simpleTransform("img", {
      loading: "lazy",
      decoding: "async",
      draggable: "false",
    }),
    video: sanitizeHtml.simpleTransform("video", {
      controlslist: "nodownload",
      disablepictureinpicture: "",
      preload: "metadata",
    }),
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
