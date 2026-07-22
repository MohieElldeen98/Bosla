"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ImageIcon, Plus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { InstructorRowActions } from "@/components/admin/instructors/InstructorRowActions";
import { FeaturedInstructorsPanel } from "@/components/admin/instructors/FeaturedInstructorsPanel";
import type { FeaturedInstructorOption } from "@/components/admin/instructors/FeaturedInstructorRow";

export interface InstructorListItem {
  id: string;
  name: string;
  specialtyName: string | null;
  thumbnailUrl: string | null;
  isActive: boolean;
  isFeatured: boolean;
  displayOrder: number;
}

/**
 * `/admin/instructors`'s interactive shell — plain client-side search over
 * an already-fetched full list (no server-side pagination; row count here
 * is small, unlike Courses). The Featured Instructors panel lives at the
 * top since choosing/ordering the homepage's 4 is the highest-traffic
 * action on this page.
 */
export function InstructorsManager({
  items,
  featuredOptions,
  initialFeatured,
}: {
  items: InstructorListItem[];
  featuredOptions: FeaturedInstructorOption[];
  initialFeatured: string[];
}) {
  const t = useTranslations("Admin.instructors");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.name.toLowerCase().includes(needle));
  }, [items, query]);

  return (
    <div className="space-y-6">
      <FeaturedInstructorsPanel options={featuredOptions} initialFeatured={initialFeatured} />

      <div className="space-y-4">
        <ActionToolbar
          search={<SearchInput placeholder={t("searchPlaceholder")} value={query} onChange={(event) => setQuery(event.target.value)} />}
          actions={
            <Button size="sm" nativeButton={false} render={<Link href="/admin/instructors/new" />}>
              <Plus aria-hidden="true" />
              {t("createInstructor")}
            </Button>
          }
        />

        <div className="rounded-2xl border border-border bg-card">
          {filtered.length === 0 ? (
            <div className="p-4 sm:p-6">
              <EmptyState
                title={t("emptyTitle")}
                description={t("emptyDescription")}
                action={
                  <Button size="sm" nativeButton={false} render={<Link href="/admin/instructors/new" />}>
                    <Plus aria-hidden="true" />
                    {t("createInstructor")}
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.instructor")}</TableHead>
                  <TableHead>{t("columns.specialty")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.featured")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt=""
                            width={40}
                            height={40}
                            sizes="40px"
                            className="size-10 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
                          />
                        ) : (
                          <span
                            role="img"
                            aria-label={t("noPortrait")}
                            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground ring-1 ring-foreground/10"
                          >
                            <ImageIcon aria-hidden="true" className="size-4" />
                          </span>
                        )}
                        <p className="truncate font-medium text-foreground">{item.name}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.specialtyName ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={item.isActive ? "active" : "draft"}>
                        {t(item.isActive ? "status.active" : "status.inactive")}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.isFeatured ? t("featuredBadge", { position: item.displayOrder + 1 }) : t("notFeatured")}
                    </TableCell>
                    <TableCell>
                      <InstructorRowActions id={item.id} name={item.name} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
