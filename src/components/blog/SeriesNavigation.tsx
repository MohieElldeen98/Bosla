import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { articleDirection, type ArticleLanguage } from "@/blog/types/article-language";
import { SeriesNextGate } from "@/components/blog/SeriesNextGate";

type Neighbor = { slug: string; title: string; position: number } | null;
export function SeriesNavigation({ language, previous, next }: { language: ArticleLanguage; previous: Neighbor; next: Neighbor }) {
  if (!previous && !next) return null;
  const rtl = articleDirection(language) === "rtl";
  const labels = language === "ar" ? { previous: "الدرس السابق", next: "الدرس التالي", hint: "جاوب على الأسئلة للمتابعة" } : { previous: "Previous lesson", next: "Next lesson", hint: "Answer the quizzes to continue" };
  const card = (neighbor: Exclude<Neighbor, null>, label: string, arrow: "previous" | "next") => <div className="rounded-2xl border border-border p-5 transition-colors hover:border-primary"><div className="flex items-center justify-between gap-3 text-xs font-medium text-muted-foreground"><span>{label}</span>{arrow === "previous" ? <ArrowLeft className={rtl ? "size-4 rotate-180" : "size-4"} aria-hidden="true" /> : <ArrowRight className={rtl ? "size-4 rotate-180" : "size-4"} aria-hidden="true" />}</div><p dir={articleDirection(language)} className="mt-3 font-semibold text-foreground">{neighbor.title}</p></div>;
  return <nav dir={articleDirection(language)} aria-label={language === "ar" ? "سلسلة المقالات" : "Article series"} className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 px-6 sm:grid-cols-2 lg:px-8">
    {previous ? <Link href={`/blog/${previous.slug}`}>{card(previous, labels.previous, "previous")}</Link> : <div aria-hidden="true" />}
    {next ? <SeriesNextGate href={`/blog/${next.slug}`} hint={labels.hint}>{card(next, labels.next, "next")}</SeriesNextGate> : <div aria-hidden="true" />}
  </nav>;
}
