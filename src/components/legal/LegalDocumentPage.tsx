import { CompassBezel } from "@/components/brand/CompassBezel";
import { SectionAnchorTabs } from "@/components/courses/SectionAnchorTabs";
import { TableOfContents } from "@/components/legal/TableOfContents";
import type { ResolvedLegalDocument } from "@/cms/types/legal-document";

/**
 * The shared shell for `/privacy`, `/terms`, and `/refunds`
 * (docs/legal-content-platform.md §Page Design) — "premium SaaS
 * documentation" per the spec: a hero band matching the course details
 * page's exact treatment (same `CompassBezel` decoration, same muted
 * band), a "last updated" line sourced from the document's own
 * `publishedAt` (never a hardcoded date), a sticky desktop Table of
 * Contents alongside a comfortable reading-width column, and mobile
 * anchor tabs (`SectionAnchorTabs`, reused as-is — it's already generic
 * over `{id,label}[]`) so small screens get the same "jump to section"
 * affordance without a sidebar.
 *
 * `document.html` has already been through `sanitizeLegalHtml` (write
 * time) and `buildLegalToc` (render time, heading ids injected) by the
 * time it reaches this component — rendering it via
 * `dangerouslySetInnerHTML` here is safe for the same reason the blog
 * article page's own use of it is: the sanitizer, not this component,
 * is the security boundary.
 */
export function LegalDocumentPage({
  document,
  locale,
  lastUpdatedLabel,
  tocLabel,
  sectionsNavLabel,
}: {
  document: ResolvedLegalDocument;
  locale: string;
  lastUpdatedLabel: string;
  tocLabel: string;
  sectionsNavLabel: string;
}) {
  const formattedDate = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(document.publishedAt));
  const mobileSections = document.toc
    .filter((entry) => entry.level === 2)
    .map((entry) => ({ id: entry.id, label: entry.text }));

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-muted/50 pt-28 pb-10 sm:pt-32 sm:pb-14">
        <CompassBezel className="pointer-events-none absolute -end-24 -top-24 size-80 text-primary/[0.07]" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
          <h1 className="max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">{document.title}</h1>
          <p className="mt-4 text-sm text-muted-foreground">
            {lastUpdatedLabel} {formattedDate}
          </p>
        </div>
      </section>

      {mobileSections.length > 0 && <SectionAnchorTabs sections={mobileSections} navLabel={sectionsNavLabel} />}

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 py-12 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:px-8">
        <TableOfContents entries={document.toc} label={tocLabel} />
        <article
          className="legal-document-content rich-text-content max-w-3xl"
          dangerouslySetInnerHTML={{ __html: document.html }}
        />
      </div>
    </div>
  );
}
