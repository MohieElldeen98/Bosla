# HeroUI Homepage + Navbar Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the CMS-driven homepage and the shared site-wide `Navbar` with a static, HeroUI-built homepage and navbar, and remove the global loading-overlay system, per `docs/superpowers/specs/2026-07-29-heroui-homepage-navbar-rebuild-design.md`.

**Architecture:** New static homepage at `[locale]/(public)/page.tsx` composed from new components under `src/components/home/`; old CMS-driven homepage preserved unroutable at `[locale]/(public)/_draft-homepage/page.tsx`. `Navbar` and its sub-components rewritten in place using HeroUI primitives, reusing all existing auth/session/notification/i18n data logic unchanged. `NavigationLoader`/`BoslaPageLoader` deleted; `loading.tsx` gets a minimal fallback.

**Tech Stack:** Next.js 15 App Router, React 19, `@heroui/react` 3.2.2 + `@heroui/styles`, Tailwind CSS v4, next-intl, TypeScript.

## Global Constraints

- No test framework exists in this project (no vitest/jest/playwright configured) — every task's verification is `npm run typecheck`, `npm run lint`, and, where noted, a real browser check, run in that order, not a red/green unit test cycle.
- Every user-facing string goes through next-intl (`messages/en/*.json` + `messages/ar/*.json`), never hardcoded — this project is fully bilingual (EN/LTR, AR/RTL) throughout.
- `useSession`, `getMyProfileAction`, `signOutAction`, `SessionClientService`, `isRoleAllowed`, `resolveDisplayName`, `UserAvatar`, `NotificationBell`'s Server Actions (`listNotificationsAction`, `markAllNotificationsAsReadAction`, `markNotificationAsReadAction`, `unreadNotificationCountAction`), and `LanguageSwitcher`'s locale-routing logic (`router.replace(pathname, { locale })`) are reused exactly as they exist today — only their JSX/UI shell changes.
- Internal navigation always uses `@/i18n/navigation`'s `Link`/`useRouter` (locale-aware), never `next/link` or a plain `<a>`, for any in-app route.
- HeroUI's `render` prop, where used (e.g. `Button`/`Card` needing to render as this project's `Link` instead of their default DOM element), is always a **function**, never a JSX element: `render={(props) => <Link {...props} href="..." />}`, matching HeroUI's actual `DOMRenderFunction` type and its own documented examples — never `render={<Link ... />}` (a first draft of this plan used the element form throughout, copying the *unrelated* Base UI/shadcn `render` convention already used elsewhere in this codebase; an implementer caught the resulting typecheck error before any code shipped, and every occurrence was corrected). For simple "this element opens a popover/drawer" triggers, HeroUI needs no `render` prop and no `Trigger` subcomponent at all — verified directly against HeroUI's own real demos — the trigger element (e.g. a `Button`) is just placed as a direct child of `Popover`/`Drawer`, sibling to `Popover.Content`/`Drawer.Backdrop`.
- Icons: Lucide only (`iconLibrary: "lucide"` in `components.json`), never emoji.
- HeroUI's `Button` (and other React Aria Components-based primitives) use the `isX` boolean prop convention (`isDisabled`, `isOpen`, `isPressed`, `isDismissable`), not plain HTML attribute names — `disabled={x}` on a HeroUI `Button` is a real typecheck error, not a style choice; use `isDisabled={x}`. Caught and fixed once already (Task 4) — watch for this in every later task using `Button`.
- Commit after each task with the project's established Arabic-body commit template (see any recent commit in this repo for the exact section headers). Committing directly (no pre-commit approval step) is authorized for the duration of this plan's execution — the user reviews commits after the fact, not before. Pushing to `origin` remains a separate, later decision, not part of any individual task.

---

### Task 1: Remove the loading-overlay system

**Files:**
- Delete: `src/components/layout/NavigationLoader.tsx`
- Delete: `src/components/brand/BoslaPageLoader.tsx`
- Modify: `src/app/[locale]/layout.tsx` (remove `NavigationLoader` import, its `<Suspense>` wrapper, and the now-unused `Suspense` import if nothing else in the file needs it)
- Modify: `src/app/[locale]/loading.tsx` (replace body)

**Interfaces:** None — this task has no consumers in later tasks; it's pure removal.

- [ ] **Step 1: Confirm no other consumers exist**

Run: `grep -rl "BoslaPageLoader\|NavigationLoader" src`
Expected output: only `src/app/[locale]/layout.tsx`, `src/app/[locale]/loading.tsx`, `src/components/layout/NavigationLoader.tsx`, `src/components/brand/BoslaPageLoader.tsx` (the four files this task touches/deletes). If anything else appears, stop and re-scope this task before continuing.

- [ ] **Step 2: Delete the two files**

```bash
git rm src/components/layout/NavigationLoader.tsx src/components/brand/BoslaPageLoader.tsx
```

- [ ] **Step 3: Update `src/app/[locale]/layout.tsx`**

Remove this import:
```tsx
import { NavigationLoader } from "@/components/layout/NavigationLoader";
```

Remove this block (including its comment) from the JSX:
```tsx
{/* Suspense: useSearchParams inside would otherwise force the
    whole tree dynamic during prerender. */}
<Suspense fallback={null}>
  <NavigationLoader />
</Suspense>
```

If `Suspense` from `"react"` is no longer used anywhere else in the file, remove that import too — check with `grep -n "Suspense" src/app/[locale]/layout.tsx` after the edit.

- [ ] **Step 4: Replace `src/app/[locale]/loading.tsx`**

```tsx
export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-live="polite">
      <div
        aria-hidden="true"
        className="size-8 animate-spin rounded-full border-2 border-border border-t-primary"
      />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
```

- [ ] **Step 5: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean, no errors about missing `NavigationLoader`/`BoslaPageLoader` imports anywhere.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "<Arabic-template message — propose to user for approval first>"
```

---

### Task 2: Rename shadcn's `--accent` to `--tint`, then add HeroUI's token bridge

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/avatar.tsx`, `src/components/ui/combobox.tsx`, `src/components/ui/dropdown-menu.tsx`, `src/components/ui/select.tsx`
- Modify: `src/components/sections/testimonials.tsx`, `src/components/sections/featured-courses.tsx`, `src/components/admin/SectionCard.tsx`, `src/components/admin/EmptyState.tsx`, `src/components/admin/blog/RichTextEditor.tsx`, `src/components/blog/BlogSearchForm.tsx`, `src/components/courses/CourseCatalogFilters.tsx`, `src/components/blog/ArticleCard.tsx`, `src/components/courses/CourseIdentityBlock.tsx`

**Interfaces:** Produces `--surface`, `--danger`, `--danger-foreground`, and (after the rename) a clean, non-colliding `--accent`/`--accent-foreground` in `:root`, all safe for every later HeroUI-component task to rely on globally (a `:root`-level override, not scoped — see the "Why a global override, not scoping" note below for why scoping was rejected).

**Why this task exists:** HeroUI's `--accent`/`--accent-foreground` is its main brand-color slot. shadcn already defines `--accent`/`--accent-foreground` in `:root` — but for something completely different: a pale hover/highlight tint used by shadcn's `dropdown-menu`/`combobox`/`avatar`/`select` primitives and ~13 other call sites (including `src/components/admin/blog/RichTextEditor.tsx`, which alone has 15+ occurrences). Same variable name, two unrelated meanings — a first attempt at this task simply overrode `:root`'s `--accent`, verified via `git diff` before it was ever committed to silently break shadcn's hover styling everywhere outside this rebuild. The fix isn't to override globally without renaming first, and it isn't to scope the override to a DOM subtree either (see the note below) — it's to give shadcn's token a new, accurate name, freeing `--accent` for HeroUI's exclusive use with zero collision.

**Why a global override, not scoping:** HeroUI's `Popover`/`Drawer` are built on `react-aria-components`, which portals overlay content to `document.body` by default (confirmed directly in the installed `react-aria-components` behavior, and documented React Aria practice: "it is best to portal to the root of the entire application"). A `[data-theme="bosla"]` block scoped to the navbar's `<header>` would correctly theme the header's inline content (logo, nav links, trigger buttons) but silently fail for the portaled popover/drawer *content* (the actual dropdown panels, the mobile drawer panel) — those render outside the header's DOM subtree entirely, so they wouldn't inherit a scoped CSS variable. The rename removes the need for any scoping.

- [ ] **Step 1: Rename shadcn's colliding token in `globals.css`**

In `src/app/globals.css`'s `@theme inline` block, change:
```css
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
```
to:
```css
  --color-tint-foreground: var(--tint-foreground);
  --color-tint: var(--tint);
```

In the `:root { ... }` block, change:
```css
  --accent: oklch(0.94 0.03 265.5);
  --accent-foreground: oklch(0.33 0.13 265.5);
```
to:
```css
  --tint: oklch(0.94 0.03 265.5);
  --tint-foreground: oklch(0.33 0.13 265.5);
```

In the `.dark { ... }` block, change:
```css
  --accent: oklch(0.3 0.08 265.5);
  --accent-foreground: oklch(0.9 0.06 265.5);
```
to:
```css
  --tint: oklch(0.3 0.08 265.5);
  --tint-foreground: oklch(0.9 0.06 265.5);
```

(Dark mode has no working toggle anywhere in this codebase today — no `next-themes`, no toggle component — so this block is currently dormant, but renamed for consistency with `:root` rather than left stale.)

- [ ] **Step 2: Update every Tailwind utility-class usage of the old name**

Run this from the repo root to see every occurrence that needs updating (should match the 13 files listed above, ~30 occurrences total):
```bash
grep -rn "bg-accent\b\|text-accent-foreground\b\|hover:bg-accent\|focus:bg-accent\|data-highlighted:bg-accent\|data-highlighted:text-accent-foreground\|data-popup-open:bg-accent\|data-popup-open:text-accent-foreground\|data-open:bg-accent\|data-open:text-accent-foreground\|group-focus/dropdown-menu-item:text-accent-foreground" src --include="*.tsx"
```

For every match, replace `accent` with `tint` in that exact utility class only (`bg-accent` → `bg-tint`, `text-accent-foreground` → `text-tint-foreground`, `hover:bg-accent` → `hover:bg-tint`, `hover:bg-accent/40` → `hover:bg-tint/40`, `hover:bg-accent/60` → `hover:bg-tint/60`, `focus:bg-accent` → `focus:bg-tint`, `focus:text-accent-foreground` → `focus:text-tint-foreground`, `focus:**:text-accent-foreground` → `focus:**:text-tint-foreground`, `data-highlighted:bg-accent` → `data-highlighted:bg-tint`, `data-highlighted:text-accent-foreground` → `data-highlighted:text-tint-foreground`, `data-popup-open:bg-accent` → `data-popup-open:bg-tint`, `data-popup-open:text-accent-foreground` → `data-popup-open:text-tint-foreground`, `data-open:bg-accent` → `data-open:bg-tint`, `data-open:text-accent-foreground` → `data-open:text-tint-foreground`, `group-focus/dropdown-menu-item:text-accent-foreground` → `group-focus/dropdown-menu-item:text-tint-foreground`). Do not touch any other class on the same line (e.g. `text-destructive`, `bg-card` stay exactly as they are). `src/components/auth/UserAvatar.tsx` has one occurrence in a *comment* only (`` `bg-primary` instead... of the default `bg-accent` ``) — update the comment's wording too for accuracy, no code change needed there.

After editing, re-run the same `grep` command from this step — it should now return **zero** matches (confirming every old-named usage was caught).

- [ ] **Step 3: Add the new, non-colliding tokens**

In `src/app/globals.css`'s `@theme inline` block, add (near the other `--color-*` mappings):
```css
  --color-danger-foreground: var(--danger-foreground);
  --color-danger: var(--danger);
  --color-surface: var(--surface);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
```

In the `:root { ... }` block, add — `--accent`/`--accent-foreground` copied verbatim from `--primary`/`--primary-foreground` already in that same block (this is intentional: HeroUI's brand color is the same indigo as `--primary`, just under the name `@heroui/styles` reads):
```css
  /* HeroUI token bridge — --accent/--accent-foreground intentionally
     match --primary/--primary-foreground above (same brand indigo,
     different variable name HeroUI's own stylesheet reads). Safe now
     that shadcn's own --accent was renamed to --tint in Step 1 — no
     collision. */
  --accent: oklch(0.478 0.192 265.5);
  --accent-foreground: oklch(0.985 0 0);
  --surface: oklch(1 0 0);
  --danger: oklch(0.577 0.245 27.325);
  --danger-foreground: oklch(0.985 0 0);
```

In the `.dark { ... }` block, add (values matching dark-mode `--primary`/`--primary-foreground`/`--card`/`--destructive` already in that block):
```css
  --accent: oklch(0.72 0.15 265.5);
  --accent-foreground: oklch(0.145 0 0);
  --surface: oklch(0.205 0.015 265.5);
  --danger: oklch(0.704 0.191 22.216);
  --danger-foreground: oklch(0.985 0 0);
```

- [ ] **Step 4: Verify**

Run: `NEXT_PUBLIC_SITE_URL="http://localhost:3000" npm run build`
Expected: succeeds, no CSS errors.

Run: `grep -n '\-\-accent\|\-\-tint' src/app/globals.css` — confirm `--tint`/`--tint-foreground` appear in `@theme inline`, `:root`, and `.dark` with the OLD accent values, and `--accent`/`--accent-foreground` appear in the same three places with the NEW brand-indigo values (matching `--primary`/`--primary-foreground` in each respective block).

Full visual verification (confirming shadcn's dropdown/select/combobox/avatar hover states still render correctly with the renamed token, and that no page anywhere still shows a broken/missing hover highlight) happens in Task 14, once real pages exist to check — this task's own scope ends at a clean build with the rename fully applied.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "<Arabic-template message>"
```

---

### Task 3: Move the current homepage to an unroutable draft

**Files:**
- Move: `src/app/[locale]/(public)/page.tsx` → `src/app/[locale]/(public)/_draft-homepage/page.tsx`

**Interfaces:** None — Task 13 creates the new `page.tsx` from scratch at the now-empty original path; it does not import anything from the moved file.

- [ ] **Step 1: Move the file**

```bash
mkdir -p "src/app/[locale]/(public)/_draft-homepage"
git mv "src/app/[locale]/(public)/page.tsx" "src/app/[locale]/(public)/_draft-homepage/page.tsx"
```

- [ ] **Step 2: Verify it's now unroutable**

Run: `npm run build`
Expected: build succeeds. In the route list output, confirm `/[locale]` (the bare homepage route) does **not** appear — Next's private-folder convention (leading `_`) excludes `_draft-homepage` from routing entirely, so there is currently no homepage route at all until Task 13 adds one back. This is expected and correct at this point in the plan.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "<Arabic-template message>"
```

---

### Task 4: Rewrite `LanguageSwitcher` on HeroUI `Popover`

**Files:**
- Modify: `src/components/layout/language-switcher.tsx`

**Interfaces:**
- Consumes: `routing.locales: Locale[]`, `routing.defaultLocale` (from `@/i18n/routing`), `usePathname`/`useRouter` (from `@/i18n/navigation`), `useLocale`/`useTranslations` (from `next-intl`) — all unchanged from today.
- Produces: `LanguageSwitcher({ className?: string; onSelectLocale?: () => void }): JSX.Element` — same prop signature as today (Task 7's mobile drawer passes `onSelectLocale` to close itself on selection, exactly as it does today with the shadcn version).

- [ ] **Step 1: Write the new component**

```tsx
"use client";

import { useId, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Globe, Check } from "lucide-react";
import { Popover, Button } from "@heroui/react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function LanguageSwitcher({
  className,
  onSelectLocale,
}: {
  className?: string;
  onSelectLocale?: () => void;
}) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const descriptionId = useId();
  const currentLabel = t(`locales.${locale}`);

  function handleSelect(nextLocale: Locale) {
    setIsOpen(false);
    onSelectLocale?.();
    if (nextLocale === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
    });
  }

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="ghost"
        size="sm"
        aria-label={t("label")}
        aria-describedby={descriptionId}
        isDisabled={isPending}
        className={className}
      >
        <Globe aria-hidden="true" className="size-4" />
        <span>{currentLabel}</span>
      </Button>
      <span id={descriptionId} className="sr-only">
        {t("srCurrentLanguage", { language: currentLabel })}
      </span>
      <Popover.Content>
        <Popover.Dialog className="min-w-40 p-1">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => handleSelect(loc)}
              aria-current={loc === locale ? "true" : undefined}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              {t(`locales.${loc}`)}
              {loc === locale && <Check aria-hidden="true" className="size-4 text-accent" />}
            </button>
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. This component isn't wired into the live `Navbar` yet (Task 7 does that) — no browser check needed until then.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/language-switcher.tsx
git commit -m "<Arabic-template message>"
```

---

### Task 5: Rewrite `NotificationBell`'s UI shell on HeroUI `Badge` + `Popover`

**Files:**
- Modify: `src/components/notifications/NotificationBell.tsx`

**Interfaces:**
- Consumes: `listNotificationsAction`, `markAllNotificationsAsReadAction`, `markNotificationAsReadAction`, `unreadNotificationCountAction` (from `@/notifications/actions/notification.actions`), `ResolvedNotification` type — all unchanged.
- Produces: `NotificationBell(): JSX.Element` — no props, same as today (self-contained, drops into any authenticated header, per its own existing doc comment).

**Note:** Only the return statement (the rendered markup) changes. The data-fetching top section — state, the 45s poll `useEffect`, `useCallback`/handler functions — is preserved unchanged. Field/handler names below are verified directly against the current file and `ResolvedNotification` (`src/notifications/types/notification.ts:41-51`): the fields are `id`, `title`, `body`, `isRead`, `createdAt` (there is no `message` or `readAt`-as-timestamp-check field — `isRead: boolean` is what drives unread styling); state is `open`/`recent`/`unreadCount`/`isLoading`; handlers are `handleItemClick`/`handleMarkAllAsRead`/`refreshUnreadCount`; the translation hook is `useTranslations("Notifications.bell")` (keys are called directly, e.g. `t("title")`, not `t("bell.title")`).

- [ ] **Step 1: Replace the full file**

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bell } from "lucide-react";
import { Badge, Popover, Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import {
  listNotificationsAction,
  markAllNotificationsAsReadAction,
  markNotificationAsReadAction,
  unreadNotificationCountAction,
} from "@/notifications/actions/notification.actions";
import type { Locale } from "@/i18n/routing";
import type { ResolvedNotification } from "@/notifications/types/notification";

const RECENT_PAGE_SIZE = 8;
const POLL_INTERVAL_MS = 45_000;

export function NotificationBell() {
  const t = useTranslations("Notifications.bell");
  const locale = useLocale() as Locale;

  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState<ResolvedNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshUnreadCount = useCallback(async () => {
    const count = await unreadNotificationCountAction();
    setUnreadCount(count);
  }, []);

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setIsLoading(true);
    listNotificationsAction({ pageSize: RECENT_PAGE_SIZE }, locale).then((result) => {
      if (!cancelled) {
        setRecent(result.items);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, locale]);

  async function handleItemClick(notification: ResolvedNotification) {
    if (notification.isRead) return;
    setRecent((prev) => prev.map((item) => (item.id === notification.id ? { ...item, isRead: true } : item)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    const result = await markNotificationAsReadAction(notification.id, notification.updatedAt);
    if (!result.success) {
      refreshUnreadCount();
    }
  }

  async function handleMarkAllAsRead() {
    setRecent((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    await markAllNotificationsAsReadAction();
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Badge.Anchor>
        <Button variant="ghost" isIconOnly aria-label={t("label")}>
          <Bell aria-hidden="true" className="size-5" />
        </Button>
        {unreadCount > 0 && (
          <Badge color="danger" className="text-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </Badge>
        )}
      </Badge.Anchor>
      <Popover.Content>
        <Popover.Dialog className="w-80 p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <Popover.Heading className="text-sm font-semibold text-foreground">{t("title")}</Popover.Heading>
            {unreadCount > 0 && (
              <button type="button" onClick={handleMarkAllAsRead} className="text-xs font-medium text-accent hover:underline">
                {t("markAllAsRead")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{t("loading")}</p>
            ) : recent.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              recent.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleItemClick(notification)}
                  className={`block w-full border-b border-border px-4 py-3 text-start last:border-b-0 hover:bg-muted ${
                    notification.isRead ? "" : "bg-accent/5"
                  }`}
                >
                  <span className="flex items-start gap-1.5">
                    {!notification.isRead && (
                      <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{notification.title}</span>
                  </span>
                  {notification.body && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{notification.body}</p>
                  )}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
                      new Date(notification.createdAt),
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-border px-4 py-2.5 text-center text-sm font-medium text-accent hover:bg-muted"
          >
            {t("viewAll")}
          </Link>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/notifications/NotificationBell.tsx
git commit -m "<Arabic-template message>"
```

---

### Task 6: Rewrite `NavbarUserMenu` on HeroUI `Avatar` + `Popover`

**Files:**
- Modify: `src/components/layout/navbar-user-menu.tsx`

**Interfaces:**
- Consumes: `signOutAction` (`@/auth/actions/sign-out.action`), `SessionClientService` (`@/auth/services/session-client.service`), `isRoleAllowed` (`@/auth/utils/role.utils`), `resolveDisplayName` (`@/auth/utils/display-name`), `AuthUser`/`Profile` types — all unchanged.
- Produces: `NavbarUserMenu({ user: AuthUser; profile: Profile | null; onNavigate?: () => void }): JSX.Element` — same prop signature as today.

- [ ] **Step 1: Write the new component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { LayoutDashboard, LogOut, ShieldCheck } from "lucide-react";
import { Avatar, Popover, Button } from "@heroui/react";
import { Link, useRouter } from "@/i18n/navigation";
import { signOutAction } from "@/auth/actions/sign-out.action";
import { SessionClientService } from "@/auth/services/session-client.service";
import { isRoleAllowed } from "@/auth/utils/role.utils";
import { getInitials, resolveDisplayName } from "@/auth/utils/display-name";
import type { Profile } from "@/auth/types/profile";
import type { AuthUser } from "@/auth/types/session";

const ADMIN_ROLES = ["admin", "super_admin"] as const;

export function NavbarUserMenu({
  user,
  profile,
  onNavigate,
}: {
  user: AuthUser;
  profile: Profile | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations("Navbar.userMenu");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const displayName = resolveDisplayName(profile, user);
  const isAdmin = isRoleAllowed(user.role, [...ADMIN_ROLES]);

  function closeMenu() {
    setOpen(false);
    onNavigate?.();
  }

  function handleSignOut() {
    setOpen(false);
    startTransition(async () => {
      // Both calls are required — signOutAction alone can't reach the
      // browser's Supabase client, so useSession()'s onAuthStateChange
      // never fires and the navbar keeps showing signed-in state.
      await Promise.all([signOutAction(), SessionClientService.signOut()]);
      router.push("/");
      router.refresh();
      onNavigate?.();
    });
  }

  return (
    <Popover isOpen={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="sm" className="gap-2 px-2" isDisabled={isPending}>
        <Avatar className="size-7 text-xs font-semibold">
          <Avatar.Image src={profile?.avatarUrl ?? undefined} alt="" />
          <Avatar.Fallback>{getInitials(displayName)}</Avatar.Fallback>
        </Avatar>
        <span className="hidden max-w-32 truncate text-start text-sm font-medium text-foreground sm:block">
          {displayName}
        </span>
      </Button>
      <Popover.Content>
        <Popover.Dialog className="w-56 p-1">
          <div className="px-3 py-2">
            <span className="block truncate font-medium text-foreground">{displayName}</span>
            {user.email && displayName !== user.email && (
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {user.email}
              </span>
            )}
          </div>
          <div className="my-1 h-px bg-border" />
          <Link
            href="/me"
            onClick={closeMenu}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
            {t("myWorkspace")}
          </Link>
          {isAdmin && (
            <>
              <div className="my-1 h-px bg-border" />
              <Link
                href="/admin"
                onClick={closeMenu}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
              >
                <ShieldCheck aria-hidden="true" className="size-4" />
                {t("adminDashboard")}
              </Link>
            </>
          )}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={handleSignOut}
            disabled={isPending}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-start text-sm text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            <LogOut aria-hidden="true" className="size-4" />
            {isPending ? t("signingOut") : t("signOut")}
          </button>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
```

Note: `UserAvatar` (`src/components/auth/UserAvatar.tsx`) wraps shadcn's `Avatar` with `getInitials(name)` (from `@/auth/utils/display-name` — the same module `resolveDisplayName` already lives in) as its fallback — that exact function is imported and reused directly above rather than reimplementing initials logic, consistent with reusing every other piece of this app's auth-adjacent utilities as-is.

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/navbar-user-menu.tsx
git commit -m "<Arabic-template message>"
```

---

### Task 7: Rewrite `Navbar` shell + mobile `Drawer`; drop CMS header-links fetch

**Files:**
- Modify: `src/components/layout/navbar.tsx`
- Modify: `src/app/[locale]/(public)/layout.tsx`
- Modify: `messages/en/navigation.json`, `messages/ar/navigation.json`

**Interfaces:**
- Consumes: `Navbar()` (Task 4), `NavbarUserMenu` (Task 6), `NotificationBell` (Task 5), `useSession` (`@/auth/hooks/use-session`), `getMyProfileAction` (`@/auth/actions/get-my-profile.action`), `getDirection` (`@/i18n/direction`) — all unchanged.
- Produces: `Navbar(): JSX.Element` — **prop signature changes**: no longer takes `links` (was `ResolvedCmsNavigationItem[]`), since links are now fixed. `(public)/layout.tsx` (this task's second file) stops passing that prop and stops fetching it.

- [ ] **Step 1: Add fixed nav-link labels to `navigation.json`**

In `messages/en/navigation.json`, inside the `"Navbar"` object, add:
```json
    "home": "Home",
    "courses": "Courses",
    "blog": "Blog",
```

In `messages/ar/navigation.json`, inside the `"Navbar"` object, add:
```json
    "home": "الرئيسية",
    "courses": "الكورسات",
    "blog": "المقالات",
```

(Keep every existing key in both files unchanged — `myArticles`, `signIn`, `getStarted`, etc.)

- [ ] **Step 2: Write the new `Navbar`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { BoslaLoader } from "@/components/brand/BoslaLoader";
import { Drawer, Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NavbarUserMenu } from "@/components/layout/navbar-user-menu";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useSession } from "@/auth/hooks/use-session";
import { getMyProfileAction } from "@/auth/actions/get-my-profile.action";
import type { Profile } from "@/auth/types/profile";

const NAV_LINKS = [
  { href: "/", key: "home" },
  { href: "/courses", key: "courses" },
  { href: "/blog", key: "blog" },
] as const;

export function Navbar() {
  const t = useTranslations("Navbar");
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { user, isLoading: isSessionLoading } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsProfileLoading(false);
      return;
    }
    let cancelled = false;
    setIsProfileLoading(true);
    getMyProfileAction().then((result) => {
      if (!cancelled) {
        setProfile(result);
        setIsProfileLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-white/60 backdrop-blur-sm"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
          <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
            <BoslaLoader label="" ring="strong" className="size-7" />
          </span>
          <span className="text-lg tracking-tight">Bosla</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitcher className="text-muted-foreground hover:bg-muted hover:text-foreground" />
          <div
            className={`flex items-center gap-2 transition-opacity duration-200 ${isSessionLoading || (!!user && isProfileLoading) ? "opacity-0" : "opacity-100"}`}
          >
            {user ? (
              <>
                <NotificationBell />
                <NavbarUserMenu user={user} profile={profile} />
              </>
            ) : (
              <>
                <Button variant="ghost" render={(props) => <Link {...props} href="/sign-in" />}>
                  {t("signIn")}
                </Button>
                <Button render={(props) => <Link {...props} href="/sign-up" />}>{t("getStarted")}</Button>
              </>
            )}
          </div>
        </div>

        <Drawer isOpen={open} onOpenChange={setOpen}>
          <Drawer.Backdrop>
            <Drawer.Content placement="end">
              <Drawer.Dialog>
                <Drawer.CloseTrigger aria-label={t("closeMenu")} />
                <Drawer.Header>
                  <Drawer.Heading className="flex items-center gap-2">
                    <span className="flex size-8 items-center justify-center rounded-full bg-accent text-accent-foreground">
                      <BoslaLoader label="" ring="strong" className="size-6" />
                    </span>
                    Bosla
                  </Drawer.Heading>
                </Drawer.Header>
                <Drawer.Body>
                  <nav className="flex flex-col gap-1 px-4">
                    {NAV_LINKS.map((link) => (
                      <Link
                        key={link.key}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        {t(link.key)}
                      </Link>
                    ))}
                  </nav>
                </Drawer.Body>
                <Drawer.Footer>
                  <div className="flex flex-col gap-2 p-4">
                    <LanguageSwitcher
                      className="w-full justify-center"
                      onSelectLocale={() => setOpen(false)}
                    />
                    {user ? (
                      <div className="flex items-center gap-2">
                        <NotificationBell />
                        <NavbarUserMenu user={user} profile={profile} onNavigate={() => setOpen(false)} />
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          render={(props) => <Link {...props} href="/sign-in" onClick={() => setOpen(false)} />}
                        >
                          {t("signIn")}
                        </Button>
                        <Button render={(props) => <Link {...props} href="/sign-up" onClick={() => setOpen(false)} />}>
                          {t("getStarted")}
                        </Button>
                      </>
                    )}
                  </div>
                </Drawer.Footer>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
          <Button variant="ghost" isIconOnly className="md:hidden">
            <Menu className="size-5" />
            <span className="sr-only">{t("openMenu")}</span>
          </Button>
        </Drawer>
      </div>
    </header>
  );
}
```

Note: RTL mirroring — the old navbar picked its mobile-sheet side based on `getDirection(locale)`. HeroUI's `Drawer.Content placement="end"` is logical (start/end), not physical (left/right), so it already mirrors correctly under the project's `dir="rtl"` root without needing the manual `sheetSide` calculation the old code had — confirm this holds in Task 7's Step 4 browser check below; if `end` doesn't auto-mirror, pass `placement={getDirection(locale) === "rtl" ? "start" : "end"}` explicitly instead, reusing the same `getDirection`/`useLocale` imports the old file had.

- [ ] **Step 3: Update `(public)/layout.tsx` to drop the CMS header-links fetch**

In `src/app/[locale]/(public)/layout.tsx`:
- Remove `CmsNavigationService.getResolvedByLocation("header", locale as Locale)` from the `Promise.all(...)` array (keep `productLinks`, `companyLinks`, `resourcesLinks`, `footerSettingsRaw`, `contactSettingsRaw`, `t` — those still feed the `Footer`, unchanged).
- Remove `headerLinks` from the destructured result and from the array of variable names in that `Promise.all` line.
- Change `<Navbar links={headerLinks} />` to `<Navbar />`.

- [ ] **Step 4: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all clean.

Then start the dev server (`npm run dev`) and check in a real browser, both `en` and `ar`:
- Desktop: logo, three nav links, language switcher, notification bell + avatar menu when signed in / Sign In + Get Started when signed out.
- Mobile width (<768px): hamburger opens the drawer with the same content; confirm it opens from the correct side in both LTR and RTL (per the Step 2 note above).
- Sign out from the avatar menu: confirm the navbar switches to signed-out state without a manual reload (this is the specific bug `SessionClientService.signOut()` fixes — check it didn't regress).
- Language switch: confirm it navigates to the same page in the other locale.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/navbar.tsx "src/app/[locale]/(public)/layout.tsx" messages/en/navigation.json messages/ar/navigation.json
git commit -m "<Arabic-template message>"
```

---

### Task 8: Homepage — Hero section

**Files:**
- Create: `src/components/home/hero-section.tsx`
- Modify: `messages/en/home.json`, `messages/ar/home.json`

**Interfaces:**
- Produces: `HeroSection(): JSX.Element` — no props, Server Component (no `"use client"` needed — static content only).

- [ ] **Step 1: Add new keys to the existing `"Hero"` object**

In `messages/en/home.json`, inside the existing `"Hero": { ... }` object (alongside the current `instructorShowcase`/`trustBar` keys — do not remove those), add:
```json
    "headline": "Clinical education that keeps up with your practice",
    "subhead": "Structured, evidence-based courses for physiotherapists, nutrition specialists, and students — built and taught by clinicians who still see patients.",
    "primaryCta": "Browse Courses",
    "secondaryCta": "Get Started",
```

In `messages/ar/home.json`, inside the existing `"Hero": { ... }` object, add:
```json
    "headline": "تعليم إكلينيكي يواكب ممارستك",
    "subhead": "دورات مبنية على أدلة علمية لأخصائيي العلاج الطبيعي والتغذية والطلاب، يصممها ويقدمها متخصصون مازالوا يمارسون مهنتهم.",
    "primaryCta": "تصفح الدورات",
    "secondaryCta": "ابدأ الآن",
```

- [ ] **Step 2: Write the component**

```tsx
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";

export function HeroSection() {
  const t = useTranslations("Hero");

  return (
    <section className="mx-auto max-w-4xl px-6 py-24 text-center lg:px-8 lg:py-32">
      <h1 className="text-4xl font-bold tracking-tight text-balance text-foreground sm:text-5xl">
        {t("headline")}
      </h1>
      <p className="mt-6 text-lg text-pretty text-muted-foreground">{t("subhead")}</p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button render={(props) => <Link {...props} href="/courses" />}>{t("primaryCta")}</Button>
        <Button variant="outline" render={(props) => <Link {...props} href="/sign-up" />}>
          {t("secondaryCta")}
        </Button>
      </div>
    </section>
  );
}
```

Note: `useTranslations` from `next-intl` (not `next-intl/server`) works in a Server Component for static message lookup in this Next.js/next-intl version — confirm by checking how any other current Server Component section (e.g. `src/components/sections/why-knowledge-os.tsx`) imports it; match that exact import source if different.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean. Full visual check happens in Task 14 once the section is wired into `page.tsx` (Task 13).

- [ ] **Step 4: Commit**

```bash
git add src/components/home/hero-section.tsx messages/en/home.json messages/ar/home.json
git commit -m "<Arabic-template message>"
```

---

### Task 9: Homepage — Why Bosla section

**Files:**
- Create: `src/components/home/why-bosla-section.tsx`

**Interfaces:**
- Consumes: `home.json`'s existing `"WhyKnowledgeOs"` namespace (`eyebrow`, `title`, `subtitle`, `items.{evidence-based,expert-instructors,bilingual,structured-learning}.{title,description}`) — already exists in both locales, no new keys needed.
- Produces: `WhyBoslaSection(): JSX.Element` — no props, Server Component.

- [ ] **Step 1: Write the component**

Four of the six existing items are used (per the spec's "3–4 value props"): `evidence-based`, `expert-instructors`, `bilingual`, `structured-learning`.

```tsx
import { useTranslations } from "next-intl";
import { BookOpen, Stethoscope, Languages, ListChecks } from "lucide-react";

const ITEMS = [
  { key: "evidence-based", icon: BookOpen },
  { key: "expert-instructors", icon: Stethoscope },
  { key: "bilingual", icon: Languages },
  { key: "structured-learning", icon: ListChecks },
] as const;

export function WhyBoslaSection() {
  const t = useTranslations("WhyKnowledgeOs");

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-accent">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-bold text-balance text-foreground">{t("title")}</h2>
        <p className="mt-4 text-pretty text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2">
        {ITEMS.map(({ key, icon: Icon }) => (
          <div key={key} className="flex gap-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <h3 className="font-semibold text-foreground">{t(`items.${key}.title`)}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t(`items.${key}.description`)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/why-bosla-section.tsx
git commit -m "<Arabic-template message>"
```

---

### Task 10: Homepage — Courses section (live data)

**Files:**
- Create: `src/components/home/courses-section.tsx`
- Modify: `messages/en/home.json`, `messages/ar/home.json`

**Interfaces:**
- Consumes: `CourseService.searchResolved(filters: CourseSearchFilters, locale: Locale): Promise<CourseSearchResult<CourseListItem>>` (from `@/courses/services/course.service`) — exact call verified against `src/app/[locale]/(public)/courses/page.tsx`'s own featured-courses fetch: `CourseService.searchResolved({ status: "published", onlyActive: true, featured: true, pageSize: 6 }, locale)`.
- Produces: `CoursesSection({ locale }: { locale: Locale }): Promise<JSX.Element>` — async Server Component, takes `locale` as a prop (passed from `page.tsx` in Task 13, which already has it from `params`).

- [ ] **Step 1: Add new translation keys**

In `messages/en/home.json`, add a new top-level object (sibling to `"Hero"`, `"WhyKnowledgeOs"`, etc.):
```json
  "CoursesSection": {
    "eyebrow": "Courses",
    "title": "Start with our most popular courses",
    "viewAllLabel": "View all courses",
    "free": "Free"
  },
```

In `messages/ar/home.json`:
```json
  "CoursesSection": {
    "eyebrow": "الدورات",
    "title": "ابدأ بأكثر الدورات إقبالاً",
    "viewAllLabel": "عرض كل الدورات",
    "free": "مجانًا"
  },
```

- [ ] **Step 2: Write the component**

```tsx
import { getTranslations } from "next-intl/server";
import { Card, Button, Avatar } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { CourseService } from "@/courses/services/course.service";
import { getInitials } from "@/auth/utils/display-name";
import type { Locale } from "@/i18n/routing";

/** Paymob approval hotfix: guest-facing prices always display in EGP,
 *  regardless of a course's stored `currency` — matches `PriceBlock`'s
 *  own formatting exactly (see that component's note). */
function formatPrice(amount: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EGP" }).format(Number(amount));
}

export async function CoursesSection({ locale }: { locale: Locale }) {
  const [t, result] = await Promise.all([
    getTranslations({ locale, namespace: "CoursesSection" }),
    CourseService.searchResolved(
      { status: "published", onlyActive: true, featured: true, pageSize: 6 },
      locale,
    ),
  ]);

  if (result.items.length === 0) return null;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent">{t("eyebrow")}</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">{t("title")}</h2>
        </div>
        <Link href="/courses" className="hidden shrink-0 text-sm font-medium text-accent hover:underline sm:inline-block">
          {t("viewAllLabel")}
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {result.items.map((course) => (
          <Card key={course.id} render={(props) => <Link {...props} href={`/courses/${course.slug}`} />}>
            {course.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- Card.Header has no next/image slot; matches this file's own scope (display only, no optimization pass here)
              <img src={course.coverImageUrl} alt="" className="aspect-video w-full rounded-t-[inherit] object-cover" />
            ) : (
              <span className="flex aspect-video w-full items-center justify-center bg-accent/10 text-accent">
                <BookOpen aria-hidden="true" className="size-8" />
              </span>
            )}
            <Card.Header>
              <Card.Title className="line-clamp-2">{course.title}</Card.Title>
            </Card.Header>
            <Card.Content className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Avatar className="size-6 text-[10px]">
                  <Avatar.Image src={course.instructorAvatarUrl ?? undefined} alt="" />
                  <Avatar.Fallback>{getInitials(course.instructorName)}</Avatar.Fallback>
                </Avatar>
                {course.instructorName}
              </span>
              <span className="font-semibold text-foreground">
                {course.isFree ? t("free") : formatPrice(course.price, locale)}
              </span>
            </Card.Content>
          </Card>
        ))}
      </div>
      <Link href="/courses" className="mt-8 block text-center text-sm font-medium text-accent hover:underline sm:hidden">
        {t("viewAllLabel")}
      </Link>
    </section>
  );
}
```

Field names verified directly against `CourseListItem` (`src/courses/types/course-search.ts:63-89`): `id`, `slug`, `title`, `price`, `isFree`, `coverImageUrl`, `instructorName`, `instructorAvatarUrl` all exist exactly as used above. **Correction from initial drafting:** `CourseListItem` has no `rating` field — this project's schema deliberately has no ratings/reviews system yet (confirmed in `docs/courses-ux-spec.md`'s own grounding section) — so the card shows instructor identity instead, which is real, existing data.

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean — if `CourseListItem`'s field names differ from the assumption above, typecheck will fail here and surface exactly which names to correct.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/courses-section.tsx messages/en/home.json messages/ar/home.json
git commit -m "<Arabic-template message>"
```

---

### Task 11: Homepage — FAQ section

**Files:**
- Create: `src/components/home/faq-section.tsx`

**Interfaces:**
- Consumes: `home.json`'s existing `"Faq"` namespace (`eyebrow`, `title`, `items[]` with `question`/`answer`) — already exists in both locales (6 items), no new keys needed.
- Produces: `FaqSection(): JSX.Element` — no props, Server Component.

- [ ] **Step 1: Write the component**

```tsx
import { useTranslations } from "next-intl";
import { Accordion } from "@heroui/react";
import { ChevronDown } from "lucide-react";

export function FaqSection() {
  const t = useTranslations("Faq");
  const items = t.raw("items") as Array<{ question: string; answer: string }>;

  return (
    <section className="mx-auto max-w-3xl px-6 py-20 lg:px-8">
      <div className="text-center">
        <p className="text-sm font-semibold text-accent">{t("eyebrow")}</p>
        <h2 className="mt-2 text-3xl font-bold text-foreground">{t("title")}</h2>
      </div>
      <Accordion className="mt-12">
        {items.map((item, index) => (
          <Accordion.Item key={index}>
            <Accordion.Heading>
              <Accordion.Trigger className="flex w-full items-center justify-between py-4 text-start font-medium text-foreground">
                {item.question}
                <Accordion.Indicator>
                  <ChevronDown aria-hidden="true" className="size-4" />
                </Accordion.Indicator>
              </Accordion.Trigger>
            </Accordion.Heading>
            <Accordion.Panel>
              <Accordion.Body className="pb-4 text-sm text-muted-foreground">
                {item.answer}
              </Accordion.Body>
            </Accordion.Panel>
          </Accordion.Item>
        ))}
      </Accordion>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/home/faq-section.tsx
git commit -m "<Arabic-template message>"
```

---

### Task 12: Homepage — Contact CTA section

**Files:**
- Create: `src/components/home/contact-cta-section.tsx`
- Modify: `messages/en/home.json`, `messages/ar/home.json`

**Interfaces:**
- Produces: `ContactCtaSection(): JSX.Element` — no props, Server Component.

- [ ] **Step 1: Add new translation keys**

In `messages/en/home.json`, add a new top-level object:
```json
  "ContactCta": {
    "title": "Have a question before you enroll?",
    "subtitle": "Our team can help you pick the right course or answer anything about certificates, access, or billing.",
    "buttonLabel": "Contact Us"
  },
```

In `messages/ar/home.json`:
```json
  "ContactCta": {
    "title": "عندك سؤال قبل التسجيل؟",
    "subtitle": "فريقنا يقدر يساعدك تختار الدورة المناسبة أو يجاوبك على أي استفسار عن الشهادات أو الوصول أو الفواتير.",
    "buttonLabel": "تواصل معنا"
  },
```

- [ ] **Step 2: Write the component**

```tsx
import { useTranslations } from "next-intl";
import { Button } from "@heroui/react";
import { Link } from "@/i18n/navigation";

export function ContactCtaSection() {
  const t = useTranslations("ContactCta");

  return (
    <section className="bg-foreground py-16">
      <div className="mx-auto max-w-2xl px-6 text-center lg:px-8">
        <h2 className="text-2xl font-bold text-background sm:text-3xl">{t("title")}</h2>
        <p className="mt-3 text-background/70">{t("subtitle")}</p>
        <Button className="mt-8" render={(props) => <Link {...props} href="/contact" />}>
          {t("buttonLabel")}
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/home/contact-cta-section.tsx messages/en/home.json messages/ar/home.json
git commit -m "<Arabic-template message>"
```

---

### Task 13: Assemble the new homepage `page.tsx`

**Files:**
- Create: `src/app/[locale]/(public)/page.tsx`

**Interfaces:**
- Consumes: `HeroSection` (Task 8), `WhyBoslaSection` (Task 9), `CoursesSection` (Task 10), `FaqSection` (Task 11), `ContactCtaSection` (Task 12) — all as defined in those tasks' "Produces" lines. `Footer` is rendered by `(public)/layout.tsx` already (untouched, per spec Section 5.6) — this file does not render `Footer` itself.

- [ ] **Step 1: Write the file**

```tsx
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/components/home/hero-section";
import { WhyBoslaSection } from "@/components/home/why-bosla-section";
import { CoursesSection } from "@/components/home/courses-section";
import { FaqSection } from "@/components/home/faq-section";
import { ContactCtaSection } from "@/components/home/contact-cta-section";
import type { Locale } from "@/i18n/routing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <>
      <HeroSection />
      <WhyBoslaSection />
      <CoursesSection locale={locale as Locale} />
      <FaqSection />
      <ContactCtaSection />
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all clean, and the route list now shows `/[locale]` (the homepage) present again.

- [ ] **Step 3: Commit**

```bash
git add "src/app/[locale]/(public)/page.tsx"
git commit -m "<Arabic-template message>"
```

---

### Task 14: Full verification pass

**Files:** None modified — verification only.

- [ ] **Step 1: Full static checks**

Run: `npm run typecheck && npm run lint && npm run build`
Expected: all clean.

- [ ] **Step 2: Browser check — new homepage, both locales**

Start `npm run dev`, visit `/en` and `/ar`. Confirm: Hero, Why Bosla, Courses (real course cards with real prices — not the old mock `@/data/courses`), FAQ (accordion opens/closes), Contact CTA all render, correct RTL mirroring on `/ar`, no console errors.

- [ ] **Step 3: Browser check — shared Navbar on other public pages**

Visit `/courses`, `/blog`, and one course detail page in both locales. Confirm the new `Navbar` renders identically on all of them (it's shared chrome, not homepage-specific) and nothing on those pages broke.

- [ ] **Step 4: Browser check — signed-in and signed-out navbar states, mobile drawer, sign-out**

Sign in, confirm avatar + notification bell appear and both popovers open/close correctly; sign out from the avatar menu and confirm the navbar reverts to signed-out state without a manual reload (the specific regression risk flagged in Task 7). Resize to mobile width, open the hamburger drawer, confirm it opens from the correct side in both locales and closes on link click.

- [ ] **Step 5: Regression check — the two bugs fixed earlier this session**

Visit `/checkout/<any-slug>` while signed out (redirect-to-sign-in flow, fixed via the LegalAcceptanceModal timing fix) and confirm no console error. Confirm `/api/client-error`'s `ChunkLoadError` auto-recovery logic (`src/lib/chunk-load-recovery.ts`) is untouched by this plan — neither fix depended on `NavigationLoader` or the CMS homepage, but both share the root `[locale]/layout.tsx` this plan also edits (Task 1), so a direct re-check is warranted.

- [ ] **Step 6: Confirm the draft homepage is truly unreachable**

Visit `/en/_draft-homepage` and `/en/draft-homepage` directly — both should 404 (private-folder routes are never reachable by any URL, underscore or not).

- [ ] **Step 7: Confirm the Admin Panel still builds**

Run: `grep -rl "HomepageEditor" "src/app/[locale]/admin"` to confirm the Admin Panel route still imports it, then load that admin route in the browser (signed in as admin) to confirm it still renders — it's orphaned from the live homepage now but must not be broken.

- [ ] **Step 8: Final commit**

If Steps 2–7 surfaced any fixes, commit them individually as they're made (not batched at the end) — this step is only for confirming nothing is left uncommitted.

```bash
git status --short
```

Expected: clean working tree.
