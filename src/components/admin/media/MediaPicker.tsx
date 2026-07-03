"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
import { MediaGridCard } from "@/components/admin/media/MediaGridCard";
import { MediaThumbnail } from "@/components/admin/media/MediaThumbnail";
import { MediaUploadZone } from "@/components/admin/media/MediaUploadZone";
import { searchMediaAction, getResolvedMediaByIdAction } from "@/cms/actions/media.actions";
import { DEFAULT_MEDIA_PAGE_SIZE } from "@/cms/types/media-search";
import type { Locale } from "@/i18n/routing";
import type { MediaFileType, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";
import type { MediaSearchResult, MediaSearchFilters } from "@/cms/types/media-search";

const EMPTY_RESULT: MediaSearchResult<ResolvedMediaLibraryAsset> = {
  items: [],
  total: 0,
  page: 1,
  pageSize: DEFAULT_MEDIA_PAGE_SIZE,
  totalPages: 1,
};

/**
 * The reusable Media Library picker (Phase 7, Step 7.1) — every feature
 * that needs to attach an uploaded asset (course cover/thumbnail/
 * trailer, instructor avatar, lesson video, quiz/homepage/article
 * images, ...) uses this instead of its own upload flow or a typed-in
 * raw asset id (`IdReferenceField`'s own doc comment already flagged
 * that as a temporary stand-in for exactly this component). Generic
 * over an asset id (`value`/`onChange`) — nothing here references
 * Courses, Instructors, or any other domain, so it drops into any form
 * (including as a `Controller`-wrapped field, the same way
 * `CourseCombobox` already gets wrapped in `CouponEditorForm`).
 *
 * Reads (`searchMediaAction`, `getResolvedMediaByIdAction`) go through
 * Server Actions rather than importing `CmsMediaService` directly — this
 * is a Client Component, and Services are server-only. Uploading reuses
 * `MediaUploadZone` as-is, the same component the admin Media Library
 * page itself uses.
 */
export function MediaPicker({
  value,
  onChange,
  accept,
  placeholderLabel,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  /** Restricts both the browse grid and the upload zone's accepted
   *  files to these file types — e.g. `["image"]` for a cover image
   *  field. Omit to accept anything the library holds. */
  accept?: MediaFileType[];
  placeholderLabel?: string;
}) {
  const t = useTranslations("Admin.media.picker");
  const locale = useLocale() as Locale;

  const [selected, setSelected] = useState<ResolvedMediaLibraryAsset | null>(null);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"browse" | "upload">("browse");
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<MediaSearchResult<ResolvedMediaLibraryAsset>>(EMPTY_RESULT);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSelected(null);
      return;
    }
    getResolvedMediaByIdAction(value, locale).then((asset) => {
      if (!cancelled) setSelected(asset);
    });
    return () => {
      cancelled = true;
    };
  }, [value, locale]);

  async function runSearch(query: string, targetPage: number) {
    setIsLoading(true);
    const filters: MediaSearchFilters = { query: query || undefined, page: targetPage };
    if (accept && accept.length === 1) filters.fileType = accept[0];
    const next = await searchMediaAction(filters, locale);
    setResult(next);
    setIsLoading(false);
  }

  useEffect(() => {
    if (!open || tab !== "browse") return;
    runSearch(searchValue, page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, page]);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => {
      setPage(1);
      runSearch(searchValue, 1);
    }, 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  function handleSelect(asset: ResolvedMediaLibraryAsset) {
    setSelected(asset);
    onChange(asset.id);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      {selected ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-2">
          <div className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
            <MediaThumbnail url={selected.url} alt={selected.alt ?? ""} fileType={selected.fileType} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-foreground">{selected.title ?? selected.alt ?? t("untitled")}</p>
            <p className="text-xs text-muted-foreground">{t(`fileTypes.${selected.fileType}`)}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
            {t("change")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("remove")}
            onClick={() => {
              setSelected(null);
              onChange(null);
            }}
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>
          <ImagePlus aria-hidden="true" />
          {placeholderLabel ?? t("choose")}
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t("dialogTitle")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-4">
            <div className="flex gap-2 border-b border-border">
              <button
                type="button"
                onClick={() => setTab("browse")}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === "browse" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
              >
                {t("tabs.browse")}
              </button>
              <button
                type="button"
                onClick={() => setTab("upload")}
                className={`border-b-2 px-1 pb-2 text-sm font-medium ${tab === "upload" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"}`}
              >
                {t("tabs.upload")}
              </button>
            </div>

            {tab === "browse" ? (
              <div className="space-y-3">
                <SearchInput
                  placeholder={t("searchPlaceholder")}
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                />
                {!isLoading && result.items.length === 0 ? (
                  <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {result.items.map((asset) => (
                      <MediaGridCard key={asset.id} asset={asset} selected={asset.id === value} onClick={() => handleSelect(asset)} />
                    ))}
                  </div>
                )}
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
              </div>
            ) : (
              <MediaUploadZone
                onUploaded={(assets) => {
                  const [first] = assets;
                  if (first) {
                    onChange(first.id);
                    getResolvedMediaByIdAction(first.id, locale).then((asset) => {
                      if (asset) setSelected(asset);
                    });
                  }
                  setOpen(false);
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
