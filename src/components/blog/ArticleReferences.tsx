import type { ArticleReference } from "@/blog/types/article";
import { articleDirection, type ArticleLanguage } from "@/blog/types/article-language";

export function ArticleReferences({ references, language }: { references: ArticleReference[]; language: ArticleLanguage }) {
  if (references.length === 0) return null;
  return (
    <section id="references" dir={articleDirection(language)} className="article-references mt-16 border-t border-border pt-8" aria-labelledby="references-heading">
      <h2 id="references-heading" className="text-xl font-semibold tracking-tight">{language === "ar" ? "المصادر" : "References"}</h2>
      <ol className="mt-5 list-decimal space-y-3 ps-6 text-sm leading-6 text-muted-foreground marker:font-semibold marker:text-primary">
        {references.map((reference, index) => (
          <li key={`${reference.url}-${index}`} id={`ref-${index + 1}`}>
            <a href={reference.url} target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-border underline-offset-4 hover:decoration-primary">
              {reference.title}
            </a>
          </li>
        ))}
      </ol>
    </section>
  );
}
