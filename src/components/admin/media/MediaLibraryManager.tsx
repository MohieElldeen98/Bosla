"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { Pagination } from "@/components/admin/Pagination";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { MediaGridCard } from "@/components/admin/media/MediaGridCard";
import { MediaUploadZone } from "@/components/admin/media/MediaUploadZone";
import { MediaDetailSheet } from "@/components/admin/media/MediaDetailSheet";
import { getMediaByIdAction } from "@/cms/actions/media.actions";
import { MEDIA_FILE_TYPES } from "@/cms/types/media-library";
import type { MediaSearchFilters, MediaSearchResult } from "@/cms/types/media-search";
import type { MediaLibraryAsset, ResolvedMediaLibraryAsset } from "@/cms/types/media-library";

const ALL = "all";

/** `/admin/media`'s interactive shell (Phase 7, Step 7.1) — same
 *  URL-search-param-driven pattern as `CouponsManager`/`OrdersManager`,
 *  a card grid instead of a table (media has nothing meaningful to show
 *  as table columns — a thumbnail *is* the useful summary). Upload and
 *  edit both happen in `Sheet`s on this same page; there's no separate
 *  `/new`/`/[id]/edit` route the way Courses/Coupons have, since a
 *  media asset's own "form" is small enough to not need one. */
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
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchValue, setSearchValue] = useState(filters.query ?? "");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [detailAsset, setDetailAsset] = useState<MediaLibraryAsset | null>(null);

  useEffect(() => {
    setSearchValue(filters.query ?? "");
  }, [filters.query]);

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

  async function openDetail(id: string) {
    const asset = await getMediaByIdAction(id);
    if (!asset) {
      toast.error(t("toasts.notFound"));
      return;
    }
    setDetailAsset(asset);
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
            {t("upload")}
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
      </div>

      {result.items.length === 0 ? (
        <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {result.items.map((asset) => (
            <MediaGridCard key={asset.id} asset={asset} onClick={() => openDetail(asset.id)} />
          ))}
        </div>
      )}

      <Pagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        pageSize={result.pageSize}
        onPageChange={(page) => updateParams({ page: String(page) }, false)}
        summary={({ from, to, total }) => t("pagination.summary", { from, to, total })}
        previousLabel={t("pagination.previous")}
        nextLabel={t("pagination.next")}
      />

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="data-[side=right]:sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{t("upload")}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto px-4 pb-4">
            <MediaUploadZone
              onUploaded={() => {
                setUploadOpen(false);
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
        onSaved={() => router.refresh()}
        onDeleted={() => router.refresh()}
      />
    </div>
  );
}
