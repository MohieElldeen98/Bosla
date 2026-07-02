/** Reads a possibly-nested RHF error (`"eyebrow.en"`, `"items.0.label.en"`)
 *  without needing a typed path per call site — every shared field
 *  component in this folder is generic over section-content shape, so a
 *  strictly-typed error path isn't practical here (the type safety that
 *  matters lives in each section form's own `useForm<XContent>()` +
 *  `zodResolver`). Takes the RHF `errors` object as plain unknown data —
 *  it's read-only, runtime traversal, never assigned to a typed variable. */
export function getFieldError(errors: object, path: string): string | undefined {
  const segments = path.split(".");
  let current: unknown = errors;
  for (const segment of segments) {
    if (current && typeof current === "object" && segment in current) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  if (current && typeof current === "object" && "message" in current) {
    const message = (current as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

export function generateItemId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
