"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { retryJobAction, deleteJobAction } from "@/jobs/actions";
import type { JobListItem, JobStatus } from "@/jobs/types";

const ALL = "all";
const JOB_STATUSES: JobStatus[] = ["pending", "processing", "failed", "completed"];

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(iso));
}

/** `/admin/jobs`'s interactive shell — a plain filtered table over
 *  whatever `page.tsx` fetched for the current `status`, no client-side
 *  search/pagination/infinite-scroll: changing the filter is a full
 *  navigation (`updateParams`), matching `MediaLibraryManager`'s
 *  URL-param-driven pattern minus everything this page doesn't need.
 *  Retry/Delete are plain inline buttons, not a "..." dropdown — this is
 *  an ops tool someone reaches for mid-incident, not a content editor. */
export function JobsManager({
  items,
  status,
  counts,
}: {
  items: JobListItem[];
  status: JobStatus | undefined;
  counts: Partial<Record<JobStatus, number>>;
}) {
  const t = useTranslations("Admin.jobs");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function setStatus(value: string | null) {
    const query = !value || value === ALL ? "" : `?status=${value}`;
    router.push(`/admin/jobs${query}`, { scroll: false });
  }

  function handleRetry(id: string) {
    setPendingId(id);
    startTransition(async () => {
      const result = await retryJobAction(id);
      if (result.success) {
        toast.success(t("toasts.retried"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setPendingId(null);
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    setPendingId(id);
    startTransition(async () => {
      const result = await deleteJobAction(id);
      if (result.success) {
        toast.success(t("toasts.deleted"));
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4">
        {JOB_STATUSES.map((key) => (
          <div key={key} className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold text-foreground">{counts[key] ?? 0}</span>
            <span className="text-xs text-muted-foreground">{t(`counts.${key}`)}</span>
          </div>
        ))}
      </div>

      <Select value={status ?? ALL} onValueChange={setStatus}>
        <SelectTrigger size="sm" className="w-48">
          <SelectValue placeholder={t("filters.all")} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t("filters.all")}</SelectItem>
          {JOB_STATUSES.map((key) => (
            <SelectItem key={key} value={key}>
              {t(`status.${key}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="rounded-2xl border border-border bg-card">
        {items.length === 0 ? (
          <div className="p-4 sm:p-6">
            <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columns.type")}</TableHead>
                  <TableHead>{t("columns.status")}</TableHead>
                  <TableHead>{t("columns.attempts")}</TableHead>
                  <TableHead>{t("columns.createdAt")}</TableHead>
                  <TableHead>{t("columns.updatedAt")}</TableHead>
                  <TableHead>{t("columns.lastError")}</TableHead>
                  <TableHead>
                    <span className="sr-only">{t("columns.actions")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-mono text-xs text-foreground">{job.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={job.status}>{t(`status.${job.status}`)}</StatusBadge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.attempts}/{job.maxAttempts}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(job.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(job.updatedAt)}
                    </TableCell>
                    <TableCell className="max-w-64">
                      {job.lastError ? (
                        <p className="truncate text-xs text-destructive" title={job.lastError}>
                          {job.lastError}
                        </p>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {job.status === "failed" && (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isPending && pendingId === job.id}
                            onClick={() => handleRetry(job.id)}
                          >
                            {t("actions.retry")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={isPending && pendingId === job.id}
                            onClick={() => handleDelete(job.id)}
                          >
                            {t("actions.delete")}
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
