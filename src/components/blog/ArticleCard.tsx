import { Newspaper } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { ArticleListItem } from "@/blog/types/article-search";
import type { getTranslations } from "next-intl/server";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/**
 * One card in the public blog grid/rail — `CourseCard`'s visual language
 * (same `Card` primitive, cover-image header, gradient+icon placeholder)
 * adapted to editorial content: read time + category instead of
 * price/level, author line instead of instructor. Server Component,
 * translators passed down from the page's single `getTranslations` calls
 * (same reasoning as `CourseCard`).
 */
export function ArticleCard({
  article,
  t,
  teamAuthorLabel,
}: {
  article: ArticleListItem;
  /** The `Blog.card` translator. */
  t: Translator;
  teamAuthorLabel: string;
}) {
  const authorName = article.authorName ?? teamAuthorLabel;

  return (
    <Link href={`/blog/${article.slug}`} className="group block h-full">
      <Card className="h-full overflow-hidden py-0 transition-shadow group-hover:shadow-lg">
        <div className="relative flex aspect-[16/9] items-end overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-transparent">
          {article.coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={article.coverImageUrl}
              alt=""
              className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <Newspaper aria-hidden="true" className="absolute -end-4 -bottom-4 size-28 text-primary/15" />
          )}
        </div>

        <CardContent className="flex flex-1 flex-col gap-3 px-5 pt-5 pb-5">
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-foreground">
            {article.title}
          </h3>
          {article.excerpt && (
            <p className="line-clamp-2 text-sm text-muted-foreground">{article.excerpt}</p>
          )}

          <p className="text-sm text-muted-foreground">
            {t("minRead", { minutes: article.readTimeMinutes })}
            {article.categoryName && (
              <>
                {" · "}
                <span className="text-primary underline-offset-2 group-hover:underline">
                  {t("postedIn", { category: article.categoryName })}
                </span>
              </>
            )}
          </p>

          <div className="mt-auto flex items-center gap-2 border-t border-border pt-4 text-sm">
            {article.authorAvatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.authorAvatarUrl}
                alt=""
                className="size-7 shrink-0 rounded-full object-cover ring-1 ring-foreground/10"
              />
            ) : (
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                {authorName.charAt(0)}
              </span>
            )}
            <span className="truncate text-muted-foreground">{authorName}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
