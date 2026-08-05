# Bosla Logged-In Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/` show a role-aware "welcome hub" instead of the marketing story to signed-in visitors, per `docs/superpowers/specs/2026-08-05-logged-in-homepage-design.md`.

**Architecture:** `src/app/[locale]/(public)/page.tsx` branches server-side on `SessionService.getCurrentUser()`: signed-out renders the existing marketing sections unchanged; signed-in renders a new `LoggedInHome` component tree under `src/components/home/logged-in/` — a dark atmospheric greeting hero (reusing `.night-sky-nebula`/`.hero-atmosphere-glow`/`CompassMark`) wrapping one role-specific "north star" action (student: Continue Learning or recommended courses; instructor/admin: status snippet + panel CTA), followed by a light quick-links row. No new routes, no middleware changes.

**Tech Stack:** Next.js 15 App Router, React 19 (Server Components throughout — no new Client Components), next-intl, TypeScript, existing Drizzle/Supabase services (no new backend code).

## Global Constraints

- **No test framework exists in this project** (no vitest/jest unit tests configured — `vitest.config.ts` is Storybook-only). Every task's verification is `npm run typecheck` and `npm run lint`, plus `npm run build` at the final task, not a red/green unit test cycle.
- **Never run `git commit` during this plan's execution, even between tasks.** This project's standing rule requires the user's explicit confirmation before every commit, with no exception for approval given elsewhere. Stage changes as tasks complete; the final task proposes one consolidated commit message and stops — it does not run `git commit`.
- Every user-facing string goes through next-intl (`messages/en/home.json` + `messages/ar/home.json`, edited together in the same task), never hardcoded.
- Internal navigation always uses `@/i18n/navigation`'s `Link`, never `next/link` or a plain `<a>`.
- Icons: Lucide only (`iconLibrary: "lucide"` in `components.json`), never emoji or stock illustrations.
- RTL: directional icons (arrows) get `rtl:rotate-180`; layout uses logical Tailwind utilities (`ps-`/`pe-`/`start-`/`end-`), already the convention everywhere else in this codebase.
- **`AuthUser` stays JWT-only** — a name/avatar is always fetched via a separate `ProfileService.getByUserId(user.id)` call (decision recorded in the spec after explicit consideration). Never add a name field to `AuthUser`, `SessionService`, or the guards.
- **Motion is CSS-only, reusing existing conventions — no GSAP, no new Client Components.** Entrance staggering uses the `.hero-reveal` class + `--reveal-delay` custom property already defined in `globals.css` and used by `HeroContent`/`CoursesSection`/`testimonials.tsx`. The compass accent reuses `CompassMark` (`src/components/home/compass-mark.tsx`) verbatim — its needle-settle animation (`.compass-needle` / `bosla-compass-settle`) is already built in. Every new component in this plan is a Server Component; none needs `"use client"`.
- Dark-section styling uses the existing `className="dark"` scoping convention (`hero-stage.tsx`, `problem-stage.tsx` both do this) — not a global dark-mode toggle (none exists in this project). Every shadcn/ui primitive used here (`Card`, `Button`) is token-based (`bg-card`, `text-card-foreground`, etc.) so it repaints correctly inside a `.dark`-scoped ancestor automatically.

---

### Task 1: `LoggedInHome` translation keys

**Files:**
- Modify: `messages/en/home.json`
- Modify: `messages/ar/home.json`

**Interfaces:**
- Produces: a new top-level `LoggedInHome` key in both files, with sub-namespaces `LoggedInHome.hero`, `LoggedInHome.student`, `LoggedInHome.instructor`, `LoggedInHome.admin`, `LoggedInHome.quickLinks` — every later task's `getTranslations({ locale, namespace: "LoggedInHome.<x>" })` call reads from this. No change to `src/i18n/messages.ts` (the `namespaces` array already includes `"home"`, and both files it imports already exist).

- [ ] **Step 1: Add the `LoggedInHome` key to `messages/en/home.json`**

Insert as a new top-level key (sibling to `"Hero"`, `"Problem"`, etc. — insert right after the closing brace of `"Cta"`, before the file's final closing brace):

```json
  "LoggedInHome": {
    "hero": {
      "greeting": "Welcome back, {name}."
    },
    "student": {
      "emptyStateDescription": "You haven't started a course yet — pick one and we'll pick up right where you left off next time.",
      "browseCoursesCta": "Browse Courses"
    },
    "instructor": {
      "publishedLabel": "Published",
      "inReviewLabel": "In Review",
      "cta": "Go to Instructor Panel"
    },
    "admin": {
      "pendingApplicationsHint": "{count, plural, one {# instructor application needs your review} other {# instructor applications need your review}}",
      "cta": "Go to Admin Panel"
    },
    "quickLinks": {
      "studentCourses": "My Courses",
      "studentCoursesDescription": "Every course you're enrolled in, in one place.",
      "studentCertificates": "Certificates",
      "studentCertificatesDescription": "Certificates you've earned so far.",
      "studentProfile": "Profile",
      "studentProfileDescription": "Update your details and preferences.",
      "instructorCourses": "My Courses",
      "instructorCoursesDescription": "Create, edit, and submit courses for review.",
      "instructorStudents": "Students",
      "instructorStudentsDescription": "See who's enrolled and their progress.",
      "instructorEarnings": "Earnings",
      "instructorEarningsDescription": "Track your payouts and revenue.",
      "adminCourses": "Courses",
      "adminCoursesDescription": "Review and manage every course on Bosla.",
      "adminUsers": "Users",
      "adminUsersDescription": "Manage students, instructors, and roles.",
      "adminOrders": "Orders",
      "adminOrdersDescription": "View payments and order history."
    }
  }
```

Remember the comma after the preceding key's closing brace.

- [ ] **Step 2: Add the matching `LoggedInHome` key to `messages/ar/home.json`**

Same position and structure:

```json
  "LoggedInHome": {
    "hero": {
      "greeting": "أهلاً بعودتك، {name}."
    },
    "student": {
      "emptyStateDescription": "لسه ما بدأتش أي دورة — اختَر واحدة وهنكمّل معاك من حيث ما توقفت في المرة الجاية.",
      "browseCoursesCta": "تصفّح الدورات"
    },
    "instructor": {
      "publishedLabel": "منشورة",
      "inReviewLabel": "قيد المراجعة",
      "cta": "الذهاب إلى لوحة المحاضر"
    },
    "admin": {
      "pendingApplicationsHint": "{count, plural, one {# طلب انضمام محاضر بانتظار مراجعتك} other {# طلبات انضمام محاضرين بانتظار مراجعتك}}",
      "cta": "الذهاب إلى لوحة التحكم"
    },
    "quickLinks": {
      "studentCourses": "دوراتي",
      "studentCoursesDescription": "كل الدورات المسجَّل بها، في مكان واحد.",
      "studentCertificates": "الشهادات",
      "studentCertificatesDescription": "الشهادات اللي حصلت عليها لحد دلوقتي.",
      "studentProfile": "الملف الشخصي",
      "studentProfileDescription": "حدّث بياناتك وتفضيلاتك.",
      "instructorCourses": "دوراتي",
      "instructorCoursesDescription": "أنشئ الدورات وعدّلها وقدّمها للمراجعة.",
      "instructorStudents": "الطلاب",
      "instructorStudentsDescription": "شوف المسجَّلين في دوراتك وتقدّمهم.",
      "instructorEarnings": "الأرباح",
      "instructorEarningsDescription": "تابع مدفوعاتك وأرباحك.",
      "adminCourses": "الدورات",
      "adminCoursesDescription": "راجع كل الدورات على بوصلة وأدرها.",
      "adminUsers": "المستخدمون",
      "adminUsersDescription": "أدر الطلاب والمحاضرين والأدوار.",
      "adminOrders": "الطلبات",
      "adminOrdersDescription": "اطّلع على المدفوعات وسجل الطلبات."
    }
  }
```

- [ ] **Step 3: Verify both files are valid JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('messages/en/home.json'))" && node -e "JSON.parse(require('fs').readFileSync('messages/ar/home.json'))" && echo OK`
Expected: `OK` printed, no `SyntaxError`.

---

### Task 2: `QuickLinksRow` component

**Files:**
- Create: `src/components/home/logged-in/quick-links-row.tsx`

**Interfaces:**
- Consumes: nothing from other tasks — pure, self-contained, props-driven.
- Produces: `QuickLinksRow({ links: QuickLink[] })` and the exported `QuickLink` interface (`{ href: string; label: string; description: string; icon: LucideIcon }`) — Task 7 imports both.

- [ ] **Step 1: Write the component**

```tsx
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card } from "@/components/ui/card";

export interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

/**
 * The hub's second, quieter beat — three small entry points into the
 * visitor's real workspace, deliberately plainer than the hero above it
 * (no dark atmosphere, no compass accent): the "One Restless Section
 * Rule" (DESIGN.md) means only the hero gets an authored motion moment.
 */
export function QuickLinksRow({ links }: { links: QuickLink[] }) {
  return (
    <section className="border-t border-border">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 py-16 sm:grid-cols-3 lg:px-8">
        {links.map((link) => (
          <Link key={link.href} href={link.href} className="group block h-full">
            <Card className="h-full gap-3 p-5 ring-1 ring-foreground/10 transition-shadow group-hover:shadow-card-hover">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <link.icon aria-hidden="true" className="size-4.5" />
                </span>
                <p className="text-sm font-medium text-foreground">{link.label}</p>
              </div>
              <p className="text-xs text-muted-foreground">{link.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean. (This component isn't imported anywhere yet, so `tsc`/`eslint` only check the file itself for syntax/type errors — no "unused" warnings expected since it's a real exported module.)

---

### Task 3: `LoggedInHero` component

**Files:**
- Create: `src/components/home/logged-in/logged-in-hero.tsx`

**Interfaces:**
- Consumes: `CompassMark` from `@/components/home/compass-mark` (existing, `{ className?: string }`).
- Produces: `LoggedInHero({ greeting: string; children: ReactNode })` — Task 7 wraps each role's north-star content in this.

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from "react";
import { CompassMark } from "@/components/home/compass-mark";

/**
 * The hub's one dark, atmospheric beat — same `.night-sky-nebula` /
 * `.hero-atmosphere-glow` treatment as the marketing homepage's own Hero
 * (same OKLCH values, same drift timing), so a signed-in visitor lands
 * somewhere that still feels like Bosla, not a different product. The
 * `.dark` class here is local scoping (Tailwind v4 `dark:` variant),
 * not a site-wide toggle — same convention `hero-stage.tsx`/
 * `problem-stage.tsx` already use.
 */
export function LoggedInHero({ greeting, children }: { greeting: string; children: ReactNode }) {
  return (
    <section className="dark relative isolate overflow-hidden bg-background">
      <div aria-hidden="true" className="night-sky-nebula" />
      <div aria-hidden="true" className="hero-atmosphere-glow" />
      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-6 py-20 text-center lg:px-8 lg:py-28">
        <div className="hero-reveal" style={{ "--reveal-delay": "0s" } as React.CSSProperties}>
          <CompassMark className="size-16 text-foreground" />
        </div>
        <h1
          className="hero-reveal mt-6 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
        >
          {greeting}
        </h1>
        <div className="hero-reveal mt-10 w-full" style={{ "--reveal-delay": "0.2s" } as React.CSSProperties}>
          {children}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

---

### Task 4: `StudentNorthStar` component

**Files:**
- Create: `src/components/home/logged-in/student-north-star.tsx`

**Interfaces:**
- Consumes: `getMyDashboardAction(locale: Locale): Promise<LearningActionResult<StudentDashboardData>>` (`@/learning/actions/student-dashboard.actions`, existing — `StudentDashboardData.continueLearning: DashboardCourseItem[]`); `ContinueLearningHero({ course: DashboardCourseItem | undefined })` (`@/components/dashboard/ContinueLearningHero`, existing); `CourseService.searchResolved(filters, locale)` (`@/courses/services/course.service`, existing); `CourseCard({ course, locale, t, tDifficulty, progress?, href? })` (`@/components/courses/CourseCard`, existing).
- Produces: `StudentNorthStar({ locale: Locale })` — Task 7 renders this for `role === "student"`.

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from "next-intl/server";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CourseCard } from "@/components/courses/CourseCard";
import { ContinueLearningHero } from "@/components/dashboard/ContinueLearningHero";
import { getMyDashboardAction } from "@/learning/actions/student-dashboard.actions";
import { CourseService } from "@/courses/services/course.service";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * The student's "north star": pick up an in-progress course (reusing
 * `/me`'s own `ContinueLearningHero` verbatim — same visual language,
 * zero new UI for that case), or, for a student with nothing started
 * yet, a prompt into a small recommended-courses grid instead.
 */
export async function StudentNorthStar({ locale }: { locale: Locale }) {
  const dashboardResult = await getMyDashboardAction(locale);
  const continueLearning = dashboardResult.success ? dashboardResult.data.continueLearning : [];

  if (continueLearning.length > 0) {
    return <ContinueLearningHero course={continueLearning[0]} />;
  }

  const [t, tCard, tDifficulty, recommended] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.student" }),
    getTranslations({ locale, namespace: "CourseCatalog.card" }),
    getTranslations({ locale, namespace: "CourseCatalog.difficulty" }),
    CourseService.searchResolved({ status: "published", onlyActive: true, pageSize: 4 }, locale),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center gap-3">
        <p className="text-foreground/80">{t("emptyStateDescription")}</p>
        <Link href="/courses" className={cn(buttonVariants(), "gap-2")}>
          <BookOpen aria-hidden="true" className="size-4" />
          {t("browseCoursesCta")}
        </Link>
      </div>
      {recommended.items.length > 0 && (
        <div className="grid grid-cols-1 gap-5 text-start sm:grid-cols-2 lg:grid-cols-4">
          {recommended.items.map((course) => (
            <CourseCard key={course.id} course={course} locale={locale} t={tCard} tDifficulty={tDifficulty} />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean. `CourseService.searchResolved`'s return `CourseSearchResult<CourseListItem>` must structurally satisfy `CourseCard`'s `course: CourseCardData` prop — if `tsc` disagrees, compare `CourseListItem` (`src/courses/types/*`) against `CourseCardData` (`src/courses/types/course-card.ts`) rather than casting; `RelatedCourses.tsx` already does this exact `course={item}` assignment successfully, so a real mismatch here would mean something changed upstream, not a mistake in this file.

---

### Task 5: `InstructorNorthStar` component

**Files:**
- Create: `src/components/home/logged-in/instructor-north-star.tsx`

**Interfaces:**
- Consumes: `CourseService.getMyCourseCounts(actingUser: AuthUser): Promise<Record<CourseStatus, number>>` (`@/courses/services/course.service`, existing — keys `draft`/`in_review`/`published`/`archived`).
- Produces: `InstructorNorthStar({ user: AuthUser; locale: Locale })` — Task 7 renders this for `role === "instructor"`.

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { CourseService } from "@/courses/services/course.service";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/auth/types/session";
import type { Locale } from "@/i18n/routing";

/**
 * The instructor's "north star": a compact published/in-review snapshot
 * (same `CourseService.getMyCourseCounts` call the Instructor Panel's
 * own dashboard already makes) plus the one CTA that matters — into the
 * real panel, not a duplicate of it.
 */
export async function InstructorNorthStar({ user, locale }: { user: AuthUser; locale: Locale }) {
  const [t, counts] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.instructor" }),
    CourseService.getMyCourseCounts(user),
  ]);

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{counts.published}</p>
          <p className="text-xs text-muted-foreground">{t("publishedLabel")}</p>
        </div>
        <div aria-hidden="true" className="h-8 w-px bg-foreground/15" />
        <div className="text-center">
          <p className="text-2xl font-semibold text-foreground">{counts.in_review}</p>
          <p className="text-xs text-muted-foreground">{t("inReviewLabel")}</p>
        </div>
      </div>
      <Link href="/instructor" className={cn(buttonVariants(), "gap-2")}>
        {t("cta")}
        <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

---

### Task 6: `AdminNorthStar` component

**Files:**
- Create: `src/components/home/logged-in/admin-north-star.tsx`

**Interfaces:**
- Consumes: `InstructorApplicationService.searchResolved(filters: InstructorProfileSearchFilters, locale: Locale): Promise<InstructorProfileSearchResult<InstructorProfileListItem>>` (`@/instructor/services/instructor-application.service`, existing — `.total` is the count).
- Produces: `AdminNorthStar({ locale: Locale })` — Task 7 renders this for `role === "admin"` and `role === "super_admin"` (both go to `/admin`, identical content).

- [ ] **Step 1: Write the component**

```tsx
import { getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { InstructorApplicationService } from "@/instructor/services/instructor-application.service";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

/**
 * The admin/super-admin "north star": the same pending-applications
 * signal the Admin Panel's own dashboard already surfaces (only shown
 * when > 0 — matches that page's conditional-hint pattern) plus the
 * one CTA into the real panel.
 */
export async function AdminNorthStar({ locale }: { locale: Locale }) {
  const [t, pendingApplications] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.admin" }),
    InstructorApplicationService.searchResolved({ status: "pending", pageSize: 1 }, locale),
  ]);

  return (
    <div className="flex flex-col items-center gap-4">
      {pendingApplications.total > 0 && (
        <p className="text-sm text-foreground/80">
          {t("pendingApplicationsHint", { count: pendingApplications.total })}
        </p>
      )}
      <Link href="/admin" className={cn(buttonVariants(), "gap-2")}>
        {t("cta")}
        <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

---

### Task 7: `LoggedInHome` orchestrator

**Files:**
- Create: `src/components/home/logged-in/logged-in-home.tsx`

**Interfaces:**
- Consumes: `LoggedInHero` (Task 3), `QuickLinksRow` + `QuickLink` (Task 2), `StudentNorthStar` (Task 4), `InstructorNorthStar` (Task 5), `AdminNorthStar` (Task 6); `ProfileService.getByUserId(userId: string): Promise<Profile | null>` (`@/auth/services/profile.service`, existing); `resolveDisplayName(profile: Profile | null, user: AuthUser): string` (`@/auth/utils/display-name`, existing).
- Produces: `LoggedInHome({ user: AuthUser; locale: Locale })` — Task 8 renders this from `(public)/page.tsx`.

- [ ] **Step 1: Write the component**

```tsx
import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { BookOpen, Award, UserCircle, Users, Wallet, Receipt } from "lucide-react";
import { ProfileService } from "@/auth/services/profile.service";
import { resolveDisplayName } from "@/auth/utils/display-name";
import { LoggedInHero } from "@/components/home/logged-in/logged-in-hero";
import { QuickLinksRow, type QuickLink } from "@/components/home/logged-in/quick-links-row";
import { StudentNorthStar } from "@/components/home/logged-in/student-north-star";
import { InstructorNorthStar } from "@/components/home/logged-in/instructor-north-star";
import { AdminNorthStar } from "@/components/home/logged-in/admin-north-star";
import type { AuthUser } from "@/auth/types/session";
import type { Locale } from "@/i18n/routing";

async function resolveRoleContent(
  user: AuthUser,
  locale: Locale,
): Promise<{ northStar: ReactNode; quickLinks: QuickLink[] }> {
  const t = await getTranslations({ locale, namespace: "LoggedInHome.quickLinks" });

  switch (user.role) {
    case "instructor":
      return {
        northStar: <InstructorNorthStar user={user} locale={locale} />,
        quickLinks: [
          { href: "/instructor/courses", label: t("instructorCourses"), description: t("instructorCoursesDescription"), icon: BookOpen },
          { href: "/instructor/students", label: t("instructorStudents"), description: t("instructorStudentsDescription"), icon: Users },
          { href: "/instructor/earnings", label: t("instructorEarnings"), description: t("instructorEarningsDescription"), icon: Wallet },
        ],
      };
    case "admin":
    case "super_admin":
      return {
        northStar: <AdminNorthStar locale={locale} />,
        quickLinks: [
          { href: "/admin/courses", label: t("adminCourses"), description: t("adminCoursesDescription"), icon: BookOpen },
          { href: "/admin/users", label: t("adminUsers"), description: t("adminUsersDescription"), icon: Users },
          { href: "/admin/orders", label: t("adminOrders"), description: t("adminOrdersDescription"), icon: Receipt },
        ],
      };
    case "student":
    default:
      return {
        northStar: <StudentNorthStar locale={locale} />,
        quickLinks: [
          { href: "/me/courses", label: t("studentCourses"), description: t("studentCoursesDescription"), icon: BookOpen },
          { href: "/me/certificates", label: t("studentCertificates"), description: t("studentCertificatesDescription"), icon: Award },
          { href: "/me/profile", label: t("studentProfile"), description: t("studentProfileDescription"), icon: UserCircle },
        ],
      };
  }
}

/**
 * `/` for a signed-in visitor: a personalized welcome hub, not a
 * duplicate of `/me`/`/instructor`/`/admin` — see
 * docs/superpowers/specs/2026-08-05-logged-in-homepage-design.md.
 */
export async function LoggedInHome({ user, locale }: { user: AuthUser; locale: Locale }) {
  const [t, profile, { northStar, quickLinks }] = await Promise.all([
    getTranslations({ locale, namespace: "LoggedInHome.hero" }),
    ProfileService.getByUserId(user.id),
    resolveRoleContent(user, locale),
  ]);

  const displayName = resolveDisplayName(profile, user);

  return (
    <>
      <LoggedInHero greeting={t("greeting", { name: displayName })}>{northStar}</LoggedInHero>
      <QuickLinksRow links={quickLinks} />
    </>
  );
}
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

---

### Task 8: Wire into the homepage route

**Files:**
- Modify: `src/app/[locale]/(public)/page.tsx`
- Modify: `src/app/[locale]/(public)/layout.tsx`

**Interfaces:**
- Consumes: `LoggedInHome` (Task 7); `SessionService.getCurrentUser(): Promise<AuthUser | null>` (`@/auth/services/session.service`, existing).

- [ ] **Step 1: Branch `(public)/page.tsx` on auth state**

Add this import alongside the existing ones at the top of `src/app/[locale]/(public)/page.tsx`:

```tsx
import { SessionService } from "@/auth/services/session.service";
import { LoggedInHome } from "@/components/home/logged-in/logged-in-home";
```

Change the `Home` function body from:

```tsx
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  return (
    <>
      {/* Page-wide "instrument grain" — sits behind every section at a
          fixed viewport position (so it never has to repeat or seam
          across section boundaries). See `.bg-dot-grid` in globals.css. */}
      <div aria-hidden="true" className="bg-dot-grid pointer-events-none fixed inset-0 -z-10" />
      <HeroSection locale={typedLocale} />
      <ProblemSection locale={typedLocale} />
      <BoslaExistsSection locale={typedLocale} />
      <SpecializationSection locale={typedLocale} />
      <LearningJourneySection locale={typedLocale} />
      <VisionSection locale={typedLocale} />
      <FinaleSection locale={typedLocale} />
      <FinalCtaSection locale={typedLocale} />
    </>
  );
}
```

to:

```tsx
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const typedLocale = locale as Locale;

  const user = await SessionService.getCurrentUser();
  if (user) {
    return <LoggedInHome user={user} locale={typedLocale} />;
  }

  return (
    <>
      {/* Page-wide "instrument grain" — sits behind every section at a
          fixed viewport position (so it never has to repeat or seam
          across section boundaries). See `.bg-dot-grid` in globals.css. */}
      <div aria-hidden="true" className="bg-dot-grid pointer-events-none fixed inset-0 -z-10" />
      <HeroSection locale={typedLocale} />
      <ProblemSection locale={typedLocale} />
      <BoslaExistsSection locale={typedLocale} />
      <SpecializationSection locale={typedLocale} />
      <LearningJourneySection locale={typedLocale} />
      <VisionSection locale={typedLocale} />
      <FinaleSection locale={typedLocale} />
      <FinalCtaSection locale={typedLocale} />
    </>
  );
}
```

(`generateMetadata` above it is untouched — same title/description for both states, matches the spec's decision that OG/link-preview metadata doesn't need to change.)

- [ ] **Step 2: Fix the stale comment in `(public)/layout.tsx`**

In `src/app/[locale]/(public)/layout.tsx`, change:

```tsx
 * No guard: intentionally open to guests.
 */
```

to:

```tsx
 * No guard here: every route in this group is reachable by guests.
 * The homepage (`page.tsx`) additionally branches its own content by
 * auth state — a signed-in visitor gets a different page body, not a
 * different route — so this layout's chrome (Navbar/Footer) stays
 * identical for both.
 */
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck && npm run lint`
Expected: both clean.

---

### Task 9: Full verification and commit proposal

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Production build**

Run: `npm run build`
Expected: clean build, including the `postbuild` legacy-Safari guard (`scripts/check-legacy-safari.mjs`) — this feature adds no new pre-built third-party UI library, so it should not introduce new flagged syntax, but the guard must still pass since new chunks are generated.

- [ ] **Step 2: Manual browser verification**

Start the dev server (`npm run dev`) and check, for both `/en` and `/ar`:
1. Signed out: `/` renders the marketing story exactly as before (no regression).
2. Signed in as a student with an in-progress course: hero shows the greeting + `ContinueLearningHero`; quick links go to `/me/courses`, `/me/certificates`, `/me/profile`.
3. Signed in as a student with no enrollments: hero shows the empty-state prompt + recommended-courses grid (or renders cleanly with an empty grid if the catalog itself has zero published courses in this environment).
4. Signed in as an instructor: hero shows published/in-review counts + "Go to Instructor Panel"; quick links go to `/instructor/courses`, `/instructor/students`, `/instructor/earnings`.
5. Signed in as an admin: hero shows the pending-applications hint (if any exist) + "Go to Admin Panel"; quick links go to `/admin/courses`, `/admin/users`, `/admin/orders`.
6. RTL (`/ar`): hero, compass accent, and quick-links grid mirror correctly; arrow icons flip.
7. `prefers-reduced-motion: reduce` (browser/OS setting or DevTools rendering emulation): hero content renders fully visible immediately, no flash of invisible text — `.hero-reveal`/`.compass-needle` are both already gated behind `prefers-reduced-motion: no-preference` in `globals.css`, so this should need no new code, only confirmation.
8. Navbar (`useSession`-driven) still matches the page body's auth state with no flash of mismatched content.

- [ ] **Step 3: Propose the commit — do not run `git commit`**

Run `git status` and `git diff --stat` to confirm the change set matches exactly: `messages/en/home.json`, `messages/ar/home.json`, `src/app/[locale]/(public)/page.tsx`, `src/app/[locale]/(public)/layout.tsx`, and the six new files under `src/components/home/logged-in/`.

Stage them (`git add` the specific files above — not `-A`), then present the user with this project's standard Arabic-body commit template (`# الملخص`, `# ما تم تنفيذه`, `# التحقق`, `# الملفات الرئيسية`, `# التأثير`, optional `# ملاحظات`, `# نطاق التغيير`, English Conventional-Commits title) summarizing this feature, and **wait for the user's explicit confirmation** before running `git commit`. Do not push without a separate, later explicit request.
