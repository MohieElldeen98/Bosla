import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "@/i18n/navigation";
import { LegalDocumentService } from "@/cms/services/legal-document.service";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** `/admin/content` — the Static Content CMS's document listing
 *  (docs/legal-content-platform.md §Static Content CMS): every legal
 *  document (Privacy, Terms, Refunds today — any future one that gets
 *  seeded appears here automatically, no code change), its publish
 *  status, version, and last-updated date. */
export default async function AdminContentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [t, tNav, result] = await Promise.all([
    getTranslations("Admin.content"),
    getTranslations("Admin.nav.content"),
    LegalDocumentService.getAllForAdmin(),
  ]);

  const documents = result.success ? result.data : [];

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />

      <div className="rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.document")}</TableHead>
              <TableHead>{t("columns.status")}</TableHead>
              <TableHead>{t("columns.version")}</TableHead>
              <TableHead>{t("columns.updatedAt")}</TableHead>
              <TableHead>
                <span className="sr-only">{t("columns.actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((document) => (
              <TableRow key={document.id}>
                <TableCell>
                  <p className="font-medium text-foreground">{document.titleEn}</p>
                  <p className="text-xs text-muted-foreground">/{document.slug}</p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={document.published ? "published" : "draft"}>
                    {t(document.published ? "status.published" : "status.draft")}
                  </StatusBadge>
                </TableCell>
                <TableCell className="text-muted-foreground">{t("versionShort", { version: document.version })}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(document.updatedAt, locale)}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/content/${document.id}`}
                    className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {t("edit")}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
