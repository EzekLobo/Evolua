import { exampleGamePack, gamePackSchema } from "../src/lib/game-content";
const pack = structuredClone(exampleGamePack);
pack.title = "Matemática de teste";
pack.modules[0].pairs = [
  {
    id: "pair-four",
    prompt: "2 + 2",
    answer: "4",
    explanation: "Duas unidades mais duas totalizam quatro.",
    objectiveId: "obj-somar",
    sourceIds: ["fonte-aula"],
  },
  {
    id: "pair-five",
    prompt: "2 + 3",
    answer: "5",
    explanation: "Duas unidades mais três totalizam cinco.",
    objectiveId: "obj-somar",
    sourceIds: ["fonte-aula"],
  },
];
pack.modules[0].trueFalse = [
  {
    id: "truth-four",
    statement: "2 + 2 é igual a 4.",
    answer: true,
    explanation: "A soma é quatro.",
    objectiveId: "obj-somar",
    sourceIds: ["fonte-aula"],
  },
  {
    id: "false-five",
    statement: "2 + 2 é igual a 5.",
    answer: false,
    explanation: "A soma é quatro, não cinco.",
    objectiveId: "obj-somar",
    sourceIds: ["fonte-aula"],
  },
];
export const testGamePack = gamePackSchema.parse(pack);
