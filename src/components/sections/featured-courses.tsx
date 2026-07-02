"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { ArrowRight, BookOpen, Clock, Star, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { featuredCourses } from "@/data/courses";
import { getCategoryIcon } from "@/lib/course-category";
import type { ResolvedFeaturedCoursesSectionContent } from "@/cms/types/section";

const numberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const ALL = "All";

export function FeaturedCourses({ content }: { content: ResolvedFeaturedCoursesSectionContent }) {
  const t = useTranslations("FeaturedCourses");
  const tCategory = useTranslations("CourseCategory");
  const tLevel = useTranslations("CourseLevel");
  const tTag = useTranslations("CourseTag");
  const [activeCategory, setActiveCategory] = useState(ALL);

  const categories = useMemo(
    () => [
      ALL,
      ...Array.from(new Set(featuredCourses.map((course) => course.category))),
    ],
    [],
  );

  const visibleCourses = useMemo(
    () =>
      activeCategory === ALL
        ? featuredCourses
        : featuredCourses.filter(
            (course) => course.category === activeCategory,
          ),
    [activeCategory],
  );

  return (
    <section id="courses" className="mx-auto max-w-7xl px-6 py-24 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {content.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            {content.title}
          </h2>
          <p className="mt-3 max-w-xl text-muted-foreground">
            {content.subtitle}
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link href="/#courses" />}>
          {t("viewAll")}
          <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
        </Button>
      </div>

      <div
        role="group"
        aria-label={t("filterAriaLabel")}
        className="mt-10 flex flex-wrap gap-2"
      >
        {categories.map((category) => {
          const isActive = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {category === ALL ? t("allCategoriesLabel") : tCategory(category)}
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {visibleCourses.map((course, index) => {
            const CategoryIcon = getCategoryIcon(course.category);
            const discount = course.originalPrice
              ? Math.round(
                  ((course.originalPrice - course.price) /
                    course.originalPrice) *
                    100,
                )
              : null;

            return (
              <motion.div
                key={course.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, delay: (index % 3) * 0.06 }}
              >
                <Card className="h-full py-0 transition-shadow hover:shadow-lg">
                  <div
                    className={`relative flex h-40 items-end overflow-hidden bg-gradient-to-br p-4 ${course.imageGradient}`}
                  >
                    <CategoryIcon
                      aria-hidden="true"
                      className="absolute -end-4 -bottom-4 size-28 text-white/15"
                    />
                    <div className="absolute top-4 start-4 flex items-center gap-2">
                      <Badge className="border-none bg-white/90 text-foreground">
                        {tCategory(course.category)}
                      </Badge>
                      {course.tag && (
                        <Badge className="border-none bg-neutral-950/80 text-white">
                          {tTag(course.tag)}
                        </Badge>
                      )}
                    </div>
                    <span className="absolute top-4 end-4 rounded-full bg-black/30 px-2.5 py-1 text-xs font-medium text-white">
                      {tLevel(course.level)}
                    </span>
                  </div>

                  <CardHeader className="pt-5" dir="ltr">
                    <CardTitle className="text-start text-lg leading-snug">
                      {course.title}
                    </CardTitle>
                    <CardDescription className="text-start line-clamp-2">
                      {course.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="flex flex-1 flex-col gap-4 pb-5">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="flex size-7 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {course.instructor.avatarInitials}
                      </span>
                      <span dir="ltr" className="text-muted-foreground">
                        {course.instructor.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Star className="size-4 fill-amber-400 text-amber-400" />
                        <span className="font-medium text-foreground">
                          {course.rating}
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-4" />
                        {numberFormatter.format(course.studentCount)}{" "}
                        {t("studentsSuffix")}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="size-4" />
                        {course.lessonCount}
                      </span>
                    </div>

                    <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-semibold">
                          ${course.price}
                        </span>
                        {course.originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            ${course.originalPrice}
                          </span>
                        )}
                        {discount && (
                          <span className="text-xs font-medium text-emerald-600">
                            -{discount}%
                          </span>
                        )}
                      </div>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        {course.durationHours}h
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}
