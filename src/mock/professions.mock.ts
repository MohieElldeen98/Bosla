import type { Profession } from "@/types/profession";

// Stand-in for a future `professions` reference table. Sign Up's Profession
// field reads from here via ProfessionRepository/ProfessionService — never
// hardcoded in the form component — so adding a profession later is a data
// change, not a UI change.
export const professionsMock: Profession[] = [
  { id: "physiotherapist", label: { en: "Physiotherapist", ar: "أخصائي علاج طبيعي" } },
  { id: "nutritionist", label: { en: "Nutritionist", ar: "أخصائي تغذية" } },
  { id: "student", label: { en: "Student", ar: "طالب" } },
  { id: "physician", label: { en: "Physician", ar: "طبيب" } },
  {
    id: "occupational-therapist",
    label: { en: "Occupational Therapist", ar: "أخصائي علاج وظيفي" },
  },
  { id: "speech-therapist", label: { en: "Speech Therapist", ar: "أخصائي تخاطب" } },
  { id: "other", label: { en: "Other", ar: "أخرى" } },
];
