/**
 * Table of Contents extraction for public blog articles — the same
 * deterministic "docs site" approach `buildLegalToc` takes for legal
 * documents (heading ids derived from heading text at render time, never
 * authored by hand), so any article written through the plain
 * `RichTextEditor` gets a working sidebar with zero extra authoring
 * steps. Two things differ, both driven by what the blog editor actually
 * produces:
 *
 * - `h1` counts as a section heading here. A legal document reserves `h1`
 *   for the page title, but an article's title is rendered by the page
 *   *outside* the body — so writers routinely reach for H1 in the Tiptap
 *   toolbar (which offers H1–H4) as their top-level section heading.
 *   Scoping to h2/h3 like the legal TOC would leave those articles with
 *   an empty sidebar.
 * - `depth` is relative, not absolute: an article written with h1/h2 and
 *   one written with h2/h3 both come out as a flat top level plus one
 *   indent, instead of the first being indented a step for no reason.
 *   `h4` is deliberately left out — at that level a heading is a detail
 *   inside a section, not a destination worth a TOC row.
 *
 * Runs only over `sanitizeArticleHtml`'s OWN output (trusted, already
 * stripped of anything unsafe), so this is a text transform, not a second
 * security boundary.
 */
export interface ArticleTocEntry {
  id: string;
  text: string;
  /** Indent step: 0 = top level, 1+ = nested. Relative to the heading
   *  levels this article actually uses — see the note above. */
  depth: number;
}

export interface ArticleTocResult {
  /** The original HTML with `id` attributes injected onto every h1/h2/h3 —
   *  what actually gets rendered via `dangerouslySetInnerHTML`. */
  html: string;
  toc: ArticleTocEntry[];
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

export function buildArticleToc(html: string): ArticleTocResult {
  const usedSlugs = new Map<string, number>();
  const headings: { id: string; text: string; level: number }[] = [];

  const outputHtml = html.replace(/<(h1|h2|h3)([^>]*)>([\s\S]*?)<\/\1>/gi, (match, rawTag, attrs, inner) => {
    const tag = (rawTag as string).toLowerCase();
    const text = stripTags(inner as string);
    // A heading holding only an image (or nothing) has no label to show
    // and nothing to link to — left exactly as authored, id and all.
    if (!text) return match;

    const baseSlug = slugify(text);
    const occurrence = usedSlugs.get(baseSlug) ?? 0;
    usedSlugs.set(baseSlug, occurrence + 1);
    const id = occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence + 1}`;

    headings.push({ id, text, level: Number(tag.slice(1)) });

    // `id` isn't in the sanitizer's allowlist, so a stored body can't
    // already carry one — stripped anyway to keep this idempotent.
    const cleanedAttrs = (attrs as string).replace(/\s+id="[^"]*"/gi, "");
    return `<${tag}${cleanedAttrs} id="${id}">${inner}</${tag}>`;
  });

  // Depth is the heading's rank among the levels this article actually
  // uses, not `level - shallowest` — an article that skips a level
  // (h1 sections, h3 sub-sections, no h2) reads as one step down to the
  // reader and should indent one step, not two.
  const levelRanks = new Map(
    [...new Set(headings.map((heading) => heading.level))].sort((a, b) => a - b).map((level, index) => [level, index]),
  );
  const toc = headings.map(({ id, text, level }) => ({
    id,
    text,
    depth: levelRanks.get(level) ?? 0,
  }));

  return { html: outputHtml, toc };
}
