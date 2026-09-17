import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Shared body of the localized 404 — rendered by both `[locale]/not-found`
 *  (bare, for session-gated groups) and `(public)/not-found` (inside the
 *  navbar/footer chrome). */
export async function NotFoundView() {
  const t = await getTranslations("NotFound");

  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-sm font-semibold tracking-widest text-primary" dir="ltr">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-bold text-balance sm:text-4xl">{t("title")}</h1>
      <p className="mt-4 text-base text-pretty text-muted-foreground">{t("description")}</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/" className={cn(buttonVariants({ size: "lg" }), "px-4")}>
          {t("home")}
        </Link>
        <Link href="/courses" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-4")}>
          {t("courses")}
        </Link>
      </div>
    </section>
  );
}
