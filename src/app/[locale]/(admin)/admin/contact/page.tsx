import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { ContactInboxManager } from "@/components/admin/contact/ContactInboxManager";
import { ContactMessageService } from "@/contact/services/contact-message.service";
import { searchContactMessagesSchema } from "@/contact/validators/contact-message.validator";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/admin/contact` — the contact-form inbox (docs/legal-content-platform.md
 *  §Admin). Same URL-driven search/filter/pagination shell as
 *  `/admin/orders`. */
export default async function AdminContactPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = searchContactMessagesSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result] = await Promise.all([
    getTranslations("Admin.nav.contact"),
    ContactMessageService.searchResolved(filters),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <ContactInboxManager result={result} filters={filters} />
    </div>
  );
}
