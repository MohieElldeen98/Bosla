"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ListVideo, PanelRightClose, PanelRightOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ProgressPrimitive } from "@/components/courses/ProgressPrimitive";
import { cn } from "@/lib/utils";

const SIDEBAR_STORAGE_KEY = "bosla:player:sidebar";

/**
 * The distraction-free player chrome (docs/courses-ux-spec.md §6): a slim
 * top bar (exit · title · progress) over a content+sidebar split. The
 * sidebar collapse IS theater mode — no separate toggle — and the
 * preference persists. Under lg the sidebar becomes a bottom Sheet behind
 * a fixed "Lessons" pill carrying the progress fraction. The sidebar node
 * arrives already rendered (the CurriculumTree in learning mode), so this
 * shell owns layout state and nothing else.
 */
export function PlayerShell({
  exitHref,
  courseTitle,
  completedLessons,
  totalLessons,
  sidebar,
  children,
  labels,
}: {
  exitHref: string;
  courseTitle: string;
  completedLessons: number;
  totalLessons: number;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  labels: { exit: string; lessons: string; curriculum: string };
}) {
  const t = useTranslations("CoursePlayer.shell");
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "collapsed");
    } catch {
      // Preference read is best-effort.
    }
  }, []);

  function toggleSidebar() {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? "collapsed" : "open");
      } catch {
        // Persistence is best-effort; the toggle still works this session.
      }
      return next;
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-4 px-4 lg:px-6">
          <Link
            href={exitHref}
            className="flex shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="size-4 rtl:rotate-180" />
            <span className="hidden sm:inline">{labels.exit}</span>
          </Link>
          <p className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-foreground">{courseTitle}</p>
          <div className="hidden w-44 shrink-0 sm:block">
            <ProgressPrimitive completed={completedLessons} total={totalLessons} labelStyle="fraction" />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={toggleSidebar}
            aria-label={t(collapsed ? "showSidebar" : "hideSidebar")}
            className="hidden lg:inline-flex"
          >
            {collapsed ? (
              <PanelRightOpen aria-hidden="true" className="size-4 rtl:rotate-180" />
            ) : (
              <PanelRightClose aria-hidden="true" className="size-4 rtl:rotate-180" />
            )}
          </Button>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto grid w-full max-w-screen-2xl flex-1 gap-6 px-4 py-6 lg:px-6",
          collapsed ? "lg:grid-cols-1" : "lg:grid-cols-[1fr_320px]",
        )}
      >
        <main className={cn("min-w-0", collapsed && "mx-auto w-full max-w-4xl")}>{children}</main>
        {!collapsed && (
          <aside className="hidden lg:block">
            <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl bg-card p-3 ring-1 ring-foreground/10">
              <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {labels.curriculum}
              </p>
              {sidebar}
            </div>
          </aside>
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger
          className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-fit items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium shadow-lg lg:hidden"
          style={{ marginBottom: "env(safe-area-inset-bottom)" }}
        >
          <ListVideo aria-hidden="true" className="size-4 text-primary" />
          {labels.lessons}
          <span className="tabular-nums text-muted-foreground">
            {completedLessons}/{totalLessons}
          </span>
        </SheetTrigger>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{labels.curriculum}</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6" onClick={() => setDrawerOpen(false)}>
            {sidebar}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
