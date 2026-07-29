"use client";

import Image from "next/image";
import { Card, Avatar } from "@heroui/react";
import { BookOpen } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { getInitials } from "@/auth/utils/display-name";

/** Paymob approval hotfix: guest-facing prices always display in EGP,
 *  regardless of a course's stored `currency` — matches `PriceBlock`'s
 *  own formatting exactly (see that component's note). */
function formatPrice(amount: string, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EGP" }).format(Number(amount));
}

interface CourseCardData {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  instructorName: string;
  instructorAvatarUrl: string | null;
  isFree: boolean;
  price: string;
}

export function CoursesSectionClient({
  courses,
  locale,
  eyebrow,
  title,
  viewAllLabel,
  freeLabel,
}: {
  courses: CourseCardData[];
  locale: string;
  eyebrow: string;
  title: string;
  viewAllLabel: string;
  freeLabel: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-accent">{eyebrow}</p>
          <h2 className="mt-2 text-3xl font-bold text-foreground">{title}</h2>
        </div>
        <Link href="/courses" className="hidden shrink-0 text-sm font-medium text-accent hover:underline sm:inline-block">
          {viewAllLabel}
        </Link>
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <Card
            key={course.id}
            render={(props) => (
              <Link {...(props as React.ComponentPropsWithoutRef<typeof Link>)} href={`/courses/${course.slug}`} />
            )}
          >
            {course.coverImageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-t-[inherit]">
                <Image
                  src={course.coverImageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <span className="flex aspect-video w-full items-center justify-center bg-accent/10 text-accent">
                <BookOpen aria-hidden="true" className="size-8" />
              </span>
            )}
            <Card.Header>
              <Card.Title className="line-clamp-2">{course.title}</Card.Title>
            </Card.Header>
            <Card.Content className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Avatar className="size-6 text-[10px]">
                  <Avatar.Image src={course.instructorAvatarUrl ?? undefined} alt="" />
                  <Avatar.Fallback>{getInitials(course.instructorName)}</Avatar.Fallback>
                </Avatar>
                {course.instructorName}
              </span>
              <span className="font-semibold text-foreground">
                {course.isFree ? freeLabel : formatPrice(course.price, locale)}
              </span>
            </Card.Content>
          </Card>
        ))}
      </div>
      <Link href="/courses" className="mt-8 block text-center text-sm font-medium text-accent hover:underline sm:hidden">
        {viewAllLabel}
      </Link>
    </section>
  );
}
