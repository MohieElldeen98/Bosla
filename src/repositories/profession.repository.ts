import { professionsMock } from "@/mock/professions.mock";
import type { Profession } from "@/types/profession";

export const ProfessionRepository = {
  async findAll(): Promise<Profession[]> {
    return professionsMock;
  },
};
