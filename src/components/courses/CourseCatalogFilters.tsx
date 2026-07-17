"use client";

import { useState } from "react";
import { Filter, Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import type { PublicSearchCoursesInput } from "@/courses/validators/course.validator";
import type { ResolvedCategory } from "@/courses/types/category";
import type { ResolvedSpecialty } from "@/courses/types/specialty";

const ALL = "all";

type Labels = {
  searchPlaceholder: string;
  searchLabel: string;
  allCategories: string;
  allLanguages: string;
  allDifficulties: string;
  allPrices: string;
  free: string;
  paid: string;
  filters: string;
  apply: string;
  reset: string;
  sortLabel: string;
  sort: Record<string, string>;
  language: Record<string, string>;
  difficulty: Record<string, string>;
};

function FilterSelects({
  filters,
  categories,
  labels,
  onChange,
}: {
  filters: PublicSearchCoursesInput;
  categories: ResolvedCategory[];
  labels: Labels;
  onChange: (updates: Record<string, string | undefined>) => void;
}) {
  const selectedCategories = filters.specialtyId
    ? categories.filter(
        (category) =>
          category.specialtyId === null || category.specialtyId === filters.specialtyId,
      )
    : [];
  const select = (update: Record<string, string | undefined>) => onChange(update);

  return (
    <>
      {filters.specialtyId && (
        <Select
          value={filters.categoryId ?? ALL}
          onValueChange={(value) =>
            select({ categoryId: !value || value === ALL ? undefined : value })
          }
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={labels.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{labels.allCategories}</SelectItem>
            {selectedCategories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select
        value={filters.level ?? ALL}
        onValueChange={(value) => select({ level: !value || value === ALL ? undefined : value })}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder={labels.allDifficulties} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.allDifficulties}</SelectItem>
          {COURSE_LEVELS.map((level) => (
            <SelectItem key={level} value={level}>
              {labels.difficulty[level]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.language ?? ALL}
        onValueChange={(value) =>
          select({ language: !value || value === ALL ? undefined : value })
        }
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder={labels.allLanguages} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.allLanguages}</SelectItem>
          {COURSE_LANGUAGES.map((language) => (
            <SelectItem key={language} value={language}>
              {labels.language[language]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.price ?? ALL}
        onValueChange={(value) => select({ price: !value || value === ALL ? undefined : value })}
      >
        <SelectTrigger size="sm">
          <SelectValue placeholder={labels.allPrices} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{labels.allPrices}</SelectItem>
          <SelectItem value="free">{labels.free}</SelectItem>
          <SelectItem value="paid">{labels.paid}</SelectItem>
        </SelectContent>
      </Select>
    </>
  );
}

export function CourseCatalogSearchForm({
  initialQuery,
  placeholder,
  label,
}: {
  initialQuery: string;
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialQuery);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/courses?${query}` : "/courses");
  }

  return (
    <form onSubmit={submit} role="search" className="relative">
      <Input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="h-14 rounded-2xl bg-background ps-5 pe-14 text-base shadow-sm"
      />
      <button
        type="submit"
        aria-label={label}
        className="absolute end-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      >
        <Search aria-hidden="true" className="size-5" />
      </button>
    </form>
  );
}

export function CourseCatalogFilters({
  filters,
  categories,
  labels,
}: {
  filters: PublicSearchCoursesInput;
  categories: ResolvedCategory[];
  labels: Labels;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/courses?${query}` : "/courses", { scroll: false });
  }

  function reset() {
    router.push("/courses", { scroll: false });
  }

  const sortValue = filters.sortBy
    ? `${filters.sortBy}:${filters.sortDirection ?? "desc"}`
    : "createdAt:desc";
  const activeCount = [filters.categoryId, filters.level, filters.language, filters.price].filter(
    Boolean,
  ).length;
  const sort = (
    <Select
      value={sortValue}
      onValueChange={(value) => {
        if (!value) return;
        const [sortBy, sortDirection] = value.split(":");
        updateParams({ sortBy, sortDir: sortDirection });
      }}
    >
      <SelectTrigger size="sm">
        <SelectValue placeholder={labels.sortLabel} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="createdAt:desc">{labels.sort.createdAt}</SelectItem>
        <SelectItem value="price:asc">{labels.sort.priceLow}</SelectItem>
        <SelectItem value="price:desc">{labels.sort.priceHigh}</SelectItem>
        <SelectItem value="estimatedDurationMinutes:asc">
          {labels.sort.estimatedDurationMinutes}
        </SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <>
      <div className="hidden items-center gap-2 md:flex">
        <FilterSelects
          filters={filters}
          categories={categories}
          labels={labels}
          onChange={updateParams}
        />
        <div className="ms-auto">{sort}</div>
      </div>
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" className="relative">
                <Filter aria-hidden="true" className="size-4" />
                {labels.filters}
                {activeCount > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </Button>
            }
          />
          <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>{labels.filters}</SheetTitle>
            </SheetHeader>
            <div className="grid gap-3 overflow-y-auto px-4">
              <FilterSelects
                filters={filters}
                categories={categories}
                labels={labels}
                onChange={updateParams}
              />
            </div>
            <SheetFooter>
              <SheetClose render={<Button className="w-full" />}>
                {labels.apply}
              </SheetClose>
              <Button variant="outline" onClick={reset}>
                {labels.reset}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <div className="ms-auto">{sort}</div>
      </div>
    </>
  );
}

export function ResetCatalogButton({ label }: { label: string }) {
  const router = useRouter();
  return (
    <Button variant="outline" onClick={() => router.push("/courses")}>
      {label}
    </Button>
  );
}

export function SpecialtyChips({
  specialties,
  activeId,
  allLabel,
}: {
  specialties: ResolvedSpecialty[];
  activeId?: string;
  allLabel: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(id?: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (id) next.set("specialtyId", id);
    else next.delete("specialtyId");
    next.delete("categoryId");
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/courses?${query}` : "/courses", { scroll: false });
  }

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-1 lg:-mx-8 lg:px-8">
      <div className="flex min-w-max gap-2">
        <button
          type="button"
          onClick={() => select()}
          aria-current={!activeId ? "page" : undefined}
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
            !activeId
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-muted/40 text-foreground hover:border-primary/40"
          }`}
        >
          {allLabel}
        </button>
        {specialties.map((specialty) => (
          <button
            type="button"
            key={specialty.id}
            onClick={() => select(specialty.id)}
            aria-current={activeId === specialty.id ? "page" : undefined}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              activeId === specialty.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-muted/40 text-foreground hover:border-primary/40"
            }`}
          >
            {specialty.name}
          </button>
        ))}
      </div>
    </div>
  );
}
