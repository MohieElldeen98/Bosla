import type { Locale } from "@/i18n/routing";
import { CountryRepository } from "@/repositories/country.repository";
import type { ResolvedCountry } from "@/types/country";

export const CountryService = {
  async getAll(locale: Locale): Promise<ResolvedCountry[]> {
    const countries = await CountryRepository.findAll();
    return countries.map((country) => ({
      id: country.id,
      label: country.label[locale],
    }));
  },
};
