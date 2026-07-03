"use server";

import { ModuleService } from "@/learning/services/module.service";
import { createModuleSchema, updateModuleSchema } from "@/learning/validators/module.validator";
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
