"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { SeoForm } from "@/components/admin/homepage/SeoForm";
import type { SeoMeta } from "@/cms/types/seo";

export interface SeoContentItem {
  id: string;
  seoMetaId: string | null;
  seo: SeoMeta | null;
  title: string;
  path: string;
}

export type AttachSeoMetaResult = { success: true; seoMetaId: string; seo: SeoMeta } | { success: false; message: string };

/**
 * The shared "search a list, expand a row, edit its SEO" pattern behind
 * both the Courses and Articles tabs of `/admin/seo` — same interaction
 * `HomepageEditor`'s own section Accordion already uses, just over a
 * flat content list instead of ordered sections. `SeoForm` (the same
 * component the Homepage's own SEO card renders) is reused as-is per
 * row; no second SEO editor exists anywhere in this codebase.
 *
 * A row whose `seo` is `null` (a course/article created before every
 * create auto-attached one) shows a "Set up SEO" button instead of the
 * form — `attachSeoMeta`'s own doc comment says it's meant to run once,
 * on demand, from exactly this kind of affordance, not automatically;
 * its check-then-write isn't safe to call concurrently for the same row.
 */
export function ContentSeoAccordion({
  items,
  onAttach,
  searchPlaceholder,
  emptyTitle,
  emptyDescription,
  noResultsTitle,
  noResultsDescription,
  clearSearchLabel,
  customSeoLabel,
  defaultSeoLabel,
  setUpSeoLabel,
  settingUpSeoLabel,
}: {
  items: SeoContentItem[];
  onAttach: (id: string) => Promise<AttachSeoMetaResult>;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  noResultsTitle: string;
  noResultsDescription: string;
  clearSearchLabel: string;
  customSeoLabel: string;
  defaultSeoLabel: string;
  setUpSeoLabel: string;
  settingUpSeoLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [localItems, setLocalItems] = useState(items);
  const [attachingId, setAttachingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSaved(id: string, seo: SeoMeta) {
    setLocalItems((current) => current.map((item) => (item.id === id ? { ...item, seo } : item)));
  }

  function handleAttach(id: string) {
    setAttachingId(id);
    startTransition(async () => {
      const result = await onAttach(id);
      if (result.success) {
        setLocalItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, seoMetaId: result.seoMetaId, seo: result.seo } : item,
          ),
        );
      } else {
        toast.error(result.message);
      }
      setAttachingId(null);
    });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return localItems;
    return localItems.filter(
      (item) => item.title.toLowerCase().includes(needle) || item.path.toLowerCase().includes(needle),
    );
  }, [localItems, query]);

  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-4">
      <SearchInput
        placeholder={searchPlaceholder}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="sm:max-w-xs"
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={noResultsTitle}
          description={noResultsDescription}
          action={
            <Button size="sm" variant="outline" onClick={() => setQuery("")}>
              {clearSearchLabel}
            </Button>
          }
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card px-4 sm:px-6">
          <Accordion>
            {filtered.map((item) => (
              <AccordionItem key={item.id} value={item.id}>
                <div className="flex items-center gap-2">
                  <AccordionTrigger className="flex-1">
                    <span className="text-left">
                      <span className="block font-medium text-foreground">{item.title}</span>
                      <span className="block text-xs font-normal text-muted-foreground">{item.path}</span>
                    </span>
                  </AccordionTrigger>
                  {item.seo && (
                    <Badge variant={item.seo.title ? "default" : "secondary"}>
                      {item.seo.title ? customSeoLabel : defaultSeoLabel}
                    </Badge>
                  )}
                </div>
                <AccordionContent>
                  {item.seo && item.seoMetaId ? (
                    <SeoForm
                      seoMetaId={item.seoMetaId}
                      seo={item.seo}
                      onSaved={(seo) => handleSaved(item.id, seo)}
                      onDirtyChange={() => {}}
                    />
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isPending && attachingId === item.id}
                      onClick={() => handleAttach(item.id)}
                    >
                      {isPending && attachingId === item.id ? settingUpSeoLabel : setUpSeoLabel}
                    </Button>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
