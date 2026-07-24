import { z } from "zod";
import { AUDIT_DOMAINS } from "@/audit/types/audit-feed";
import type { AuditFeedCursor } from "@/audit/types/audit-feed";

/**
 * `/admin/audit`'s search-param shape — same "malformed/missing params
 * degrade to defaults, never crash" convention `searchCoursesSchema`/
 * `searchProfilesAdminSchema` already establish. Cursor pagination isn't
 * part of this schema (see `parseCursorStack` below) since it isn't a
 * single scalar value.
 */
export const auditFeedSearchParamsSchema = z.object({
  query: z.string().optional(),
  domain: z.enum(AUDIT_DOMAINS).optional(),
  action: z.string().optional(),
  actorId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});
export type AuditFeedSearchParams = z.infer<typeof auditFeedSearchParamsSchema>;

/**
 * Keyset ("seek") pagination has no natural "page number" the way
 * offset pagination does, so `AuditViewerManager` reuses the existing
 * `<Pagination>` component's Previous/Next affordance by tracking the
 * *stack* of cursors used to reach the current page in one URL param:
 * `cursors=createdAt1,id1|createdAt2,id2|...`, one entry per "Next"
 * already clicked. `page = stack.length + 1`; the current page's data
 * comes from `stack[stack.length - 1]` (or the first page if empty).
 * "Previous" pops the stack — no reverse query needed. Shared between
 * `page.tsx` (parses it server-side to call `AuditFeedService.search`)
 * and `AuditViewerManager` (serializes the next/previous stack when
 * pushing a new URL) so the format is defined exactly once.
 */
export function parseCursorStack(raw: string | undefined): AuditFeedCursor[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((entry): AuditFeedCursor | null => {
      const [createdAt, id] = entry.split(",");
      return createdAt && id ? { createdAt, id } : null;
    })
    .filter((cursor): cursor is AuditFeedCursor => cursor !== null);
}

export function serializeCursorStack(stack: AuditFeedCursor[]): string | undefined {
  if (stack.length === 0) return undefined;
  return stack.map((cursor) => `${cursor.createdAt},${cursor.id}`).join("|");
}
