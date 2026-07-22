import { inArray, or, sql, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { cmsSeoMeta, cmsSections } from "@/db/schema/cms";
import { articles } from "@/db/schema/articles";
import { courses, instructors } from "@/db/schema/course";
import { lessonAttachments, lessons, modules } from "@/db/schema/learning";
import { legalDocuments } from "@/db/schema/legal";
import { profiles } from "@/db/schema/profiles";
import type { MediaAssetUsage } from "@/cms/types/media-usage";

/**
 * Every place this codebase attaches a Media Library asset — the single
 * source of truth `search()`'s "used"/"unused" filter and `findUsages`'s
 * detailed list both build on, so the two can never disagree about what
 * counts as "in use".
 *
 * Two tiers, both represented: a direct foreign key (`instructors
 * .avatar_image_id`, `courses.cover_image_id`, …) is certain — the
 * reference is structural, not guessable wrong. A JSONB/text content
 * column (`cms_sections.content`, `articles.body`, `profiles.avatar_url`,
 * …) never stores a typed FK — an inserted image is a URL or a bare id
 * buried in an arbitrary rich-text/section-content blob — so those are
 * matched by substring instead. This still catches URL-shaped references
 * (`/api/media/{id}/variant/medium`) because the id always appears
 * verbatim inside them; it can only miss a *legacy* pre-migration asset
 * (`storage_key IS NULL`) referenced by a raw Supabase Storage URL with
 * no id in it — `MediaGridCard`'s "legacy" note exists for exactly that
 * gap, not this function.
 */
const USAGE_SOURCES = [
  {
    type: "instructor-avatar",
    table: instructors,
    match: (id: SQL) => sql`${instructors.avatarImageId} = ${id}`,
  },
  {
    type: "instructor-portrait",
    table: instructors,
    match: (id: SQL) => sql`${instructors.publicPortraitImageId} = ${id}`,
  },
  {
    type: "course-image",
    table: courses,
    match: (id: SQL) =>
      sql`${courses.coverImageId} = ${id} OR ${courses.thumbnailId} = ${id} OR ${courses.trailerVideoId} = ${id}`,
  },
  {
    type: "article-cover",
    table: articles,
    match: (id: SQL) => sql`${articles.coverImageId} = ${id}`,
  },
  {
    type: "article-body",
    table: articles,
    match: (id: SQL) => sql`${articles.body}::text LIKE '%' || (${id})::text || '%'`,
  },
  {
    type: "lesson-video",
    table: lessons,
    match: (id: SQL) => sql`${lessons.videoAssetId} = ${id}`,
  },
  {
    type: "lesson-attachment",
    table: lessonAttachments,
    match: (id: SQL) => sql`${lessonAttachments.mediaAssetId} = ${id}`,
  },
  {
    type: "seo-image",
    table: cmsSeoMeta,
    match: (id: SQL) => sql`${cmsSeoMeta.ogImageId} = ${id}`,
  },
  {
    type: "homepage-section",
    table: cmsSections,
    match: (id: SQL) => sql`${cmsSections.content}::text LIKE '%' || (${id})::text || '%'`,
  },
  {
    type: "profile-avatar",
    table: profiles,
    match: (id: SQL) => sql`${profiles.avatarUrl} LIKE '%' || (${id})::text || '%'`,
  },
  {
    type: "legal-document",
    table: legalDocuments,
    match: (id: SQL) =>
      sql`${legalDocuments.contentEn} LIKE '%' || (${id})::text || '%' OR ${legalDocuments.contentAr} LIKE '%' || (${id})::text || '%'`,
  },
] as const;

/** `true` when `assetId` is referenced anywhere in `USAGE_SOURCES` — the
 *  boolean half of the module, cheap enough to run inline per row in
 *  `search()`'s "used"/"unused" filter (each source is an indexed FK
 *  lookup or a single-table `LIKE` scan, not a join). */
export function mediaUsageExistsCondition(assetIdColumn: SQL): SQL {
  const clauses = USAGE_SOURCES.map(
    (source) => sql`EXISTS (SELECT 1 FROM ${source.table} WHERE ${source.match(assetIdColumn)})`,
  );
  return sql.join(clauses, sql` OR `);
}

function labelFrom(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const localized = value as Record<string, unknown>;
    const en = localized.en;
    const ar = localized.ar;
    if (typeof en === "string" && en.trim()) return en;
    if (typeof ar === "string" && ar.trim()) return ar;
  }
  return fallback;
}

/** Detailed, labeled usage list for a bounded batch of asset ids (a
 *  single admin grid page, never the whole library) — one query per
 *  source table rather than per asset, then grouped in memory. */
export async function findMediaUsages(assetIds: string[]): Promise<Map<string, MediaAssetUsage[]>> {
  const result = new Map<string, MediaAssetUsage[]>(assetIds.map((id) => [id, []]));
  if (assetIds.length === 0) return result;

  function add(assetId: string, usage: MediaAssetUsage) {
    const existing = result.get(assetId);
    if (existing) existing.push(usage);
  }

  const db = getDb();

  const [
    instructorRows,
    courseRows,
    articleRows,
    lessonRows,
    attachmentRows,
    seoRows,
    sectionRows,
    legalRows,
    profileRows,
  ] = await Promise.all([
    db
      .select({
        id: instructors.id,
        name: instructors.name,
        avatarImageId: instructors.avatarImageId,
        publicPortraitImageId: instructors.publicPortraitImageId,
      })
      .from(instructors)
      .where(or(inArray(instructors.avatarImageId, assetIds), inArray(instructors.publicPortraitImageId, assetIds))),
    db
      .select({
        id: courses.id,
        title: courses.title,
        coverImageId: courses.coverImageId,
        thumbnailId: courses.thumbnailId,
        trailerVideoId: courses.trailerVideoId,
      })
      .from(courses)
      .where(
        or(
          inArray(courses.coverImageId, assetIds),
          inArray(courses.thumbnailId, assetIds),
          inArray(courses.trailerVideoId, assetIds),
        ),
      ),
    // `articles.body` (and every other JSONB/text scan below) is matched
    // in JS after a plain fetch-all, not a `LIKE`/`unnest` WHERE clause —
    // drizzle's `postgres.js` driver expands an interpolated JS array
    // into N separate bound parameters rather than one array-typed bind
    // (the exact bug `CmsMediaRepository.findByIds` had with a raw `sql`
    // `ANY(${ids})` before it was fixed to use `inArray`), so `= ANY($1)`
    // /`unnest($1::text[])` here would silently be invalid SQL. These
    // content tables are admin/CMS-authored (dozens to low hundreds of
    // rows for this app, not user-generated at scale), so fetching all of
    // them for an admin-only "where is this used" check is cheap — no
    // need for a param-binding workaround to filter server-side first.
    db.select({ id: articles.id, title: articles.title, coverImageId: articles.coverImageId, body: articles.body }).from(articles),
    db
      .select({ id: lessons.id, title: lessons.title, courseId: modules.courseId, videoAssetId: lessons.videoAssetId })
      .from(lessons)
      .innerJoin(modules, sql`${modules.id} = ${lessons.moduleId}`)
      .where(inArray(lessons.videoAssetId, assetIds)),
    db
      .select({ id: lessonAttachments.id, title: lessonAttachments.title, mediaAssetId: lessonAttachments.mediaAssetId })
      .from(lessonAttachments)
      .where(inArray(lessonAttachments.mediaAssetId, assetIds)),
    db.select({ id: cmsSeoMeta.id, ogImageId: cmsSeoMeta.ogImageId }).from(cmsSeoMeta).where(inArray(cmsSeoMeta.ogImageId, assetIds)),
    db.select({ id: cmsSections.id, sectionType: cmsSections.sectionType, content: cmsSections.content }).from(cmsSections),
    db
      .select({ id: legalDocuments.id, titleEn: legalDocuments.titleEn, contentEn: legalDocuments.contentEn, contentAr: legalDocuments.contentAr })
      .from(legalDocuments),
    db.select({ id: profiles.id, fullName: profiles.fullName, email: profiles.email, avatarUrl: profiles.avatarUrl }).from(profiles),
  ]);

  for (const row of instructorRows) {
    const label = labelFrom(row.name, "Instructor");
    if (row.avatarImageId && assetIds.includes(row.avatarImageId)) {
      add(row.avatarImageId, { type: "instructor-avatar", label, href: `/admin/instructors/${row.id}/edit` });
    }
    if (row.publicPortraitImageId && assetIds.includes(row.publicPortraitImageId)) {
      add(row.publicPortraitImageId, { type: "instructor-portrait", label, href: `/admin/instructors/${row.id}/edit` });
    }
  }

  for (const row of courseRows) {
    const label = labelFrom(row.title, "Course");
    const href = `/admin/courses/${row.id}/edit`;
    for (const [field, id] of [
      ["course-cover", row.coverImageId],
      ["course-thumbnail", row.thumbnailId],
      ["course-trailer", row.trailerVideoId],
    ] as const) {
      if (id && assetIds.includes(id)) add(id, { type: field, label, href });
    }
  }

  for (const row of articleRows) {
    const label = labelFrom(row.title, "Article");
    const href = `/admin/articles/${row.id}/edit`;
    if (row.coverImageId && assetIds.includes(row.coverImageId)) {
      add(row.coverImageId, { type: "article-cover", label, href });
    }
    const bodyText = JSON.stringify(row.body ?? "");
    for (const id of assetIds) {
      if (id !== row.coverImageId && bodyText.includes(id)) add(id, { type: "article-body", label, href });
    }
  }

  for (const row of lessonRows) {
    const label = labelFrom(row.title, "Lesson");
    if (row.videoAssetId && assetIds.includes(row.videoAssetId)) {
      add(row.videoAssetId, { type: "lesson-video", label, href: `/admin/courses/${row.courseId}/edit` });
    }
  }

  for (const row of attachmentRows) {
    const label = labelFrom(row.title, "Lesson attachment");
    if (row.mediaAssetId && assetIds.includes(row.mediaAssetId)) {
      add(row.mediaAssetId, { type: "lesson-attachment", label, href: null });
    }
  }

  for (const row of seoRows) {
    if (row.ogImageId && assetIds.includes(row.ogImageId)) {
      add(row.ogImageId, { type: "seo-image", label: "SEO meta", href: null });
    }
  }

  for (const row of sectionRows) {
    const contentText = JSON.stringify(row.content ?? "");
    for (const id of assetIds) {
      if (contentText.includes(id)) {
        add(id, { type: "homepage-section", label: `Homepage — ${row.sectionType}`, href: "/admin/homepage" });
      }
    }
  }

  for (const row of legalRows) {
    const label = labelFrom({ en: row.titleEn }, "Legal document");
    const href = `/admin/content/${row.id}`;
    const text = `${row.contentEn ?? ""} ${row.contentAr ?? ""}`;
    for (const id of assetIds) {
      if (text.includes(id)) add(id, { type: "legal-document", label, href });
    }
  }

  for (const row of profileRows) {
    if (row.avatarUrl) {
      const label = row.fullName ?? row.email;
      for (const id of assetIds) {
        if (row.avatarUrl.includes(id)) add(id, { type: "profile-avatar", label, href: `/admin/users/${row.id}` });
      }
    }
  }

  return result;
}
