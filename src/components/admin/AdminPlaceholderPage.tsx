import { getTranslations } from "next-intl/server";
import { ADMIN_NAV_ITEMS } from "@/components/admin/admin-nav";
import { PageTitle } from "@/components/admin/PageTitle";
import { ActionToolbar } from "@/components/admin/ActionToolbar";
import { SearchInput } from "@/components/admin/SearchInput";
import { EmptyState } from "@/components/admin/EmptyState";

/**
 * The shared template every `/admin/*` placeholder page renders — a
 * consistent Heading + Description + Empty State (per Step 6.3's scope: no
 * editors, forms, or uploads yet), driven entirely by `admin-nav.ts` +
 * `Admin.nav.<id>` translations so there's one place to update copy, not
 * thirteen near-duplicate page files.
 */
export async function AdminPlaceholderPage({ navId }: { navId: string }) {
  const item = ADMIN_NAV_ITEMS.find((navItem) => navItem.id === navId);
  const [t, tEmpty, tSearch] = await Promise.all([
    getTranslations(`Admin.nav.${navId}`),
    getTranslations("Admin.emptyState"),
    getTranslations("Admin.search"),
  ]);

  const title = t("label");
  const description = t("description");

  return (
    <>
      <PageTitle title={title} description={description} />
      <ActionToolbar search={<SearchInput placeholder={tSearch("placeholder")} disabled />} />
      <EmptyState
        icon={item?.icon}
        badge={tEmpty("badge")}
        title={tEmpty("defaultTitle")}
        description={tEmpty("defaultDescription")}
      />
    </>
  );
}
