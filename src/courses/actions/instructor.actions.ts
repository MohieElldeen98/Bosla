"use server";

import { CourseInstructorService } from "@/courses/services/instructor.service";
import { createInstructorSchema, updateInstructorSchema } from "@/courses/validators/instructor.validator";
import type { CourseActionResult } from "@/courses/types/result";
import type { Instructor } from "@/courses/types/instructor";

export async function createInstructorAction(rawInput: unknown): Promise<CourseActionResult<Instructor>> {
  const parsed = createInstructorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseInstructorService.create(parsed.data);
}

export async function updateInstructorAction(
  id: string,
  rawInput: unknown,
): Promise<CourseActionResult<Instructor>> {
  const parsed = updateInstructorSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseInstructorService.update(id, parsed.data);
}

export async function deleteInstructorAction(id: string): Promise<CourseActionResult> {
  return CourseInstructorService.delete(id);
}
