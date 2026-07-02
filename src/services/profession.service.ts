import type { Locale } from "@/i18n/routing";
import { ProfessionRepository } from "@/repositories/profession.repository";
import type { ResolvedProfession } from "@/types/profession";

export const ProfessionService = {
  async getAll(locale: Locale): Promise<ResolvedProfession[]> {
    const professions = await ProfessionRepository.findAll();
    return professions.map((profession) => ({
      id: profession.id,
      label: profession.label[locale],
    }));
  },
};
