import type { Locale } from "@/i18n/routing";

export interface LegalDocumentVersion {
  id: string;
  documentId: string;
  version: number;
  titleEn: string;
  titleAr: string;
  contentEn: string;
  contentAr: string;
  publishedAt: string;
  publishedByUserId: string | null;
  createdAt: string;
}

export type LegalDocumentVersionListItem = Omit<LegalDocumentVersion, "contentEn" | "contentAr">;

export interface LegalDiffSegment {
  value: string;
  added: boolean;
  removed: boolean;
}

export interface LegalDocumentVersionComparison {
  fromVersionId: string;
  toVersionId: string;
  locale: Locale;
  segments: LegalDiffSegment[];
}
