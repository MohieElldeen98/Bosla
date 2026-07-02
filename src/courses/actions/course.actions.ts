"use server";

import { CourseService } from "@/courses/services/course.service";
import { createCourseSchema, updateCourseSchema } from "@/courses/validators/course.validator";
import type { Course } from "@/courses/types/course";
import type { CourseActionResult } from "@/courses/types/result";

export async function createCourseAction(rawInput: unknown): Promise<CourseActionResult<Course>> {
  const parsed = createCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseService.create(parsed.data);
}

export async function updateCourseAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<CourseActionResult<Course>> {
  const parsed = updateCourseSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return CourseService.update(id, parsed.data, expectedUpdatedAt);
}

export async function deleteCourseAction(id: string): Promise<CourseActionResult> {
  return CourseService.delete(id);
}

export async function archiveCourseAction(id: string): Promise<CourseActionResult<Course>> {
  return CourseService.archive(id);
}

export async function restoreCourseAction(id: string): Promise<CourseActionResult<Course>> {
  return CourseService.restore(id);
}

export async function attachSeoMetaAction(id: string): Promise<CourseActionResult<Course>> {
  return CourseService.attachSeoMeta(id);
}
