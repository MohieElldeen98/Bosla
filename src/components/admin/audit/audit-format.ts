import type { AuditDomain, AuditFeedEntry } from "@/audit/types/audit-feed";

export function humanizeAction(action: string): string {
  return action.replace(/[_.]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/**
 * Best-effort "human name" for an entity — no domain's audit metadata
 * currently stores a resolved title (checked every `record*AuditLog`
 * call site: course/article updates log `{ target: "seo" }`, role
 * changes log `{ fromRole, toRole }`, media logs `storageKey` — nothing
 * else carries a name/title). This only ever surfaces something for
 * entries that happen to already carry one of these keys; silently
 * omitted otherwise, never fabricated. Real resolution (joining
 * course/article tables by `entityId`) would mean enriching
 * `AuditFeedService` itself — out of scope for a presentation-only
 * redesign that leaves the service untouched.
 */
const READABLE_METADATA_KEYS = [
  "title",
  "name",
  "label",
  "filename",
  "fileName",
  "storageKey",
  "storagePath",
  "settingKey",
  "displayName",
];

export function readableEntityLabel(metadata: Record<string, unknown>): string | null {
  for (const key of READABLE_METADATA_KEYS) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

/**
 * Only the domains below have a real, verified, `[id]`-addressable admin
 * page that resolves `entityId` to something the admin can actually open
 * — checked against the real route tree, not assumed:
 * `/admin/courses/[id]/edit`, `/admin/articles/[id]/edit`,
 * `/admin/orders/[id]`, `/admin/coupons/[id]/edit`, `/admin/users/[id]`.
 * All five already degrade to their own `EmptyState` for a missing/
 * deleted record (same "bad id → EmptyState, not a crash" precedent
 * `AdminEditCoursePage`'s own doc comment states) — so linking is safe
 * without an existence check, which is exactly why none is done here.
 * `learning`'s `entityId` is itself a `courseId` (see `AuditFeedService`'s
 * `DOMAIN_FETCHERS.learning`), so it reuses the course route; `profile`'s
 * `entityId` is the *target* user of a role/status change, distinct from
 * the actor, so it reuses the user route too.
 *
 * The remaining 7 domains (`media`, `cms`, `category`, `instructorProfile`,
 * `revenue`, `siteSettings`, `navigation`) are deliberately excluded: each
 * is either a singleton/list-only admin page with no `[id]` route, or an
 * id shape (`settingKey`, a mixed `entityType`) that doesn't address one.
 * No new route was added to close that gap — an entity in one of these
 * domains renders as plain (unlinked) text, exactly as before.
 */
const ENTITY_LINK_BUILDERS: Partial<Record<AuditDomain, (entityId: string) => string>> = {
  course: (id) => `/admin/courses/${id}/edit`,
  learning: (id) => `/admin/courses/${id}/edit`,
  article: (id) => `/admin/articles/${id}/edit`,
  order: (id) => `/admin/orders/${id}`,
  coupon: (id) => `/admin/coupons/${id}/edit`,
  profile: (id) => `/admin/users/${id}`,
};

export function resolveEntityHref(domain: AuditDomain, entityId: string | null): string | null {
  if (!entityId) return null;
  return ENTITY_LINK_BUILDERS[domain]?.(entityId) ?? null;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Deterministic hash → color so the same actor always gets the same
 *  avatar tint across rows/pages without storing anything new. */
const AVATAR_PALETTE = [
  "bg-red-500/15 text-red-700 dark:text-red-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400",
  "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-400",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400",
];

export function avatarColorFor(key: string): string {
  let hash = 0;
  for (let index = 0; index < key.length; index += 1) hash = (hash * 31 + key.charCodeAt(index)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function formatRelativeTime(iso: string, locale: string): string {
  const diffMinutes = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffMinutes) < 60) return rtf.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  return rtf.format(Math.round(diffHours / 24), "day");
}

export function toDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

export interface AuditDatePreset {
  id: string;
  labelKey: string;
  range: () => { from: string; to: string };
}

/** Each preset just computes the same `YYYY-MM-DD` calendar-day strings
 *  the native date inputs already produce, so it flows through the
 *  exact same `updateParams`/`endOfCalendarDay` pipeline — no parallel
 *  filter logic. */
export const AUDIT_DATE_PRESETS: AuditDatePreset[] = [
  {
    id: "today",
    labelKey: "today",
    range: () => {
      const today = toDateOnly(new Date());
      return { from: today, to: today };
    },
  },
  {
    id: "yesterday",
    labelKey: "yesterday",
    range: () => {
      const yesterday = toDateOnly(addDays(new Date(), -1));
      return { from: yesterday, to: yesterday };
    },
  },
  {
    id: "last7Days",
    labelKey: "last7Days",
    range: () => ({ from: toDateOnly(addDays(new Date(), -6)), to: toDateOnly(new Date()) }),
  },
  {
    id: "last30Days",
    labelKey: "last30Days",
    range: () => ({ from: toDateOnly(addDays(new Date(), -29)), to: toDateOnly(new Date()) }),
  },
  {
    id: "thisMonth",
    labelKey: "thisMonth",
    range: () => {
      const now = new Date();
      return { from: toDateOnly(new Date(now.getFullYear(), now.getMonth(), 1)), to: toDateOnly(now) };
    },
  },
  {
    id: "lastMonth",
    labelKey: "lastMonth",
    range: () => {
      const now = new Date();
      const lastDayOfPrevMonth = addDays(new Date(now.getFullYear(), now.getMonth(), 1), -1);
      const firstDayOfPrevMonth = new Date(lastDayOfPrevMonth.getFullYear(), lastDayOfPrevMonth.getMonth(), 1);
      return { from: toDateOnly(firstDayOfPrevMonth), to: toDateOnly(lastDayOfPrevMonth) };
    },
  },
];

function toCsvField(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Client-side only, exports exactly the rows currently on screen (the
 * active page, ≤ the page-size limit) — never the full filtered result
 * set. Fetching every page would mean looping the cursor client-side, a
 * pagination-shaped feature this redesign was explicitly scoped to
 * leave untouched (see the export button's hint text).
 */
export function auditEntriesToCsv(entries: AuditFeedEntry[]): string {
  const header = ["Time (UTC)", "Actor Name", "Actor Email", "Domain", "Action", "Entity ID", "Metadata"];
  const rows = entries.map((entry) => [
    entry.createdAt,
    entry.actorName ?? "",
    entry.actorEmail ?? "",
    entry.domain,
    entry.action,
    entry.entityId ?? "",
    JSON.stringify(entry.metadata),
  ]);
  return [header, ...rows].map((row) => row.map(toCsvField).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // UTF-8 BOM so Excel renders Arabic actor names correctly instead of mojibake.
  const BOM = String.fromCharCode(0xfeff);
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
