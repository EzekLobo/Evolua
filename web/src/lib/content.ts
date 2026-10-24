import raw from "../../content/metodologia.json";
import { contentSchema } from "./content-schema";
export const content = contentSchema.parse(raw);
export const course = {
  id: "metodologia",
  title: "Metodologia Científica",
  description: "Do pensamento científico à sua próxima conquista.",
  area: "Ciência & pesquisa",
};
