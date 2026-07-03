"use server";

import { SessionService } from "@/auth/services/session.service";
import { ModuleService } from "@/learning/services/module.service";
import {
  createModuleSchema,
  updateModuleSchema,
  reorderModulesSchema,
} from "@/learning/validators/module.validator";
import type { Module } from "@/learning/types/module";
import type { LearningActionResult } from "@/learning/types/result";

export async function createModuleAction(rawInput: unknown): Promise<LearningActionResult<Module>> {
  const parsed = createModuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ModuleService.create(parsed.data);
}

export async function updateModuleAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Module>> {
  const parsed = updateModuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ModuleService.update(id, parsed.data, expectedUpdatedAt);
}

export async function deleteModuleAction(id: string): Promise<LearningActionResult> {
  return ModuleService.delete(id);
}

/** The Curriculum Builder's own Server Actions (Phase 6, Step 6.4) —
 *  each resolves the session itself, same reasoning as Step 6.3's
 *  `createOwnCourseAction`: `ModuleService`'s Instructor-owned methods
 *  need an explicit `actingUser` to enforce ownership. */
export async function createOwnModuleAction(rawInput: unknown): Promise<LearningActionResult<Module>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = createModuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ModuleService.createOwn(actingUser, parsed.data);
}

export async function updateOwnModuleAction(
  id: string,
  rawInput: unknown,
  expectedUpdatedAt?: string,
): Promise<LearningActionResult<Module>> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = updateModuleSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ModuleService.updateOwn(actingUser, id, parsed.data, expectedUpdatedAt);
}

export async function deleteOwnModuleAction(id: string): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  return ModuleService.deleteOwn(actingUser, id);
}

export async function reorderOwnModulesAction(rawInput: unknown): Promise<LearningActionResult> {
  const actingUser = await SessionService.getCurrentUser();
  if (!actingUser) {
    return { success: false, code: "forbidden", message: "You must be signed in." };
  }
  const parsed = reorderModulesSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      code: "validation_failed",
      message: parsed.error.issues.map((issue) => issue.message).join(" "),
    };
  }
  return ModuleService.reorderOwn(actingUser, parsed.data.courseId, parsed.data.moduleIds);
}
