import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { EmptyState } from "@/components/admin/EmptyState";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { BreadcrumbTrail } from "@/components/layout/breadcrumb-trail";
import { ContactMessageDetailActions } from "@/components/admin/contact/ContactMessageDetailActions";
import { ContactMessageService } from "@/contact/services/contact-message.service";

function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
}

/** `/admin/contact/[id]` — one message's full text, sender identity, and
 *  lifecycle actions (mark resolved / delete). */
export default async function AdminContactMessageDetailPage({
  params,
}: {
  params: Promise<{ id: string; locale: string }>;
}) {
  const { id, locale } = await params;
  const result = await ContactMessageService.getById(id);

  if (!result.success) {
    const t = await getTranslations("Admin.emptyState");
    return <EmptyState title={t("defaultTitle")} description={t("defaultDescription")} />;
  }

  const message = result.data;
  const t = await getTranslations("Admin.contact");

  return (
    <div className="space-y-6">
      <BreadcrumbTrail segments={[{ label: message.subject }]} />
      <PageTitle
        title={message.subject}
        description={t("detailDescription", { name: message.name })}
        actions={<ContactMessageDetailActions message={message} />}
      />

      <div className="max-w-2xl space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <dl className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.name")}</dt>
              <dd className="font-medium text-foreground">{message.name}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("fields.email")}</dt>
              <dd dir="ltr" className="font-medium text-foreground">
                <a href={`mailto:${message.email}`} className="hover:text-primary hover:underline">
                  {message.email}
                </a>
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">{t("columns.status")}</dt>
              <dd>
                <StatusBadge status={message.status}>{t(`status.${message.status}`)}</StatusBadge>
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <dt className="text-muted-foreground">{t("columns.createdAt")}</dt>
              <dd className="font-medium text-foreground">{formatDate(message.createdAt, locale)}</dd>
            </div>
            {message.resolvedAt && (
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">{t("fields.resolvedAt")}</dt>
                <dd className="font-medium text-foreground">{formatDate(message.resolvedAt, locale)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">{t("fields.message")}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{message.message}</p>
        </div>
      </div>
    </div>
  );
}
