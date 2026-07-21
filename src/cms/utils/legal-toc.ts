/**
 * Table of Contents extraction for legal documents
 * (docs/legal-content-platform.md §Page Design — "sticky table of
 * contents"). Deliberately NOT something the admin sets by hand in the
 * editor: heading ids are derived deterministically from heading text at
 * render time, the same "docs site" convention GitHub/MDN use, so any
 * legal document written through the plain `RichTextEditor` gets a
 * working TOC with zero extra authoring steps. Runs only over
 * `sanitizeLegalHtml`'s OWN output (trusted, already stripped of
 * anything unsafe) — this is a text transform, not a second security
 * boundary.
 *
 * Scoped to `h2`/`h3` only: `h1` is reserved for the page's own title
 * (rendered separately in the Hero, never inside the document body), so
 * a TOC built from every heading level would duplicate it.
 */
export interface LegalTocEntry {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface LegalTocResult {
  /** The original HTML with `id` attributes injected onto every h2/h3 —
   *  what actually gets rendered via `dangerouslySetInnerHTML`. */
  html: string;
  toc: LegalTocEntry[];
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Unicode-aware slug — keeps Arabic letters as-is (there is no
 *  meaningful Latin transliteration to fall back to), strips everything
 *  else to hyphens. */
function slugify(text: string): string {
  const slug = text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return slug || "section";
}

export function buildLegalToc(html: string): LegalTocResult {
  const usedSlugs = new Map<string, number>();
  const toc: LegalTocEntry[] = [];

  const outputHtml = html.replace(/<(h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, rawTag, attrs, inner) => {
    const tag = rawTag.toLowerCase() as "h2" | "h3";
    const text = stripTags(inner);
    if (!text) return match;

    const baseSlug = slugify(text);
    const occurrence = usedSlugs.get(baseSlug) ?? 0;
    usedSlugs.set(baseSlug, occurrence + 1);
    const id = occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence + 1}`;

    toc.push({ id, text, level: tag === "h2" ? 2 : 3 });

    const cleanedAttrs = (attrs as string).replace(/\s+id="[^"]*"/gi, "");
    return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
  });

  return { html: outputHtml, toc };
}
