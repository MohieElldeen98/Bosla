import { getTranslations } from "next-intl/server";
import { PageTitle } from "@/components/admin/PageTitle";
import { NewsletterSubscribersManager } from "@/components/admin/newsletter/NewsletterSubscribersManager";
import { NewsletterSubscriptionService } from "@/newsletter/services/newsletter-subscription.service";
import { searchNewsletterSubscribersSchema } from "@/newsletter/validators/newsletter-subscription.validator";

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** `/admin/newsletter` — the footer subscribe form's list
 *  (docs/legal-content-platform.md §Newsletter). Same URL-driven
 *  search/filter/pagination shell as `/admin/contact`. */
export default async function AdminNewsletterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawSearchParams = await searchParams;
  const parsed = searchNewsletterSubscribersSchema.safeParse({
    query: firstValue(rawSearchParams.q),
    status: firstValue(rawSearchParams.status),
    page: firstValue(rawSearchParams.page),
    pageSize: firstValue(rawSearchParams.pageSize),
  });
  const filters = parsed.success ? parsed.data : {};

  const [tNav, result, counts] = await Promise.all([
    getTranslations("Admin.nav.newsletter"),
    NewsletterSubscriptionService.searchResolved(filters),
    NewsletterSubscriptionService.countByStatus(),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle title={tNav("label")} description={tNav("description")} />
      <NewsletterSubscribersManager result={result} filters={filters} counts={counts} />
    </div>
  );
}
