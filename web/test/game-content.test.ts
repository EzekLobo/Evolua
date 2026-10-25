import { describe, expect, it } from "vitest";
import {
  buildGamePackPrompt,
  builtInGamePack,
  gamePackSchema,
  summarizePack,
} from "../src/lib/game-content";

const validPack = {
  schema: "evolua-game-pack",
  version: 1,
  id: "historia-brasil",
  title: "História do Brasil",
  description: "Uma revisão dos acontecimentos essenciais.",
  modules: [
    {
      id: "brasil-colonia",
      title: "Brasil Colônia",
      description: "Conceitos introdutórios do período colonial.",
      pairs: [
        {
          id: "par-capitanias",
          prompt: "Capitanias hereditárias",
          answer: "Faixas de terra administradas por donatários",
          explanation: "A Coroa delegava administração e exploração.",
        },
        {
          id: "par-governo-geral",
          prompt: "Governo-Geral",
          answer: "Centralização da administração colonial",
          explanation: "Foi criado para coordenar a colônia.",
        },
      ],
      trueFalse: [
        {
          id: "vf-salvador",
          statement: "Salvador foi a primeira capital do Brasil.",
          answer: true,
          explanation: "Salvador tornou-se a capital em 1549.",
        },
      ],
      multipleChoice: [
        {
          id: "quiz-capital",
          question: "Qual foi a primeira capital do Brasil?",
          options: ["Salvador", "Recife", "São Paulo", "Brasília"],
          correctOptionIndex: 0,
          explanation: "Salvador sediou o Governo-Geral a partir de 1549.",
        },
      ],
    },
  ],
};

describe("modular game packs", () => {
  it("validates a complete v1 package and summarizes its games", () => {
    const pack = gamePackSchema.parse(validPack);
    expect(summarizePack(pack)).toEqual({
      pairs: 2,
      trueFalse: 1,
      multipleChoice: 1,
    });
  });

  it("turns the original course into a playable package", () => {
    expect(builtInGamePack.modules).toHaveLength(4);
    const totals = summarizePack(builtInGamePack);
    expect(totals.pairs).toBe(43);
    expect(totals.trueFalse).toBe(0);
    expect(totals.multipleChoice).toBe(28);
  });

  it("rejects duplicate IDs, duplicate pair answers and invalid choices", () => {
    const duplicateId = structuredClone(validPack);
    duplicateId.modules[0].trueFalse[0].id = "par-capitanias";
    expect(gamePackSchema.safeParse(duplicateId).success).toBe(false);

    const duplicateAnswer = structuredClone(validPack);
    duplicateAnswer.modules[0].pairs[1].answer =
      duplicateAnswer.modules[0].pairs[0].answer;
    expect(gamePackSchema.safeParse(duplicateAnswer).success).toBe(false);

    const invalidChoice = structuredClone(validPack);
    invalidChoice.modules[0].multipleChoice[0].correctOptionIndex = 9;
    expect(gamePackSchema.safeParse(invalidChoice).success).toBe(false);
  });

  it("generates a self-contained prompt that requests only importable JSON", () => {
    const prompt = buildGamePackPrompt({
      subject: "Fotossíntese",
      audience: "Ensino médio",
      objective: "Relacionar etapas e reagentes",
      difficulty: "intermediário",
      itemCount: 6,
    });
    expect(prompt).toContain("ASSUNTO / MATERIAL-BASE: Fotossíntese");
    expect(prompt).toContain('schema "evolua-game-pack"');
    expect(prompt).toContain("Responda SOMENTE com JSON válido");
    expect(prompt).toContain("6 itens em pairs");
  });
});
