import type { LegalTocEntry } from "@/cms/utils/legal-toc";

/** The known legal document slugs (docs/legal-content-platform.md) —
 *  documentation of today's vocabulary, not a closed type: `slug` is
 *  plain `text` at the DB layer so a future legal page (a Cookie
 *  Policy, an Instructor Agreement) is a new row, never a migration. */
export const LEGAL_DOCUMENT_SLUGS = ["privacy", "terms", "refunds"] as const;
export type LegalDocumentSlug = (typeof LEGAL_DOCUMENT_SLUGS)[number];

/** Mirrors `db/schema/legal.ts`'s `legal_documents` table. */
export interface LegalDocument {
  id: string;
  slug: string;
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  version: number;
  published: boolean;
  publishedAt: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

/** What the public `/privacy` `/terms` `/refunds` pages actually render
 *  — locale-flattened, with heading ids injected and the Table of
 *  Contents pre-extracted (`buildLegalToc`) so the page component does
 *  no HTML processing of its own. */
export interface ResolvedLegalDocument {
  slug: string;
  title: string;
  html: string;
  toc: LegalTocEntry[];
  version: number;
  publishedAt: string;
}

export interface UpdateLegalDocumentInput {
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
}
