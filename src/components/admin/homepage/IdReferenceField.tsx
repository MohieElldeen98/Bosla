"use client";

import type { FieldErrors, FieldValues, UseFormRegister } from "react-hook-form";
import { PlainTextField } from "@/components/admin/homepage/PlainTextField";

/**
 * A temporary stand-in for course/instructor/image selection — Step 6.4
 * explicitly scopes out building a Media Library, Media Picker, Course
 * Selector, or Instructor Selector; those are future-roadmap steps. Until
 * then, any reference is just its raw database ID, typed directly and
 * validated server-side like any other field — no picker, no preview.
 */
export function IdReferenceField<T extends FieldValues>(props: {
  id: string;
  label: string;
  name: string;
  register: UseFormRegister<T>;
  errors?: FieldErrors<T>;
  hint: string;
}) {
  return <PlainTextField {...props} placeholder="00000000-0000-0000-0000-000000000000" />;
}
