# Legal, Contact & Static Content Platform

Production-ready Privacy Policy, Terms of Use, Refund Policy, and Contact
pages, database-backed and centrally configurable — no legal or contact
content is hardcoded in a component.

## 1. Architecture

```
Static Content CMS (src/cms/, legal_documents table)
  ├─ /admin/content            Bilingual editor (TipTap), Save Draft / Publish
  └─ LegalDocumentService.getPublishedBySlug
       ├─ token substitution   {{supportEmail}} etc. ← `contact` site setting
       └─ buildLegalToc        heading ids + TOC, injected at render time
            └─ /privacy /terms /refunds   (shared LegalDocumentPage shell)

Contact domain (src/contact/, contact_messages table)
  ├─ /contact                  Public form → submitContactMessageAction
  └─ /admin/contact            Inbox: search/filter/paginate, mark resolved, delete

Global Site Settings (cms_site_settings, key "contact")
  └─ /admin/settings           One form; Footer, /contact, and every legal
                                document's {{token}} all read this key
```

Two rules hold this together:

1. **Legal document bodies never hardcode contact info.** They write
   `{{companyName}}`, `{{supportEmail}}`, `{{privacyEmail}}`, etc.; these
   are substituted from the `contact` site setting at render time
   (`src/cms/utils/legal-tokens.ts`). Editing that one setting changes
   every legal page and the Footer on their next render — no legal
   document re-edit, no code change.
2. **Heading ids are never author-set.** `buildLegalToc`
   (`src/cms/utils/legal-toc.ts`) slugs every `h2`/`h3` deterministically
   from its text at render time, the same "docs site" convention
   GitHub/MDN use — any document written through the plain
   `RichTextEditor` gets a working sticky Table of Contents for free.

## 2. Database schema (migration 0028)

- **legal_documents** — one row per document. `slug` is plain `text`
  (`privacy` | `terms` | `refunds` today — documented in
  `LEGAL_DOCUMENT_SLUGS`, not a closed type: a new legal page is a new
  row, never a migration). `title_en`/`title_ar`/`content_en`/
  `content_ar` are always both required — a legal document must be
  complete in both languages, unlike blog articles which are
  deliberately single-language. `version` increments on every publish;
  `published`/`published_at` distinguish the live version from an
  in-progress draft — `LegalDocumentService.getPublishedBySlug` only
  ever reads `published: true`.
- **contact_messages** — one row per `/contact` submission. `status`
  (`new` → `resolved`) plus `resolved_at`. No owning user — the sender
  may not have an account.
- **cms_site_settings** (existing generic key/value table) — new key
  `contact`, typed as `ContactSettings` (`src/cms/types/site-settings.ts`).

## 3. Static Content CMS

`src/cms/{types,repositories,services,validators,actions}/legal-document.*`
— `LegalDocumentService`:

- `getPublishedBySlug(slug, locale)` — the ONE unauthenticated read.
  Resolves the locale's title/content, substitutes `{{tokens}}` from the
  `contact` setting, then runs `buildLegalToc`. Returns `null` for a
  missing or unpublished slug (the page 404s either way).
- `getAllForAdmin` / `getByIdForAdmin` — admin-gated (`requireCmsAccess`,
  same admin/super_admin roles as the rest of the CMS domain).
- `saveDraft(id, input)` — sanitizes (`sanitizeLegalHtml`) and persists
  content without touching `published`/`version`.
- `publish(id, input)` — saves AND bumps `version` + stamps
  `published_at` in one step.

`sanitize-legal-html.ts` is a narrower allowlist than the blog's own
sanitizer — headings/paragraphs/lists/links/a small table, never
images/video/interactive blocks — reusing the same shared
`RichTextEditor` component the blog uses, just with less of its surface
actually reaching the database.

## 4. Public pages

`/privacy`, `/terms`, `/refunds` share `LegalDocumentPage`
(`src/components/legal/`): a hero band matching the course details
page's exact treatment, a "last updated" line from the document's own
`publishedAt`, a sticky desktop `TableOfContents` (scroll-spy, same
`IntersectionObserver` pattern `SectionAnchorTabs` uses) alongside a
comfortable reading-width column, and `SectionAnchorTabs` reused as-is
for mobile. Body HTML renders via `dangerouslySetInnerHTML` — safe
because `sanitizeLegalHtml` (write time) is the actual security
boundary, not this component. `revalidate = 60` (ISR) — an admin publish
reaches the public page within one revalidation window.

## 5. Contact domain

`src/contact/` — `ContactMessageService.submit` is the one
unauthenticated write (anyone can reach `/contact`, signed in or not);
every other method (`searchResolved`, `markResolved`, `remove`) is
admin-gated via `requireContactAccess`. The public form
(`src/components/contact/ContactForm.tsx`) is React Hook Form + Zod,
with a localized-messages schema factory (`createContactFormSchema`,
mirroring `createSignUpSchema`) — the Server Action re-validates against
a plain server-side schema regardless of what the client already
checked.

`/admin/contact` — search/filter/paginate inbox (URL-search-param
driven, mirrors `/admin/orders`); `/admin/contact/[id]` — full message +
mark resolved / delete.

## 6. Global Site Settings

The `contact` key on `cms_site_settings` (existing generic key/value
store — no new table): `companyName`, `brandName`, `supportEmail`,
`businessEmail`, `paymentsEmail`, `privacyEmail`, `phone`,
`address`/`businessHours`/`copyrightText` (LocalizedText). Social links
are NOT duplicated here — they already live in the `footer` key.
`resolveContactSettings` (`src/cms/utils/resolve-contact-settings.ts`) is
the one locale-flattening function every consumer (Footer, `/contact`,
`LegalDocumentService`'s token substitution) shares.

`/admin/settings` (super_admin only) is the one edit surface. Saving it
propagates to the Footer, `/contact`, and every legal document's
`{{token}}` references on their next render — the literal mechanism
behind "change one value, update everywhere."

## 7. Footer

`Footer.tsx` now accepts a `contact: ResolvedContactSettings | null`
prop and renders support email + phone under the tagline (graceful
`null` — nothing renders until an admin first saves the setting, same
pattern `settings`/`FooterSettings` already followed). The Privacy/
Terms/Refunds/Contact links themselves are NOT hardcoded in this
component — they're ordinary `cms_navigation_items` rows (seeded once in
migration 0028's data step: Contact under `footer_company`, fixing a
pre-existing dead `href="/"` placeholder row; Privacy/Terms/Refunds
under `footer_resources`), rendered through the existing
`CmsNavigationService` the Footer already reads.

## 8. SEO

Every public page has `generateMetadata` with title/description,
canonical + per-locale `alternates.languages` (+ `x-default`),
OpenGraph, and Twitter card metadata (`/privacy`/`/terms`/`/refunds`
share `buildLegalPageMetadata`, `src/cms/utils/legal-metadata.ts`).
`/contact` additionally emits `ContactPage`/`Organization` JSON-LD
sourced from the `contact` site setting.

## 9. Accessibility

Semantic HTML throughout (`<nav>`, `<article>`, `<dl>`/`<dt>`/`<dd>` for
FAQ and info cards); the sticky TOC and mobile anchor tabs are both
keyboard-reachable `<a href="#...">` links, not JS-only click handlers;
form fields have visible `<label>` elements with `aria-invalid`/
`aria-describedby` wired to inline error text; heading hierarchy is
`h1` (hero, outside the document body) → `h2`/`h3` (document sections,
what the TOC indexes) → nothing skipped. Smooth scrolling
(`prefers-reduced-motion`-aware) was already global; legal-document
headings additionally get `scroll-margin-top` so an anchor jump doesn't
tuck a heading under the sticky nav.

## 10. Future extension points

- A dedicated version-history table (today `version` is a single
  incrementing integer on the row itself, not a row-per-publish
  history) — sufficient for the current "version number + last updated
  date" requirement, but a full diff/rollback UI would need its own
  append-only snapshot table.
- CSV export of `contact_messages` — the repository's `search` is
  already a typed, paginated query an export endpoint can reuse.
- Additional legal documents (Cookie Policy, Instructor Agreement, …) —
  `slug` is plain text; a new document is a new `legal_documents` row
  (seeded or created via a future "New Document" admin action), never a
  migration.
- Multiple payout/contact regions — `ContactSettings` is single-tenant
  today; a multi-region variant would key `cms_site_settings` by
  `contact:<region>` without a schema change.
