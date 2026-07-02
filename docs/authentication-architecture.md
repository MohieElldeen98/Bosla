# Bosla — Authentication Architecture

> Status: real Supabase integration (Step 5.3) plus the Profile foundation
> (Step 5.4), built on the architecture from Step 5.1 and the UI from
> Step 5.2. No student/instructor dashboards, payments, or course features
> exist yet — this document covers auth, profiles, and (§15) the Admin
> Panel shell. Every operation below, including `ProfileRepository`, is
> real — see §14 for the Profile domain and §15 for the Admin Panel.

## 1. Layer overview

```
src/
  auth/
    types/          Role, AuthUser/AuthSession, AuthActionResult, OAuthProvider,
                     Profile, ProfileStatus, ProfileSearchFilters, ProfileActionResult, StorageProvider
    constants/       role ranking, route-access rules, default redirects, avatar storage bucket/path
    validators/      Zod schema factories (auth forms) + profile.validator.ts (shared editable-fields schema)
    repositories/
      auth.repository.ts             server-side Supabase Auth wrapper (real)
      auth-client.repository.ts       browser-side Supabase Auth wrapper (real)
      profile.repository.ts           Drizzle-backed CRUD + search over `profiles` (real)
      avatar-storage.repository.ts    Supabase Storage adapter behind `StorageProvider` (real, no UI)
    services/
      auth.service.ts              orchestration — credential operations, error mapping
      session.service.ts           server-side session/role read (JWT-only)
      session-client.service.ts    client-side counterpart of session.service.ts
      profile.service.ts           orchestration — bootstrap, validation, authorization, completeness
    guards/           requireAuth, requireGuest, requireRole
    hooks/            useSession (client-side auth state, via session-client.service.ts)
    actions/          Server Actions — real bodies, call AuthService only
    utils/            role helpers, User→AuthUser, error mapping, redirect-path safety,
                       canModifyProfile, profile completeness/eligibility scoring
  middleware/          composable steps used by the root src/middleware.ts
  db/
    schema/
      auth-users.ts    shadow reference to Supabase's `auth.users` (FK target only)
      profiles.ts      the real `profiles` table — see §14
    index.ts           lazy Drizzle/postgres client (getDb())
  lib/
    auth/              Edge-safe Supabase client, JWT role decoding
    supabase/          browser/Server Component Supabase client factories
    env.ts             Supabase + DATABASE_URL validation (fail-closed, dev-only warning)
    logger.ts          dev-only logging, no-ops in production
  i18n/
    strip-locale-prefix.ts   shared by middleware and Client Components
  app/
    auth/confirm/route.ts    OAuth/email callback — calls AuthService, not Supabase directly
    [locale]/
      (public)/          reserved, no guard
      (auth)/            guest-only guard — sign-in, sign-up, forgot-password
      reset-password/    own requireAuth guard (NOT guest-only — see §3)
      verify-email/      ungated
      (student)/          role guard — /dashboard/*
      (instructor)/       role guard — /instructor/*
      (admin)/            role guard (Forbidden, not redirect) — /admin/* — see §15
        admin/            AdminShell (sidebar/header/breadcrumb) + 14 placeholder pages
      (super-admin)/      role guard — super_admin only
drizzle/
  0000_military_tyrannus.sql              creates `profiles` (+ auth.users shadow, enums, indexes, FK, check)
  0001_profiles_auto_create_trigger.sql   handle_new_user() trigger — see §14
```

## 2. Folder responsibilities

| Folder/file | Responsibility | Depends on |
|---|---|---|
| `auth/types` | Pure type/interface definitions. No logic. | nothing |
| `auth/constants` | Static config: role ranking, route-access rules, default redirect per role. | `auth/types` |
| `auth/validators` | Zod schema **factories** — take a translated-messages object and return a schema. | `zod` |
| `auth/repositories/auth.repository.ts` | Server-side Supabase Auth wrapper. Every method name matches this document's Repository contract (§3) exactly — `signIn`, `signUp`, `signOut`, `forgotPassword`, `resetPassword`, `verifyOtp`, `refreshSession`, `getCurrentUser`, `getSession`, `signInWithOAuth`/`signInWithGoogle`, `exchangeCodeForSession`. | `lib/supabase/server` |
| `auth/repositories/auth-client.repository.ts` | The browser-side counterpart — `getCurrentUser`, `onAuthStateChange`. Split out because `onAuthStateChange` is inherently a Client Component concern and `lib/supabase/server` (used by the server repository) depends on `next/headers`, which cannot run client-side. | `lib/supabase/client` |
| `auth/repositories/profile.repository.ts` | Drizzle-backed CRUD + search over `profiles` (see §14). Every method name matches the Profile Repository contract exactly. | `db`, `auth/types` |
| `auth/repositories/avatar-storage.repository.ts` | Supabase Storage adapter implementing `StorageProvider` (see §14 "Storage"). | `lib/supabase/server` |
| `auth/services/auth.service.ts` | Orchestration. Composes `AuthRepository` + `ProfileService`, maps every Supabase error through `map-supabase-error.ts`, returns `AuthActionResult`. No React imports, no redirect/UI logic. | `auth/repositories`, `auth/services/profile.service.ts` |
| `auth/services/profile.service.ts` | Orchestration for the Profile domain — bootstrap, validation, authorization, completeness/eligibility, search (see §14). | `auth/repositories/profile.repository.ts`, `auth/validators/profile.validator.ts`, `auth/utils` |
| `auth/services/session.service.ts` | Server-side session/role read — JWT-only, no `ProfileRepository` dependency. The only auth-state read guards use. | `auth/repositories`, `auth/utils` |
| `auth/services/session-client.service.ts` | Client Component counterpart of `session.service.ts`, same responsibility, different runtime. | `auth/repositories/auth-client.repository.ts` |
| `auth/guards` | Server-only functions called from layouts: `requireAuth`, `requireGuest`, `requireRole` (redirect on role mismatch), `requireRoleOrForbidden` (returns `{allowed:false}` instead of redirecting — used only by `(admin)/layout.tsx`, see §15). | `auth/services/session.service.ts` |
| `auth/hooks/use-session.ts` | Presentation-only client hook — calls `session-client.service.ts`, never Supabase directly. | `auth/services/session-client.service.ts` |
| `auth/actions/*.action.ts` | Real `"use server"` bodies. Call `AuthService` only — never Supabase, never a repository directly. | `auth/services` |
| `auth/utils/role.utils.ts` | Rank/allow-list checks, default redirect per role. | `auth/constants` |
| `auth/utils/to-auth-user.ts` | Supabase `User` → `AuthUser`, shared by both server and client session paths. | `lib/auth/get-role-from-user.ts` |
| `auth/utils/map-supabase-error.ts` | Supabase `AuthError` → stable `AuthErrorCode`, keyed primarily on `error.code` (see §5). | `auth/types/result.ts` |
| `auth/utils/is-safe-redirect-path.ts` | Open-redirect guard for `redirectTo`/`next`-style query params (see §7). | nothing |
| `auth/utils/can-modify-profile.ts` | The one authorization check for every profile mutation (see §14 "Authorization"). | `auth/utils/role.utils.ts` |
| `auth/utils/profile-completeness.ts` | Completeness percentage scoring (see §14). | `auth/types/profile.ts` |
| `auth/utils/profile-eligibility.ts` | Public-profile-page eligibility (see §14). | `auth/utils/profile-completeness.ts` |
| `middleware/` | `session.ts` (Edge session refresh + user resolution), `route-protection.ts` (pure allow/redirect decision, including return-URL). | `lib/auth`, `auth/constants`, `auth/utils`, `i18n/strip-locale-prefix.ts` |
| `db/schema/auth-users.ts` | Shadow `auth.users` reference — FK target only, never queried. | `drizzle-orm/pg-core` |
| `db/schema/profiles.ts` | The real `profiles` table (see §14). | `db/schema/auth-users.ts` |
| `db/index.ts` | `getDb()` — lazy Drizzle/postgres client, same fail-gracefully pattern as `lib/supabase/*`. | `lib/env.ts` |
| `lib/auth/` | Edge-safe primitives: `middleware-client.ts` (Supabase client bound to `NextRequest`/`NextResponse`), `get-role-from-user.ts` (reads `app_metadata.role`). | `@supabase/ssr`, `lib/env.ts` |
| `lib/supabase/` | Browser (`client.ts`) and Server Component (`server.ts`) Supabase client factories. | `@supabase/ssr`, `lib/env.ts` |
| `lib/env.ts` | Validates `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` (`env`) and `DATABASE_URL` (`dbEnv`) with Zod, **independently** — one missing var never nulls out the other concern. `null` (plus one dev-only warning each) when missing/invalid, rather than throwing. | `zod`, `lib/logger.ts` |
| `lib/logger.ts` | `info`/`warn`/`error` — every call is a no-op when `NODE_ENV === "production"`. | nothing |
| `i18n/strip-locale-prefix.ts` | Strips a leading `/en`/`/ar` segment. Used by both the Edge middleware and `SignInForm` (see §7) — one implementation, two runtimes. | `i18n/routing` |
| `app/auth/confirm/route.ts` | The OAuth/email callback. Calls `AuthService.exchangeCodeForSession`/`verifyOtp` — never the Supabase SDK directly, keeping "no duplicated logic." | `auth/services/auth.service.ts` |

**Layering rule (unchanged from Step 5.1):** `lib/auth/*` may depend on
`auth/types`, `auth/constants`, and `lib/env.ts` (all pure/Edge-safe) but
never on `auth/repositories|services|guards` — those pull in Node-only APIs
(`next/headers`, and eventually Drizzle/`postgres`) that must never end up
in the Edge middleware bundle.

## 3. Repository contract

`AuthRepository` (server) implements exactly these functions — every
Service method is a thin pass-through to one of these, so there is exactly
one place that calls the Supabase SDK for each operation:

| Function | Wraps | Used by |
|---|---|---|
| `signUp(input)` | `auth.signUp` | `AuthService.signUp` |
| `signIn(input)` | `auth.signInWithPassword` | `AuthService.signIn` |
| `signOut()` | `auth.signOut` | `AuthService.signOut` |
| `forgotPassword(email, redirectTo)` | `auth.resetPasswordForEmail` | `AuthService.forgotPassword` |
| `resetPassword(newPassword)` | `auth.updateUser({ password })` | `AuthService.resetPassword` |
| `verifyOtp({ type, tokenHash })` | `auth.verifyOtp` | `app/auth/confirm/route.ts` (via `AuthService`) |
| `refreshSession()` | `auth.refreshSession` | available for future use (see below) |
| `getCurrentUser()` | `auth.getUser` | `SessionService`, every guard, indirectly every navigation |
| `getSession()` | `auth.getSession` | available for future use |
| `signInWithOAuth(provider, redirectTo)` | `auth.signInWithOAuth` | `signInWithGoogle` and any future provider wrapper |
| `signInWithGoogle(redirectTo)` | `signInWithOAuth("google", ...)` | `AuthService.signInWithGoogle`, `SocialLoginButton` |
| `exchangeCodeForSession(code)` | `auth.exchangeCodeForSession` | `app/auth/confirm/route.ts` (via `AuthService`) — the OAuth (PKCE) counterpart to `verifyOtp`'s email-link flow |
| `resendVerificationEmail(email, redirectTo)` | `auth.resend` | `AuthService.resendVerificationEmail` |

`getCurrentUser()`/`getSession()` are wrapped in try/catch and fail closed
to `null` — they run on effectively every request (every guard, indirectly
every middleware pass), so a missing/misconfigured Supabase env var must
degrade to "no session," not crash the page (see §6). The
auth-*performing* methods deliberately do **not** catch: if Supabase truly
can't be reached, sign-up/sign-in should fail loudly with a mapped error,
not pretend to succeed.

`refreshSession()` is exposed but not called anywhere yet:
`getCurrentUser()` already triggers Supabase's own token refresh as a side
effect of calling `auth.getUser()` (the officially recommended pattern —
`getUser()` revalidates with the Auth server, unlike `getSession()`, which
only reads the local JWT). `refreshSession()` is here for a future need
that doesn't exist yet (e.g. a long-lived tab proactively extending its
own session) — adding that caller requires no repository change.

**`AuthClientRepository`** (browser) covers the two functions that only
make sense as a live client-side subscription: `getCurrentUser()` and
`onAuthStateChange(callback)`. See `session-client.service.ts` in §2.

## 4. Authentication flow

All flows go through `AuthService`, which returns `AuthActionResult` —
`{ success: true, data }` or `{ success: false, code, message }` — and never
redirects or throws for expected failures.

- **Sign Up** — `AuthService.signUp` calls `AuthRepository.signUp` (real
  Supabase `auth.signUp`, passing `fullName`/`profession`/`country`/
  `language` into `raw_user_meta_data`), then `ProfileService.
  bootstrapProfile` (creating the app-side profile row — see §14 for why
  this is safe to call even though a DB trigger is racing to do the same
  thing). The result reports `requiresEmailVerification` based on whether
  Supabase returned a session immediately. Profile bootstrap is wrapped in
  try/catch and logged via `logger.warn` in dev only — the Supabase Auth
  identity is what actually determines sign-up success, not this side
  effect.
- **Email Verification** — Supabase's built-in confirmation email; our code
  never issues its own token. `AuthService.resendVerificationEmail` backs
  the "resend" link/countdown on `/verify-email`. Clicking the emailed link
  lands on `app/auth/confirm/route.ts`, which calls `AuthService.verifyOtp`
  and redirects to `/verify-email?status=verified` on success, or
  `/sign-in?authError=expired_token` on failure.
- **Sign In** — `AuthService.signIn` calls `AuthRepository.signIn`.
  Determining the post-sign-in redirect is the Server Action's job
  (`auth/actions/sign-in.action.ts`), using `getDefaultRedirectPath(role)` —
  or the preserved `redirectTo` return URL if one exists (see §7).
- **Sign Out** — `AuthService.signOut` calls `AuthRepository.signOut`,
  clearing the session cookie via `@supabase/ssr`.
- **Forgot Password** — `AuthService.forgotPassword` calls
  `AuthRepository.forgotPassword` with a redirect URL through
  `app/auth/confirm/route.ts` back to `/reset-password`.
- **Reset Password** — `AuthService.resetPassword` calls
  `AuthRepository.resetPassword` against the recovery session Supabase
  establishes when the confirm route verifies the emailed link's OTP.
- **Session Management** — see §6.

## 5. OAuth

`AuthRepository.signInWithOAuth(provider, redirectTo)` is generic over
`OAuthProvider` (`auth/types/oauth.ts`): `"google" | "apple" | "azure" |
"github"` — names match Supabase's own `Provider` union exactly (`azure` is
Microsoft), so no translation layer exists between this type and the SDK
call. `signInWithGoogle` is a one-line wrapper (`signInWithOAuth("google",
redirectTo)`), which is the pattern every future provider follows:

```ts
async signInWithApple(redirectTo: string) {
  return AuthRepository.signInWithOAuth("apple", redirectTo);
}
```

Adding Apple/Microsoft/GitHub later means: add one wrapper like the above,
one `AuthService.signInWith<Provider>` convenience method (or call
`signInWithOAuth` directly), and one `SocialLoginButton`-style button in the
UI — the generic method, the Server Action pattern, and
`app/auth/confirm/route.ts` (which already branches on `code` regardless of
which provider produced it) all stay unchanged.

`SocialLoginButton` calls the `googleSignInAction` Server Action, which
calls `AuthService.signInWithGoogle`, which returns the Supabase-hosted
redirect URL; the client then navigates there itself
(`window.location.href = url`) — Supabase is never called from the
component.

## 6. Error handling

`auth/types/result.ts`'s `AuthErrorCode` covers every category this step
asks for: `invalid_credentials`, `email_already_registered`,
`weak_password`, `email_not_verified`, `rate_limited`, `unknown`,
`expired_token`. Every `AuthActionResult` failure carries one of these, so
`Auth.SignIn.errors.*`/`Auth.SignUp.errors.*` translations (already
bilingual, `messages/{en,ar}/auth.json`) can branch on a fixed value
instead of Supabase's own message text.

`map-supabase-error.ts` matches primarily on Supabase's stable
`AuthError.code` (e.g. `"invalid_credentials"`, `"user_already_exists"`,
`"weak_password"`, `"email_not_confirmed"`, `"over_email_send_rate_limit"`)
— far more robust than message-text matching, since `.message` is free text
that can change between SDK versions. Message-substring matching is kept
only as a fallback for the rare error that predates `.code`.

## 7. Session strategy

- **Storage:** `@supabase/ssr` cookie-based sessions (`HttpOnly` by
  default, set by the SDK — never overridden). `lib/supabase/client.ts`
  (browser), `lib/supabase/server.ts` (Server Components), and
  `lib/auth/middleware-client.ts` (Edge middleware) are the three client
  variants, one per cookie API shape.
- **Refresh:** happens once per request in `middleware/session.ts` — every
  request calls `auth.getUser()`, which revalidates with Supabase and
  refreshes the access token if needed, before any Server Component or
  route guard runs.
- **Server resolution:** `SessionService.getCurrentUser()` — JWT-only, no
  `ProfileRepository` dependency, so route protection works from a single
  fast call regardless of the `profiles` table's availability.
- **Client resolution/hydration:** `auth/hooks/use-session.ts` calls
  `SessionClientService.getCurrentUser()` once on mount, then
  `SessionClientService.onAuthStateChange` keeps it live — both go through
  `AuthClientRepository`, never Supabase directly. Presentation-only: never
  the enforcement layer.
- **Return-URL preservation:** when middleware redirects an unauthenticated
  visitor away from a protected route (`ROUTE_ACCESS_RULES` in
  `auth/constants/routes.ts`), it appends `?redirectTo=<original path>` to
  the sign-in URL (`route-protection.ts`'s `returnTo`, applied in
  `middleware.ts`). `SignInForm` reads that as a prop from `sign-in/page.tsx`
  and, after `is-safe-redirect-path.ts` confirms it's a same-site relative
  path (blocking `//evil.com`-style open redirects), routes there instead
  of the role's generic default. This only applies to the
  "unauthenticated + protected route" case — guest-only and wrong-role
  redirects send the user where they *belong*, not back to where they were.

## 8. Route protection strategy

Two layers, both driven by the same `auth/constants/routes.ts` config:

1. **Middleware (coarse, fast)** — `middleware/route-protection.ts`'s pure
   `evaluateRouteAccess` takes `{ localeAgnosticPath, fullPath, user }` and
   returns `"allow"` or a redirect (+ optional return URL, see §7).
   `src/middleware.ts` composes: next-intl resolves the locale → the
   Supabase session is refreshed against that response (`Set-Cookie`
   preserved) → the pathname is stripped of its locale prefix
   (`i18n/strip-locale-prefix.ts`) → the decision is applied. A redirect
   copies the refreshed-session cookies onto the new response.
2. **Layout guards (fine-grained, per surface)** — `requireAuth`,
   `requireGuest`, `requireRole` run inside each route group's
   `layout.tsx`, redirecting *before* the layout renders or fetches any
   protected data.

`ROUTE_ACCESS_RULES` entries carry an `onRoleMismatch` field (default
`"redirect"`). `/admin` sets it to `"allow"`: middleware lets a signed-in,
wrong-role request through instead of redirecting, so `(admin)/layout.tsx`
can render an explicit Forbidden page — see §15. Every other rule is
unaffected; a Student hitting `/instructor` still redirects to `/dashboard`
without ever reaching that layout.

Guest-only paths (`/sign-in`, `/sign-up`, `/forgot-password`) redirect an
already-authenticated visitor to `getDefaultRedirectPath(role)`.
`/reset-password` is deliberately **not** guest-only — see the comment in
`auth/constants/routes.ts` — a user reaches it via a real recovery session
established by `app/auth/confirm/route.ts`, so it uses `requireAuth`
instead (any session, not "no session").

## 9. Environment & logging

- `lib/env.ts` validates `NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY` with Zod at
  import time. Invalid/missing → `env` is `null` and one `logger.warn`
  fires (dev only); every Supabase client factory still attempts
  construction with an empty-string fallback (`env?.X ?? ""`), which is
  what produces the specific Supabase SDK error the try/catch layers in
  §3/§6 already handle — so misconfiguration degrades to "signed out,"
  never a crashed page.
- `lib/logger.ts` — `info`/`warn`/`error`, every call gated on
  `NODE_ENV !== "production"`. Used in `env.ts` and around the
  best-effort `ProfileRepository` call in `AuthService.signUp`; nowhere in
  this codebase calls bare `console.*` for auth concerns.

## 10. Security

- **Service role keys:** still none in this codebase — `ProfileRepository`
  and `avatar-storage.repository.ts` both authenticate as the request's own
  user (`lib/supabase/server.ts`'s cookie-bound client), never a
  service-role client. Role-mirroring into `app_metadata` (see §4 of the
  original Step 5.1 design) is the one future piece of work that will
  require a service-role key — when it lands, that key must only ever be
  read inside a repository method, never sent to the client.
- **Client-supplied role is never trusted:** `useSession`/
  `SessionClientService` expose `role` for presentation only (e.g. a future
  nav avatar). Every actual authorization decision — every guard, every
  middleware check, `canModifyProfile` (see §14) — re-derives role
  server-side from the session JWT's `app_metadata.role` via
  `getRoleFromUser`, never from anything the client sent.
- **Session validation is server-side:** guards call `SessionService`
  (server), middleware calls its own Edge-bound resolver — both go through
  `auth.getUser()`, which round-trips to Supabase rather than trusting a
  locally-decoded, unverified JWT payload.
- **Cookies:** `HttpOnly`, set exclusively via `@supabase/ssr`'s own cookie
  options — never touched/weakened by this codebase.
- **Profile mutations are authorization-checked once, centrally:** every
  `ProfileService` mutation (`updateProfile`, `softDeleteProfile`,
  `restoreProfile`, `uploadAvatar`) calls `canModifyProfile(actingUser,
  targetUserId)` before touching the repository — see §14 "Authorization."

## 11. Types

Strict, no `any` anywhere in `src/auth/**`, `src/middleware/**`,
`src/db/**`, or `src/lib/{auth,supabase,env.ts,logger.ts}`. Types are
inferred from Zod schemas (`z.infer`) and from the Supabase SDK's own
exports (`AuthError`, `EmailOtpType`, `User`, `Session`) rather than
hand-written duplicates. `Profile` is a hand-declared domain type (not
`typeof profiles.$inferSelect` directly) so the domain contract stays
stable even if the DB row shape needs an internal-only change —
`ProfileRepository`'s `mapRowToProfile` is the one place that converts.

## 12. Future-ready

Architecture decisions made specifically so these don't require a rewrite:

- **Magic links / phone login** — `AuthRepository` would gain
  `signInWithOtp(...)`, following the exact same shape as every existing
  method (thin wrapper, called only from `AuthService`). `AuthActionResult`
  and the Server Action pattern don't change.
- **MFA** — Supabase MFA is an additional `challengeAndVerify` step after a
  normal sign-in; it adds new repository/service methods without changing
  the route-protection strategy. Guards could later check the session's AAL
  (authentication assurance level) the same way they check role today.
- **Apple / Microsoft / GitHub** — see §5; each is a one-line repository
  wrapper over the already-generic `signInWithOAuth`.
- **Instructor/student public pages, author pages** — `isEligibleForPublicProfile`
  (§14) already decides *whether* a profile is public, independent of role;
  a future `/instructors/[id]`/`/students/[id]`/`/authors/[id]` page picks
  its template from `profile.role` and reads the same `Profile` shape —
  no schema or service change needed.
- **Certificates, achievements, followers, bookmarks** — each is its own
  future table with a foreign key to `profiles.id` (the surrogate PK, not
  `user_id`, is deliberately what other tables will reference — see §14),
  the same way `instructor_profiles`/`student_profiles` are planned in
  [`database-overview.md`](./database-overview.md) §1. None of them require
  a column on `profiles` itself.

## 14. Profile domain (Step 5.4)

### Why a separate table

"Authentication remains inside Supabase Auth; business data belongs inside
Profiles" — `auth.users` (Supabase-owned: email, password, identity) and
`public.profiles` (Bosla-owned: name, avatar, profession, role, status,
...) are deliberately two tables, joined only by `profiles.user_id`. No
application code ever writes to `auth.users`; no application code ever
treats `profiles` as authentication. See
[`database-overview.md`](./database-overview.md) §1 for the full column
list, indexes, and constraints as actually migrated.

### Profile lifecycle

```
auth.signUp()
   │
   ├─▶ handle_new_user() trigger (drizzle/0001_*.sql)   ─┐
   │      fires inside the same DB transaction as         │  both idempotent via
   │      the auth.users INSERT — wins the race almost     │  ON CONFLICT (user_id),
   │      every time                                       │  whichever runs first
   │                                                        │  "wins" per field via
   └─▶ ProfileService.bootstrapProfile()  (AuthService.signUp) │  COALESCE — see below
          defensive fallback + richer sign-up-form data   ─┘

profiles.status: pending ──▶ active ──▶ suspended / archived
                    │                        │
                    └──────────▶ deleted (soft delete, deleted_at set)
                                     │
                                     └──▶ restore() ──▶ active
```

- **Creation** — two independent, idempotent paths (diagram above), so a
  profile exists no matter how the identity was created (password sign-up
  today; OAuth/magic-link/admin-invite later, all without touching this
  design). `ProfileRepository.create` resolves the race with
  `ON CONFLICT (user_id) DO UPDATE SET col = COALESCE(existing, incoming)`
  — never a duplicate, and whichever path has richer data for a given
  column wins for that column, instead of one path's insert silently
  overwriting the other's.
- **Activation** — `pending → active` when `AuthService.verifyOtp` confirms
  a sign-up email (`ProfileService.activateProfile`).
- **Login tracking** — `last_login_at` is updated on every successful
  `AuthService.signIn`, `verifyOtp`, and `exchangeCodeForSession` (OAuth) —
  `ProfileService.recordLogin`, best-effort, never blocks the sign-in.
- **Suspension/archival** — admin actions, not built yet (no dashboards
  this step) — the `status` enum already has the values
  (`auth/types/profile-status.ts`); a future Admin Panel calls
  `ProfileService.updateProfile` with an acting admin user, same code path
  a self-edit uses.
- **Soft delete/restore** — `ProfileService.softDeleteProfile`/
  `restoreProfile`. The row is never removed; `deleted_at` plus
  `status: "deleted"` are the two (redundant, deliberately) markers every
  read path filters on.

### Repository contract

`ProfileRepository` — pure data access, no validation, no authorization:

| Function | Behavior |
|---|---|
| `create(input)` | Idempotent upsert — see "Creation" above. |
| `findByUserId(userId, { includeDeleted? })` | Excludes soft-deleted rows unless explicitly asked (restore needs to find a deleted row). |
| `update(userId, fields)` | Accepts `ProfileMutableFields` — a superset of the user-editable Zod schema (see "Validation") that also allows system fields (`status`, `lastLoginAt`, `role`) the repository itself never gates. |
| `delete(userId)` | Soft delete. |
| `restore(userId)` | Clears `deleted_at`, sets `status: "active"`. |
| `exists(userId)` | Existence check excluding soft-deleted rows. |
| `search(filters)` | Composable `and()`/`ilike()`/`eq()` query — see "Search" below. |

### Service responsibilities

`ProfileService` — the only caller of `ProfileRepository` — owns everything
the repository deliberately doesn't:

- **Bootstrap** — `bootstrapProfile`, called from `AuthService.signUp`.
- **Validation** — every user-facing mutation parses `rawInput` through
  `updateProfileSchema` (Zod) before it reaches the repository.
- **Authorization** — every mutation calls `canModifyProfile(actingUser,
  targetUserId)` first (see "Authorization" below) — one check, reused by
  `updateProfile`, `softDeleteProfile`, `restoreProfile`, `uploadAvatar`.
- **Role/language/country defaults** — bootstrap always defaults role to
  `DEFAULT_ROLE` (`student`) and language to `"en"` if the sign-up form
  didn't supply one; country/profession are left `null` rather than
  guessed.
- **Completeness/eligibility** — `getCompleteness`/`isPublicEligible`, thin
  wrappers over the pure utils below (kept in `auth/utils/*` rather than
  inline so they're independently testable and reusable outside the
  service).
- **Resilience** — `safeRead`/`safeMutation` wrap every repository call,
  mirroring `AuthService`'s `runAuthOperation`: a DB failure degrades to
  `null`/`false`/`[]` for reads, or a clean `ProfileActionResult` failure
  for mutations — never an uncaught throw out of a Server Action.

### Validation

`auth/validators/profile.validator.ts`'s `profileEditableFieldsSchema` is
the single source of truth for which fields a user may edit
(`fullName`, `displayName`, `avatarUrl`, `profession`, `country`,
`language`, `bio`, `website`, `linkedin`, `yearsOfExperience`,
`specialties`, `isPublic`). `updateProfileSchema` derives from it via
`.partial()` — no field list is duplicated between "creatable" and
"updatable." `id`/`userId`/`email`/`role`/`status`/timestamps are
deliberately absent — none are user-editable through this schema.

### Authorization

`auth/utils/can-modify-profile.ts`'s `canModifyProfile(actingUser,
targetUserId)` is the one check: true if `actingUser.id === targetUserId`,
or if `actingUser.role` is `admin`/`super_admin`. Every `ProfileService`
mutation calls it first and returns `{ success: false, code: "forbidden" }`
if it fails — no separate admin-override code path exists yet, so when the
Admin Panel is eventually built, it calls the exact same `ProfileService`
methods a self-edit uses, just with a different `actingUser`.

### Profile completeness

`auth/utils/profile-completeness.ts` scores eight equally-weighted fields
(avatar, profession, bio, country, language, specialties, years of
experience, display name) as a simple filled-count percentage, plus a
`missingFields` list. Adding a ninth field later (e.g. once certificates
exist) is one more entry in that file's list, not a rewrite.

### Public profile eligibility

`auth/utils/profile-eligibility.ts`'s `isEligibleForPublicProfile` requires
`status === "active"`, `is_public === true`, and completeness ≥ 60% — and
is deliberately **role-agnostic**: it decides *whether* a public page
should exist, not which template renders it. That keeps both Instructor
and Student public pages (see "Future-ready") possible without touching
this function.

### Storage (avatar upload — no UI yet)

`StorageProvider` (`auth/types/storage.ts`) is the port; `auth/repositories/
avatar-storage.repository.ts`'s `SupabaseAvatarStorage` is the only adapter
today. `ProfileService.uploadAvatar` computes a deterministic path
(`auth/constants/storage.ts`'s `getAvatarStoragePath` → `{userId}/
avatar.{ext}`, always overwritten via `upsert: true`, never accumulating
orphaned files), authorization-checks via `canModifyProfile`, uploads, then
persists the resulting public URL onto the profile. Swapping providers
(S3, Cloudinary, ...) later means writing one new adapter behind
`StorageProvider` — `ProfileService` and everything above it stays
unchanged. No uploader UI/form exists yet — this is the abstraction only.

### Search

`ProfileRepository.search` composes filters with `and()` — name (via
`ilike` on `fullName`/`displayName`), profession, country, role, status —
always excluding soft-deleted rows. Every filter is optional; adding a new
search dimension later is one more `if (filters.x) conditions.push(...)`
line, never a rewrite. `ProfileService.search` validates `rawFilters`
through `searchProfilesSchema` first (bad input → empty result, never a
thrown error).

## 15. Admin Panel shell (Step 6.3)

The Admin Panel foundation: routing, layout chrome, and authorization —
**no section editors, uploaders, or forms yet** (those are future steps,
plugged into this shell one at a time). Everything under
`src/app/[locale]/(admin)/admin/*`.

- **Authorization is two-layered, matching §8**: middleware lets a
  signed-in wrong-role request through (`onRoleMismatch: "allow"`) instead
  of redirecting, and `(admin)/layout.tsx` calls `requireRoleOrForbidden(
  locale, ["admin", "super_admin"])` — an unauthenticated visitor still
  redirects to sign-in (via the reused `requireAuth`); a Student/Instructor
  sees `ForbiddenPage` (`src/components/admin/ForbiddenPage.tsx`) instead
  of the shell. This is a deliberate, Admin-Panel-only exception to the
  redirect-to-own-surface behavior every other role-scoped route group
  uses — the Admin Panel is sensitive enough that a silent bounce would be
  confusing, per the step's explicit requirement.
- **Super-Admin-only pages within `/admin`** (`/admin/users`,
  `/admin/settings` — docs/roles-and-permissions.md §6) are *not* split
  into a separate route group; they call the existing, unmodified
  `requireRole(locale, ["super_admin"])` directly in their own
  `page.tsx`, redirecting a plain Admin back to `/admin` rather than
  Forbidden — matching roles-and-permissions.md §3's existing rule ("not
  shown a disabled form"). Two different guards, two different outcomes,
  both reused from `auth/guards/require-role.ts` with no duplicated
  session/role logic.
- **`src/components/admin/`** — the reusable shell: `AdminShell` (Server
  Component; resolves nav labels once via `getTranslations`, filters
  Super-Admin-only nav items) renders `AdminChrome` (Client Component;
  owns mobile-sidebar open state) which composes `Sidebar`/`SidebarItem`,
  `Header`/`Breadcrumb`/`UserMenu`, and the page content area.
  `AdminPlaceholderPage` is the shared Heading + Description + Empty State
  template every `/admin/*` page (besides the Dashboard) renders, driven
  by `admin-nav.ts`'s registry and `Admin.nav.<id>` translations — one
  place to add a section, not thirteen near-duplicate page files.
  `PermissionGuard` gates a piece of UI by role (used to hide the
  Users/Site Settings sidebar links from plain Admins) — presentation
  only, the real boundary is always the page-level guard.
- **Sign-out** reuses the existing `signOutAction` (`auth/actions/
  sign-out.action.ts`, unused before this step) — `UserMenu` calls it and
  redirects client-side, the same pattern `SignInForm` already uses for
  post-action navigation.
- **Bilingual**: a new `Admin` messages namespace
  (`messages/{en,ar}/admin.json`) covers all shell/nav copy, following the
  same static-chrome pattern every other surface uses.
- Icons are looked up client-side from `admin-nav.ts` by `id` rather than
  passed as props from the server — a Lucide icon is a component
  reference, and Server Components can't pass a bare function reference to
  a Client Component (only serializable data or already-rendered JSX).

## 16. Related documents

- [`architecture.md`](./architecture.md) §4 — where this fits in the
  overall stack.
- [`database-overview.md`](./database-overview.md) §1 — the real `profiles`
  table's full column/index/constraint list.
- [`roles-and-permissions.md`](./roles-and-permissions.md) — the full
  permission matrix and page inventory this architecture is built to serve.
- [`roadmap.md`](./roadmap.md) — when dashboards/CMS/payments/courses land.
