import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { LegalDocumentEditorForm } from "@/components/admin/content/LegalDocumentEditorForm";
import { LegalDocumentVersionHistory } from "@/components/admin/content/LegalDocumentVersionHistory";
import { LegalDocumentService } from "@/cms/services/legal-document.service";
import { LegalDocumentVersionService } from "@/cms/services/legal-document-version.service";
import { LegalAcceptanceService } from "@/cms/services/legal-acceptance.service";
import { ProfileService } from "@/auth/services/profile.service";
import type { LegalDocumentVersionAcceptanceStats } from "@/cms/types/legal-acceptance";

/** `/admin/content/[id]` — the legal document editor: bilingual title +
 *  rich-text content, Save Draft / Publish. */
export default async function AdminContentEditorPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id } = await params;
  const result = await LegalDocumentService.getByIdForAdmin(id);

  if (!result.success) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const document = result.data;
  const t = await getTranslations("Admin.content");
  const versionsResult = await LegalDocumentVersionService.listVersions(id);
  const versions = versionsResult.success ? versionsResult.data : [];
  const publisherIds = versions.flatMap((version) => version.publishedByUserId ?? []);
  const profiles = publisherIds.length > 0 ? await ProfileService.getByUserIds(publisherIds) : [];
  const publisherNames = Object.fromEntries(
    profiles.map((profile) => [profile.userId, profile.displayName ?? profile.fullName ?? profile.email]),
  );

  // "Accepted by" stats per version — resolved eagerly alongside
  // `publisherNames` above (a document has few versions; this is the
  // same "compose everything server-side once" pattern, not a
  // per-row client fetch). The paginated/searchable acceptor LIST is
  // a separate, on-demand fetch inside `LegalDocumentVersionHistory`
  // itself, since that genuinely needs live pagination/search.
  const statsEntries = await Promise.all(
    versions.map(async (version) => {
      const statsResult = await LegalAcceptanceService.getVersionStats(version.id);
      return [version.id, statsResult.success ? statsResult.data : null] as const;
    }),
  );
  const statsByVersionId = Object.fromEntries(statsEntries) as Record<
    string,
    LegalDocumentVersionAcceptanceStats | null
  >;

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: document.titleEn }]} />
      <PageTitle title={document.titleEn} description={t("editorDescription", { slug: document.slug })} />
      <LegalDocumentEditorForm key={document.updatedAt} document={document} />
      <LegalDocumentVersionHistory
        documentId={document.id}
        versions={versions}
        publisherNames={publisherNames}
        statsByVersionId={statsByVersionId}
      />
    </div>
  );
}
