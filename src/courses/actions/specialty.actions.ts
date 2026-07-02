"use server";

import { SpecialtyService } from "@/courses/services/specialty.service";
import { createSpecialtySchema, updateSpecialtySchema } from "@/courses/validators/specialty.validator";
import type { CourseActionResult } from "@/courses/types/result";
import type { Specialty } from "@/courses/types/specialty";

export async function createSpecialtyAction(rawInput: unknown): Promise<CourseActionResult<Specialty>> {
  const parsed = createSpecialtySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return SpecialtyService.create(parsed.data);
}

export async function updateSpecialtyAction(
  id: string,
  rawInput: unknown,
): Promise<CourseActionResult<Specialty>> {
  const parsed = updateSpecialtySchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return SpecialtyService.update(id, parsed.data);
}

export async function deleteSpecialtyAction(id: string): Promise<CourseActionResult> {
  return SpecialtyService.delete(id);
}
