import type { Country } from "@/types/country";

// Stand-in for a future `countries` reference table — MENA-first, matching
// Bosla's primary market, with "Other" as a catch-all rather than
// enumerating every country up front.
export const countriesMock: Country[] = [
  { id: "eg", label: { en: "Egypt", ar: "مصر" } },
  { id: "sa", label: { en: "Saudi Arabia", ar: "المملكة العربية السعودية" } },
  { id: "ae", label: { en: "United Arab Emirates", ar: "الإمارات العربية المتحدة" } },
  { id: "kw", label: { en: "Kuwait", ar: "الكويت" } },
  { id: "qa", label: { en: "Qatar", ar: "قطر" } },
  { id: "bh", label: { en: "Bahrain", ar: "البحرين" } },
  { id: "om", label: { en: "Oman", ar: "عُمان" } },
  { id: "jo", label: { en: "Jordan", ar: "الأردن" } },
  { id: "lb", label: { en: "Lebanon", ar: "لبنان" } },
  { id: "iq", label: { en: "Iraq", ar: "العراق" } },
  { id: "ma", label: { en: "Morocco", ar: "المغرب" } },
  { id: "tn", label: { en: "Tunisia", ar: "تونس" } },
  { id: "dz", label: { en: "Algeria", ar: "الجزائر" } },
  { id: "ly", label: { en: "Libya", ar: "ليبيا" } },
  { id: "sd", label: { en: "Sudan", ar: "السودان" } },
  { id: "ps", label: { en: "Palestine", ar: "فلسطين" } },
  { id: "ye", label: { en: "Yemen", ar: "اليمن" } },
  { id: "other", label: { en: "Other", ar: "دولة أخرى" } },
];
