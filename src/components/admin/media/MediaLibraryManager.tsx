"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { FolderInput, Loader2, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MediaGridCard } from "@/components/admin/media/MediaGridCard";
import { MediaUploadZone } from "@/components/admin/media/MediaUploadZone";
import { MediaDetailSheet } from "@/components/admin/media/MediaDetailSheet";
import {
  deleteMediaAction,
  getMediaByIdAction,
  getMediaUsagesAction,
  moveMediaToFolderAction,
  searchMediaAction,
} from "@/cms/actions/media.actions";
import { MEDIA_FILE_TYPES } from "@/cms/types/media-library";
import type { Locale } from "@/i18n/routing";
import type { MediaSearchFilters, MediaSearchResult } from "@/cms/types/media-search";
import type { MediaLibraryAsset, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaAssetUsage } from "@/cms/types/media-usage";

const ALL = "all";
const NO_FOLDER = "__none__";

/** `/admin/media`'s interactive shell — the Media Platform's library UI
 *  (docs/media-platform.md). URL-param-driven filters/sort like
 *  `CouponsManager`; the grid grows in place (infinite scroll via a
 *  load-more sentinel) instead of paging; multi-select enables bulk
 *  delete and bulk folder-move. Upload and edit both happen in `Sheet`s
 *  on this same page. */
export function MediaLibraryManager({
  result,
  filters,
  folders,
}: {
  result: MediaSearchResult<ResolvedMediaLibraryAsset>;
  filters: MediaSearchFilters;
  folders: string[];
}) {
  const t = useTranslations("Admin.media");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.query ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<MediaLibraryAsset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [usageMap, setUsageMap] = useState<Record<string, MediaAssetUsage[]>>({});

  // Infinite scroll: the server renders page 1 for the current filters;
  // further pages append client-side and reset whenever filters change.
  const [extraItems, setExtraItems] = useState<ResolvedMediaLibraryAsset[]>([]);
  const [nextPage, setNextPage] = useState(2);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const items = [...result.items, ...extraItems];
  const hasMore = items.length < result.total;

  useEffect(() => {
    setSearchValue(filters.query ?? "");
  }, [filters.query]);

  // Fetches "where is this used" badges for whichever assets are on
  // screen right now — the initial page and each infinite-scroll batch —
  // never re-fetching an id already resolved.
  useEffect(() => {
    const unresolved = items.map((item) => item.id).filter((id) => !(id in usageMap));
    if (unresolved.length === 0) return;
    void getMediaUsagesAction(unresolved).then((result) => {
      setUsageMap((current) => ({ ...current, ...result }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  useEffect(() => {
    // Any change in the server-rendered result (filters, refresh) resets
    // the appended pages and the selection.
    setExtraItems([]);
    setNextPage(2);
    setSelectedIds(new Set());
  }, [result]);

  function updateParams(updates: Record<string, string | undefined>, resetPage = true) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    if (resetPage) next.delete("page");
    const query = next.toString();
    router.push(query ? `/admin/media?${query}` : "/admin/media", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const more = await searchMediaAction({ ...filters, page: nextPage }, locale);
      setExtraItems((current) => [...current, ...more.items]);
      setNextPage((page) => page + 1);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, filters, nextPage, locale]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore) return undefined;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, hasMore]);

  async function openDetail(id: string) {
    const asset = await getMediaByIdAction(id);
    if (!asset) {
      toast.error(t("toasts.notFound"));
      return;
    }
    setDetailAsset(asset);
  }

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      let deleted = 0;
      for (const id of selectedIds) {
        const outcome = await deleteMediaAction(id);
        if (outcome.success) deleted += 1;
      }
      toast.success(t("bulk.deleted", { count: deleted }));
      setSelectedIds(new Set());
      router.refresh();
    } finally {
      setBulkBusy(false);
    }
  }

  async function bulkMove(folder: string) {
    if (selectedIds.size === 0) return;
    setBulkBusy(true);
    try {
      const target = folder === NO_FOLDER ? null : folder;
      const outcome = await moveMediaToFolderAction([...selectedIds], target);
      if (outcome.success) {
        toast.success(t("bulk.moved", { count: outcome.data }));
        setSelectedIds(new Set());
        router.refresh();
      } else {
        toast.error(outcome.message);
      }
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <ActionToolbar
        search={
          <SearchInput
            placeholder={t("searchPlaceholder")}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
          />
        }
        actions={
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus aria-hidden="true" />
            {t("uploadLabel")}
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.fileType ?? ALL}
          onValueChange={(value) => updateParams({ type: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.allTypes")}</SelectItem>
            {MEDIA_FILE_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {t(`fileTypes.${type}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {folders.length > 0 && (
          <Select
            value={filters.folder ?? ALL}
            onValueChange={(value) => updateParams({ folder: value && value !== ALL ? value : undefined })}
          >
            <SelectTrigger size="sm">
              <SelectValue placeholder={t("filters.allFolders")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allFolders")}</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder} value={folder}>
                  {folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select
          value={filters.usage ?? ALL}
          onValueChange={(value) => updateParams({ usage: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("filters.usage.all")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{t("filters.usage.all")}</SelectItem>
            <SelectItem value="used">{t("filters.usage.used")}</SelectItem>
            <SelectItem value="unused">{t("filters.usage.unused")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={(filters.sortBy ?? "createdAt") as string}
          onValueChange={(value) => updateParams({ sortBy: value === "createdAt" ? undefined : String(value) })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={t("sort.newest")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">{t("sort.newest")}</SelectItem>
            <SelectItem value="lastUsedAt">{t("sort.recentlyUsed")}</SelectItem>
            <SelectItem value="fileSize">{t("sort.largest")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2">
          <span className="text-sm text-foreground">{t("bulk.selected", { count: selectedIds.size })}</span>
          <span className="flex-1" />
          <Select onValueChange={(value) => void bulkMove(String(value))} disabled={bulkBusy}>
            <SelectTrigger size="sm">
              <FolderInput aria-hidden="true" className="size-4" />
              <SelectValue placeholder={t("bulk.moveTo")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_FOLDER}>{t("bulk.noFolder")}</SelectItem>
              {folders.map((folder) => (
                <SelectItem key={folder} value={folder}>
                  {folder}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="destructive" disabled={bulkBusy} onClick={() => void bulkDelete()}>
            <Trash2 aria-hidden="true" />
            {t("bulk.delete")}
          </Button>
          <Button size="sm" variant="ghost" disabled={bulkBusy} onClick={() => setSelectedIds(new Set())}>
            <X aria-hidden="true" />
            {t("bulk.clear")}
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {items.map((asset) => (
            <MediaGridCard
              key={asset.id}
              asset={asset}
              onClick={() => openDetail(asset.id)}
              checked={selectedIds.has(asset.id)}
              onCheckedChange={(checked) => toggleSelected(asset.id, checked)}
              unused={asset.id in usageMap && usageMap[asset.id].length === 0}
              unusedLabel={t("usageBadge")}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center py-4">
          <Button type="button" variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
            {t("loadMore")}
          </Button>
        </div>
      )}

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("uploadLabel")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <MediaUploadZone
              folder={filters.folder ?? null}
              onUploaded={() => {
                router.refresh();
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <MediaDetailSheet
        open={!!detailAsset}
        onOpenChange={(open) => {
          if (!open) setDetailAsset(null);
        }}
        asset={detailAsset}
        folders={folders}
        usages={detailAsset ? usageMap[detailAsset.id] : undefined}
        onSaved={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
