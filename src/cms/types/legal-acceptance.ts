import type { CmsActionResult } from "@/cms/types/result";

export const LEGAL_ACCEPTANCE_SLUGS = ["terms", "privacy"] as const;
export type LegalAcceptanceSlug = (typeof LEGAL_ACCEPTANCE_SLUGS)[number];

export type LegalAcceptancePendingDocument = {
  slug: LegalAcceptanceSlug;
  title: { en: string; ar: string };
  version: number;
};

export type LegalAcceptanceStatus = {
  needsAcceptance: boolean;
  pending: LegalAcceptancePendingDocument[];
};

export type LegalAcceptanceActionResult = CmsActionResult<undefined>;

/** Per-version acceptance summary — the "Accepted by" block on
 *  `/admin/content/[id]`'s version history. `totalUsers` is the
 *  platform-wide user count at read time (via `ProfileService`, the
 *  same source `/admin`'s dashboard stat card uses), not stored — the
 *  percentage is always computed fresh, never a stale snapshot. */
export type LegalDocumentVersionAcceptanceStats = {
  versionId: string;
  acceptedCount: number;
  totalUsers: number;
  acceptancePercentage: number;
  firstAcceptedAt: string | null;
  lastAcceptedAt: string | null;
};

/** One row in "Users who accepted this version" — the acceptance row
 *  resolved against the accepting user's profile (name/email), same
 *  composition-at-the-service-layer convention every cross-domain
 *  display list in this repo already follows (no SQL join). */
export type LegalDocumentVersionAcceptor = {
  userId: string;
  name: string;
  email: string;
  acceptedAt: string;
};

export const DEFAULT_LEGAL_ACCEPTANCE_PAGE_SIZE = 20;

export type LegalDocumentVersionAcceptorFilters = {
  query?: string;
  page?: number;
  pageSize?: number;
};

export type LegalDocumentVersionAcceptorResult = {
  items: LegalDocumentVersionAcceptor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
