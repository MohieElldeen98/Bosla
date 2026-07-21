import { diffWordsWithSpace } from "diff";
import type { LegalDiffSegment } from "@/cms/types/legal-document-version";

/** Diff readable text rather than stored HTML so editor comparisons describe
 * what an admin sees, not every incidental tag or attribute change. */
export function stripLegalHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export function diffLegalContent(fromHtml: string, toHtml: string): LegalDiffSegment[] {
  return diffWordsWithSpace(stripLegalHtml(fromHtml), stripLegalHtml(toHtml)).map((part) => ({
    value: part.value,
    added: Boolean(part.added),
    removed: Boolean(part.removed),
  }));
}
