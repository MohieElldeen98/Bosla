"use client";

import { useEffect, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchInput } from "@/components/admin/SearchInput";
import { Pagination } from "@/components/admin/Pagination";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  compareLegalDocumentVersionsAction,
  getLegalDocumentVersionAction,
  restoreLegalDocumentVersionAction,
} from "@/cms/actions/legal-document-version.actions";
import { searchLegalDocumentVersionAcceptorsAction } from "@/cms/actions/legal-acceptance.actions";
import type { LegalDocumentVersion, LegalDocumentVersionComparison, LegalDocumentVersionListItem } from "@/cms/types/legal-document-version";
import type { LegalDocumentVersionAcceptanceStats, LegalDocumentVersionAcceptorResult } from "@/cms/types/legal-acceptance";

function formatDate(date: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
}

const EMPTY_ACCEPTORS: LegalDocumentVersionAcceptorResult = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };

/** The "Users who accepted this version" drill-down — a Sheet (reusing
 *  the same primitive `LegalAcceptanceModal` uses), fetched on demand
 *  per version rather than preloaded, since it's genuinely paginated
 *  and searchable, unlike the summary stats which are cheap enough to
 *  resolve for every version up front in `page.tsx`. */
function VersionAcceptorsSheet({
  version,
  onOpenChange,
}: {
  version: LegalDocumentVersionListItem;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Admin.content");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<LegalDocumentVersionAcceptorResult>(EMPTY_ACCEPTORS);
  const [isPending, startTransition] = useTransition();

  // Debounce the raw input into `debouncedQuery`, resetting to page 1
  // whenever the search term actually changes.
  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(query);
      setPage(1);
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  // The one fetch effect — fires on version switch, page change, or a
  // settled search term. Never double-fires per keystroke.
  useEffect(() => {
    startTransition(async () => {
      const response = await searchLegalDocumentVersionAcceptorsAction(version.id, {
        query: debouncedQuery || undefined,
        page,
      });
      if (response.success) setResult(response.data);
      else toast.error(response.message);
    });
  }, [version.id, page, debouncedQuery]);

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg space-y-4 overflow-y-auto p-6">
        <SheetHeader className="gap-1 p-0 text-start">
          <SheetTitle>{t("acceptorsTitle", { version: version.version })}</SheetTitle>
          <SheetDescription>{t("acceptorsDescription")}</SheetDescription>
        </SheetHeader>

        <SearchInput value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("acceptorsSearchPlaceholder")} />

        {isPending ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</p>
        ) : result.items.length === 0 ? (
          <EmptyState title={t("noAcceptors")} />
        ) : (
          <ul className="space-y-2">
            {result.items.map((acceptor) => (
              <li key={acceptor.userId} className="rounded-xl border border-border p-3">
                <p className="font-medium">{acceptor.name}</p>
                <p className="text-sm text-muted-foreground">{acceptor.email}</p>
                <p className="mt-1 text-xs text-muted-foreground">{formatDate(acceptor.acceptedAt, locale)}</p>
              </li>
            ))}
          </ul>
        )}

        {result.total > 0 && (
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
            onPageChange={setPage}
            summary={({ from, to, total }) => t("pagination.summary", { from, to, total })}
            previousLabel={t("pagination.previous")}
            nextLabel={t("pagination.next")}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function VersionAcceptanceStats({ stats }: { stats: LegalDocumentVersionAcceptanceStats | null | undefined }) {
  const t = useTranslations("Admin.content");
  const locale = useLocale();
  if (!stats) return null;

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span>{t("acceptedByCount", { count: stats.acceptedCount, total: stats.totalUsers })}</span>
      <span>{t("acceptancePercentage", { percentage: stats.acceptancePercentage })}</span>
      {stats.firstAcceptedAt && <span>{t("firstAccepted", { date: formatDate(stats.firstAcceptedAt, locale) })}</span>}
      {stats.lastAcceptedAt && <span>{t("lastAccepted", { date: formatDate(stats.lastAcceptedAt, locale) })}</span>}
    </div>
  );
}

export function LegalDocumentVersionHistory({
  documentId,
  versions,
  publisherNames,
  statsByVersionId,
}: {
  documentId: string;
  versions: LegalDocumentVersionListItem[];
  publisherNames: Record<string, string>;
  statsByVersionId: Record<string, LegalDocumentVersionAcceptanceStats | null>;
}) {
  const t = useTranslations("Admin.content");
  const locale = useLocale();
  const router = useRouter();
  const [activeLocale, setActiveLocale] = useState<"en" | "ar">("en");
  const [fromVersionId, setFromVersionId] = useState(versions[1]?.id ?? versions[0]?.id ?? "");
  const [toVersionId, setToVersionId] = useState(versions[0]?.id ?? "");
  const [viewedVersion, setViewedVersion] = useState<LegalDocumentVersion | null>(null);
  const [comparison, setComparison] = useState<LegalDocumentVersionComparison | null>(null);
  const [acceptorsVersion, setAcceptorsVersion] = useState<LegalDocumentVersionListItem | null>(null);
  const [isPending, startTransition] = useTransition();

  function viewVersion(versionId: string) {
    startTransition(async () => {
      const result = await getLegalDocumentVersionAction(documentId, versionId);
      if (result.success) setViewedVersion(result.data);
      else toast.error(result.message);
    });
  }

  function compareVersions() {
    if (!fromVersionId || !toVersionId || fromVersionId === toVersionId) return;
    startTransition(async () => {
      const result = await compareLegalDocumentVersionsAction(documentId, fromVersionId, toVersionId, activeLocale);
      if (result.success) setComparison(result.data);
      else toast.error(result.message);
    });
  }

  function restoreVersion(version: LegalDocumentVersionListItem) {
    if (!window.confirm(t("confirmRestore", { version: version.version }))) return;
    startTransition(async () => {
      const result = await restoreLegalDocumentVersionAction(documentId, version.id);
      if (result.success) {
        toast.success(t("toasts.restored", { version: version.version }));
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("historyTitle")}</CardTitle>
        <CardDescription>{t("historyDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noVersions")}</p>
        ) : (
          <div className="space-y-3">
            {versions.map((version) => (
              <div key={version.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4">
                <div className="space-y-1">
                  <p className="font-medium">{t("versionLabel", { version: version.version })}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(version.publishedAt, locale)}
                    {version.publishedByUserId && publisherNames[version.publishedByUserId]
                      ? ` · ${t("publishedBy", { name: publisherNames[version.publishedByUserId] })}`
                      : ""}
                  </p>
                  <VersionAcceptanceStats stats={statsByVersionId[version.id]} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => setAcceptorsVersion(version)}>
                    <Users aria-hidden="true" className="size-3.5" />
                    {t("viewAcceptors")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => viewVersion(version.id)}>
                    {t("viewVersion")}
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={() => restoreVersion(version)}>
                    {t("restoreVersion")}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {versions.length > 1 && (
          <div className="space-y-4 border-t border-border pt-6">
            <div>
              <h3 className="font-medium">{t("compareTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("compareDescription")}</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="grid gap-1.5 text-sm">
                <span>{t("fromVersion")}</span>
                <select className="h-9 rounded-lg border border-input bg-background px-2" value={fromVersionId} onChange={(event) => setFromVersionId(event.target.value)}>
                  {versions.map((version) => <option key={version.id} value={version.id}>{t("versionLabel", { version: version.version })}</option>)}
                </select>
              </label>
              <label className="grid gap-1.5 text-sm">
                <span>{t("toVersion")}</span>
                <select className="h-9 rounded-lg border border-input bg-background px-2" value={toVersionId} onChange={(event) => setToVersionId(event.target.value)}>
                  {versions.map((version) => <option key={version.id} value={version.id}>{t("versionLabel", { version: version.version })}</option>)}
                </select>
              </label>
              <Button type="button" disabled={isPending || fromVersionId === toVersionId} onClick={compareVersions}>
                {t("compare")}
              </Button>
            </div>
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
              <button type="button" onClick={() => { setActiveLocale("en"); setComparison(null); }} className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeLocale === "en" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"}`}>
                {t("englishTab")}
              </button>
              <button type="button" onClick={() => { setActiveLocale("ar"); setComparison(null); }} className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeLocale === "ar" ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"}`}>
                {t("arabicTab")}
              </button>
            </div>
            {comparison && (
              <p dir={activeLocale === "ar" ? "rtl" : "ltr"} className="whitespace-pre-wrap rounded-xl border border-border bg-muted/20 p-4 text-sm leading-7">
                {comparison.segments.map((segment, index) => (
                  <span key={`${index}-${segment.value}`} className={segment.added ? "rounded bg-emerald-200/70 px-0.5 dark:bg-emerald-500/25" : segment.removed ? "rounded bg-red-200/70 px-0.5 text-red-800 line-through dark:bg-red-500/25 dark:text-red-200" : undefined}>
                    {segment.value}
                  </span>
                ))}
              </p>
            )}
          </div>
        )}

        {viewedVersion && (
          <div className="space-y-3 border-t border-border pt-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="font-medium">{t("viewedVersion", { version: viewedVersion.version })}</h3>
              <Button type="button" variant="ghost" size="sm" onClick={() => setViewedVersion(null)}>{t("closeView")}</Button>
            </div>
            <article dir={activeLocale === "ar" ? "rtl" : "ltr"} className="rich-text-content rounded-xl border border-border bg-muted/20 p-5" dangerouslySetInnerHTML={{ __html: activeLocale === "ar" ? viewedVersion.contentAr : viewedVersion.contentEn }} />
          </div>
        )}
      </CardContent>

      {acceptorsVersion && (
        <VersionAcceptorsSheet
          version={acceptorsVersion}
          onOpenChange={(open) => {
            if (!open) setAcceptorsVersion(null);
          }}
        />
      )}
    </Card>
  );
}
