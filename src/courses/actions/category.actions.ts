"use server";

import { CategoryService } from "@/courses/services/category.service";
import { createCategorySchema, updateCategorySchema } from "@/courses/validators/category.validator";
import type { Category } from "@/courses/types/category";
import type { CourseActionResult } from "@/courses/types/result";

export async function createCategoryAction(rawInput: unknown): Promise<CourseActionResult<Category>> {
  const parsed = createCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CategoryService.create(parsed.data);
}

export async function updateCategoryAction(
  id: string,
  rawInput: unknown,
): Promise<CourseActionResult<Category>> {
  const parsed = updateCategorySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CategoryService.update(id, parsed.data);
}

export async function deleteCategoryAction(id: string): Promise<CourseActionResult> {
  return CategoryService.delete(id);
}
