import { useMemo } from "react";
import { useWatch, type Control, type FieldValues } from "react-hook-form";

/**
 * RHF's own `formState.isDirty` has a known inconsistency for forms using
 * `useFieldArray` with deeply nested array items: `dirtyFields` correctly
 * stays `{}` on mount, but `isDirty` can read `true` anyway (observed here
 * on Hero's three field arrays). Computing dirty state as a direct
 * current-vs-baseline value comparison sidesteps that internal state
 * entirely — every section form (and SEO) uses this one hook instead of
 * `formState.isDirty`, so dirty detection is consistent everywhere rather
 * than "trust RHF except where it's wrong."
 */
export function useContentDirty<T extends FieldValues>(control: Control<T>, baseline: T): boolean {
  const watched = useWatch({ control });
  return useMemo(() => JSON.stringify(watched) !== JSON.stringify(baseline), [watched, baseline]);
}
