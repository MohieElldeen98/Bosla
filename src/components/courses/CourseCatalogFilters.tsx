"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURSE_LANGUAGES } from "@/courses/types/course-language";
import { COURSE_LEVELS } from "@/courses/types/course-level";
import { PUBLIC_COURSE_SORT_FIELDS } from "@/courses/validators/course.validator";
import type { PublicSearchCoursesInput } from "@/courses/validators/course.validator";
import type { ResolvedCategory } from "@/courses/types/category";
import type { ResolvedSpecialty } from "@/courses/types/specialty";

const ALL = "all";

/**
 * The public catalog's search/filter/sort bar (`/courses`, Step 3.4) —
 * same URL-search-param-driven approach as the Admin Course Management
 * listing's `CoursesManager` (Step 3.2): every change is a real
 * server-round-trip via `router.push`, not client-side filtering of an
 * already-fetched page, so results stay paginated and shareable/
 * bookmarkable. Kept as its own component (not a reuse of
 * `CoursesManager`) since the two have almost no filters in common
 * (Status/Instructor here vs. Language/Difficulty/Featured there) and a
 * completely different visual language.
 */
export function CourseCatalogFilters({
  filters,
  specialties,
  categories,
  labels,
}: {
  filters: PublicSearchCoursesInput;
  specialties: ResolvedSpecialty[];
  categories: ResolvedCategory[];
  labels: {
    searchPlaceholder: string;
    allSpecialties: string;
    allCategories: string;
    allLanguages: string;
    allDifficulties: string;
    featuredOnly: string;
    sortLabel: string;
    sort: Record<(typeof PUBLIC_COURSE_SORT_FIELDS)[number], string>;
    language: Record<string, string>;
    difficulty: Record<string, string>;
  };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchValue, setSearchValue] = useState(filters.query ?? "");

  useEffect(() => {
    setSearchValue(filters.query ?? "");
  }, [filters.query]);

  function updateParams(updates: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    const query = next.toString();
    router.push(query ? `/courses?${query}` : "/courses", { scroll: false });
  }

  useEffect(() => {
    if (searchValue === (filters.query ?? "")) return;
    const timeout = setTimeout(() => updateParams({ q: searchValue || undefined }), 350);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const sortValue = filters.sortBy
    ? `${filters.sortBy}:${filters.sortDirection ?? "desc"}`
    : "createdAt:desc";

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 start-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="search"
          placeholder={labels.searchPlaceholder}
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
          className="ps-9"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.specialtyId ?? ALL}
          onValueChange={(value) => updateParams({ specialtyId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={labels.allSpecialties} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{labels.allSpecialties}</SelectItem>
            {specialties.map((specialty) => (
              <SelectItem key={specialty.id} value={specialty.id}>
                {specialty.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.categoryId ?? ALL}
          onValueChange={(value) => updateParams({ categoryId: value && value !== ALL ? value : undefined })}
        >
          <SelectTrigger size="sm">
            <SelectValue placeholder={labels.allCategories} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{labels.allCategories}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.language ?? ALL}
          onValueChange={(value) => updateParams({ language: value && value !== ALL ? value : undefined })}
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
          value={filters.level ?? ALL}
          onValueChange={(value) => updateParams({ level: value && value !== ALL ? value : undefined })}
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

        <label className="flex items-center gap-2 rounded-lg border border-input px-2.5 py-1.5 text-sm">
          <Checkbox
            checked={!!filters.featured}
            onCheckedChange={(checked) => updateParams({ featured: checked ? "true" : undefined })}
          />
          <Label className="cursor-pointer font-normal">{labels.featuredOnly}</Label>
        </label>

        <Select
          value={sortValue}
          onValueChange={(value) => {
            if (!value) return;
            const [sortBy, sortDirection] = value.split(":");
            updateParams({ sortBy, sortDir: sortDirection });
          }}
        >
          <SelectTrigger size="sm" className="ms-auto">
            <SelectValue placeholder={labels.sortLabel} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt:desc">{labels.sort.createdAt}</SelectItem>
            <SelectItem value="price:asc">{`${labels.sort.price} ↑`}</SelectItem>
            <SelectItem value="price:desc">{`${labels.sort.price} ↓`}</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
