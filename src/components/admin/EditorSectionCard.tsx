/**
 * The editor surfaces' shared section chrome — an iconed, eyebrow-styled
 * card. Extracted from `ArticleEditorForm` so the article and course
 * editors (and future authoring surfaces) speak one visual language
 * instead of each inventing its own section treatment.
 */
export function EditorSectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="size-4 text-primary" aria-hidden="true" />
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
