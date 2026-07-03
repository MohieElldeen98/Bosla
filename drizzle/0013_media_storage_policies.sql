-- Row Level Security policies for the `media` Storage bucket (Phase 7,
-- Step 7.1). Supabase enables RLS on `storage.objects` by default with
-- zero policies, so every insert/update/delete via the session-scoped
-- client (`@/lib/supabase/server`, used by `SupabaseMediaStorage` — the
-- same client every other server-side Supabase need in this app already
-- uses, subject to RLS by design, see `lib/supabase/admin.ts`'s own doc
-- comment on why `createAdminClient()` stays reserved for the two
-- `auth.users` Admin API repositories only) was being rejected with "new
-- row violates row-level security policy" — the app's own
-- `requireCmsAccess()` gate (Admin/Super Admin only) already runs before
-- `CmsMediaService.upload`/`.delete` ever reach Storage, so these
-- policies re-check the exact same role, sourced from the same
-- `app_metadata.role` JWT claim `getRoleFromUser` reads
-- (`lib/auth/get-role-from-user.ts`) — not a second, independent
-- authorization system, the same one, enforced at the one layer
-- (Storage) that isn't a direct Postgres connection and therefore can't
-- skip RLS the way `getDb()` does for every other table in this app.
--
-- Public read needs no policy at all — the bucket itself is `public:
-- true` (created via the Admin API, `pnpm exec tsx` setup, not tracked
-- here since bucket-level settings aren't part of this migration
-- system), which serves objects through a dedicated public endpoint that
-- bypasses RLS entirely. The `select` policy below is added anyway,
-- harmless and defensive, in case any future server-side read ever goes
-- through the authenticated client instead of the public URL.

create policy "media_bucket_public_select"
on storage.objects
for select
to public
using (bucket_id = 'media');

create policy "media_bucket_admin_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'media'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
);

create policy "media_bucket_admin_update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'media'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
)
with check (
  bucket_id = 'media'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
);

create policy "media_bucket_admin_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'media'
  and (auth.jwt() -> 'app_metadata' ->> 'role') in ('admin', 'super_admin')
);
