import sanitizeHtml from "sanitize-html";
import type { LocalizedText } from "@/types/i18n";

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
    "div",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: ["src", "width", "height", "allowfullscreen", "frameborder", "start"],
    div: ["data-youtube-video"],
  },
  allowedSchemes: ["https", "http", "mailto"],
  allowedIframeHostnames: ["www.youtube.com", "www.youtube-nocookie.com", "youtube.com"],
  transformTags: {
    // Every link opens safely — Tiptap's Link extension sets these too,
    // but a hand-crafted payload wouldn't.
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
  },
};

export function sanitizeArticleHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}

/** Sanitizes each locale's HTML independently. */
export function sanitizeArticleBody(body: LocalizedText): LocalizedText {
  return Object.fromEntries(
    Object.entries(body).map(([locale, html]) => [locale, sanitizeArticleHtml(html)]),
  ) as LocalizedText;
}
