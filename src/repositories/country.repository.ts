import { countriesMock } from "@/mock/countries.mock";
import type { Country } from "@/types/country";

export const CountryRepository = {
  async findAll(): Promise<Country[]> {
    return countriesMock;
  },
};
