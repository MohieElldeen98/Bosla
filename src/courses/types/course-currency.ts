/**
 * The currencies a course may be priced in — the frozen UX spec's §10
 * decision: EGP and USD supported, EGP the default, one currency per
 * course (no runtime FX conversion). The editor offers exactly this set;
 * the schema's `currency` column stays free-text for forward compatibility.
 */
export const COURSE_CURRENCIES = ["EGP", "USD"] as const;
export type CourseCurrency = (typeof COURSE_CURRENCIES)[number];
export const DEFAULT_COURSE_CURRENCY: CourseCurrency = "EGP";
