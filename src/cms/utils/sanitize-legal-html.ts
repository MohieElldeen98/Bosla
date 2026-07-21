import sanitizeHtml from "sanitize-html";

/**
 * The single sanitization point for legal document bodies
 * (docs/legal-content-platform.md §Static Content CMS) —
 * `LegalDocumentService` runs every content write through this before it
 * reaches the repository, mirroring `sanitize-article-html.ts`'s exact
 * "sanitize at write time, render trusts the DB" reasoning. The
 * allowlist is deliberately narrower than the blog's — a legal document
 * is structured prose (headings, paragraphs, lists, a table at most),
 * never images, video, or interactive blocks — so the same shared
 * `RichTextEditor` component can be reused for authoring without also
 * reusing its full formatting surface: whatever a legal editor produces
 * outside this allowlist is stripped, not escaped.
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
    "a",
    "ul",
    "ol",
    "li",
    "blockquote",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    // `id` on headings is the Table of Contents' anchor target —
    // `injectHeadingIds` (toc.ts) sets these deterministically at
    // render time regardless of what the editor produced, but the
    // attribute itself must survive sanitization either way.
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
  },
  allowedSchemes: ["https", "http", "mailto", "tel"],
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.href?.startsWith("#")) {
        const { target: _target, rel: _rel, ...rest } = attribs;
        return { tagName, attribs: rest };
      }
      return { tagName, attribs: { ...attribs, rel: "noopener noreferrer" } };
    },
  },
};

export function sanitizeLegalHtml(html: string): string {
  return sanitizeHtml(html, SANITIZE_OPTIONS);
}
