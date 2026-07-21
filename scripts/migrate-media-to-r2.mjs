/**
 * One-time byte migration: Supabase Storage → the Media Platform bucket
 * (R2/S3). See docs/media-platform.md "Migration guide".
 *
 * For every `cms_media_assets` row with `storage_key IS NULL` (a
 * legacy Supabase-era asset), this script:
 *   1. downloads the file from its stored public Supabase URL,
 *   2. uploads it to the platform bucket under `library/<id>/original.<ext>`,
 *   3. flips the row: `storage_key` set, `storage_path` updated, `url`
 *      rewritten to the platform delivery URL.
 *
 * Idempotent and resumable — already-migrated rows are skipped; rerun
 * after any failure. Rows keep serving from Supabase until their own
 * flip commits, so this is safe to run against a live site. Generated
 * image variants are NOT backfilled (legacy rows never had them);
 * "Replace file" in the library regenerates any asset on demand.
 *
 * Usage:  node --env-file=.env.local scripts/migrate-media-to-r2.mjs [--dry-run]
 */

import postgres from "postgres";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const dryRun = process.argv.includes("--dry-run");

function env(name, fallbackName) {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : undefined);
}

const DATABASE_URL = process.env.DATABASE_URL;
const BUCKET = env("MEDIA_STORAGE_BUCKET", "VIDEO_STORAGE_BUCKET");
const PUBLIC_BASE = (process.env.MEDIA_PUBLIC_BASE_URL || "").replace(/\/$/, "");

if (!DATABASE_URL || !BUCKET) {
  console.error("DATABASE_URL and MEDIA_STORAGE_* (or VIDEO_STORAGE_*) must be set.");
  process.exit(1);
}

const s3 = new S3Client({
  region: env("MEDIA_STORAGE_REGION", "VIDEO_STORAGE_REGION"),
  endpoint: env("MEDIA_STORAGE_ENDPOINT", "VIDEO_STORAGE_ENDPOINT"),
  credentials: {
    accessKeyId: env("MEDIA_STORAGE_ACCESS_KEY_ID", "VIDEO_STORAGE_ACCESS_KEY_ID"),
    secretAccessKey: env("MEDIA_STORAGE_SECRET_ACCESS_KEY", "VIDEO_STORAGE_SECRET_ACCESS_KEY"),
  },
});

const MIME_TO_EXTENSION = {
  "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif",
  "image/svg+xml": "svg", "image/avif": "avif", "video/mp4": "mp4", "video/webm": "webm",
  "video/quicktime": "mov", "application/pdf": "pdf",
};

const sql = postgres(DATABASE_URL, { max: 1, prepare: false });

try {
  const rows = await sql`
    select id, url, storage_path, mime_type, visibility
    from cms_media_assets
    where storage_key is null
    order by created_at`;
  console.log(`${rows.length} legacy assets to migrate${dryRun ? " (dry run)" : ""}.`);

  let migrated = 0;
  let failed = 0;
  for (const row of rows) {
    const extension = MIME_TO_EXTENSION[row.mime_type] ?? "bin";
    const key = `library/${row.id}/original.${extension}`;
    const newUrl =
      row.visibility === "public" && PUBLIC_BASE ? `${PUBLIC_BASE}/${key}` : `/api/media/${row.id}/file`;
    try {
      if (!dryRun) {
        const response = await fetch(row.url);
        if (!response.ok) throw new Error(`download failed (HTTP ${response.status})`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        await s3.send(
          new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: bytes, ContentType: row.mime_type }),
        );
        await sql`
          update cms_media_assets
          set storage_key = ${key}, storage_path = ${key}, url = ${newUrl}, updated_at = now()
          where id = ${row.id} and storage_key is null`;
      }
      migrated += 1;
      console.log(`✓ ${row.id}  ${row.storage_path} → ${key}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${row.id}  ${row.storage_path}: ${error.message}`);
    }
  }
  console.log(`Done. Migrated ${migrated}, failed ${failed}.`);
  if (failed > 0) process.exitCode = 1;
} finally {
  await sql.end();
}
