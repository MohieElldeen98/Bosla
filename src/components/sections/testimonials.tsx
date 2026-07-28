import { getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { testimonialsMeta } from "@/data/testimonials";
import type { TestimonialContent } from "@/types/testimonial";
import type { ResolvedTestimonialsSectionContent } from "@/cms/types/section";

export async function Testimonials({ content }: { content: ResolvedTestimonialsSectionContent }) {
  const t = await getTranslations("Testimonials");
  const items = t.raw("items") as TestimonialContent[];
  const testimonials = items.map((item, index) => ({
    ...item,
    ...testimonialsMeta[index],
  }));

  return (
    <section className="border-t border-border bg-muted/30">
      <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {content.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {content.title}
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Reveal
              key={testimonial.name}
              style={{ "--reveal-delay": `${index * 0.08}s` } as React.CSSProperties}
              className="h-full"
            >
              <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
                <div
                  className="flex items-center gap-0.5"
                  aria-label={t("ratingAriaLabel", { rating: testimonial.rating })}
                >
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      aria-hidden="true"
                      className={`size-4 ${
                        starIndex < Math.round(testimonial.rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>

                <blockquote className="mt-4 flex-1 text-sm text-foreground">
                  &ldquo;{testimonial.quote}&rdquo;
                </blockquote>

                <figcaption className="mt-6 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground"
                  >
                    {testimonial.avatarInitials}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.role}
                    </p>
                  </div>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
