import { z } from "zod";
import { content } from "./content";

export const PACK_LIMITS = {
  bytes: 1024 * 1024,
  shortText: 240,
  longText: 2000,
  modules: 20,
  items: 50,
  packs: 20,
} as const;
export const OFFICIAL_PACK_ID = "metodologia-cientifica";
export const normalizedText = (value: string) =>
  value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");

const idSchema = z
  .string()
  .trim()
  .min(2)
  .max(64)
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "Use apenas letras minúsculas, números e hífens no ID",
  );
const shortText = z.string().trim().min(1).max(PACK_LIMITS.shortText);
const longText = z.string().trim().min(1).max(PACK_LIMITS.longText);
const evidenceFields = {
  objectiveId: idSchema.optional(),
  sourceIds: z.array(idSchema).min(1).max(20).optional(),
};

export const pairGameItemSchema = z
  .object({
    id: idSchema,
    prompt: shortText,
    answer: shortText,
    explanation: longText,
    ...evidenceFields,
  })
  .strict();

export const trueFalseGameItemSchema = z
  .object({
    id: idSchema,
    statement: longText,
    answer: z.boolean(),
    explanation: longText,
    ...evidenceFields,
  })
  .strict();

export const choiceGameItemSchema = z
  .object({
    id: idSchema,
    question: longText,
    options: z.array(shortText).min(2).max(6),
    correctOptionIndex: z.number().int().nonnegative(),
    explanation: longText,
    optionExplanations: z.array(longText).min(2).max(6).optional(),
    ...evidenceFields,
  })
  .strict()
  .superRefine((item, ctx) => {
    if (item.correctOptionIndex >= item.options.length) {
      ctx.addIssue({
        code: "custom",
        message: "Índice da alternativa correta fora da lista",
        path: ["correctOptionIndex"],
      });
    }
    if (
      item.optionExplanations &&
      item.optionExplanations.length !== item.options.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Cada alternativa precisa de uma explicação",
        path: ["optionExplanations"],
      });
    }
    if (
      new Set(item.options.map(normalizedText)).size !== item.options.length
    ) {
      ctx.addIssue({
        code: "custom",
        message: "As alternativas não podem se repetir",
        path: ["options"],
      });
    }
  });

export const gameModuleSchema = z
  .object({
    id: idSchema,
    title: shortText,
    description: longText,
    objectives: z
      .array(z.object({ id: idSchema, description: longText }).strict())
      .min(1)
      .max(20)
      .optional(),
    difficulty: z.enum(["iniciante", "intermediário", "avançado"]).optional(),
    pairs: z.array(pairGameItemSchema).max(PACK_LIMITS.items),
    trueFalse: z.array(trueFalseGameItemSchema).max(PACK_LIMITS.items),
    multipleChoice: z.array(choiceGameItemSchema).max(PACK_LIMITS.items),
  })
  .strict()
  .superRefine((module, ctx) => {
    if (
      module.pairs.length < 2 &&
      module.trueFalse.length === 0 &&
      module.multipleChoice.length === 0
    ) {
      ctx.addIssue({
        code: "custom",
        message: "Inclua ao menos duas duplas ou uma pergunta no módulo",
      });
    }
    const answers = module.pairs.map((item) => normalizedText(item.answer));
    if (new Set(answers).size !== answers.length) {
      ctx.addIssue({
        code: "custom",
        message: "As respostas do jogo de pares precisam ser únicas",
        path: ["pairs"],
      });
    }
    const prompts = module.pairs.map((item) => normalizedText(item.prompt));
    if (new Set(prompts).size !== prompts.length) {
      ctx.addIssue({
        code: "custom",
        message: "Os conceitos do jogo de pares precisam ser únicos",
        path: ["pairs"],
      });
    }
  });

export const gamePackSchema = z
  .object({
    schema: z.literal("evolua-game-pack"),
    version: z.union([z.literal(1), z.literal(2)]),
    revision: z.number().int().positive().optional(),
    id: idSchema,
    title: shortText,
    description: longText,
    sources: z
      .array(
        z
          .object({
            id: idSchema,
            title: shortText,
            locator: shortText,
            excerpt: longText,
          })
          .strict(),
      )
      .min(1)
      .max(100)
      .optional(),
    modules: z.array(gameModuleSchema).min(1).max(PACK_LIMITS.modules),
  })
  .strict()
  .superRefine((pack, ctx) => {
    const ids = new Set<string>([pack.id]);
    const unique = (id: string, path: (string | number)[]) => {
      if (ids.has(id))
        ctx.addIssue({ code: "custom", message: `ID duplicado: ${id}`, path });
      ids.add(id);
    };
    const sourceIds = new Set(pack.sources?.map((source) => source.id));
    pack.sources?.forEach((source, i) =>
      unique(source.id, ["sources", i, "id"]),
    );
    if (pack.version === 2) {
      if (!pack.revision)
        ctx.addIssue({
          code: "custom",
          message: "Informe a revisão editorial",
          path: ["revision"],
        });
      if (!pack.sources?.length)
        ctx.addIssue({
          code: "custom",
          message: "Declare as fontes do material-base",
          path: ["sources"],
        });
    }
    pack.modules.forEach((module, m) => {
      unique(module.id, ["modules", m, "id"]);
      module.objectives?.forEach((objective, i) =>
        unique(objective.id, ["modules", m, "objectives", i, "id"]),
      );
      if (pack.version === 2) {
        if (!module.objectives?.length)
          ctx.addIssue({
            code: "custom",
            message: "Declare os objetivos do módulo",
            path: ["modules", m, "objectives"],
          });
        if (!module.difficulty)
          ctx.addIssue({
            code: "custom",
            message: "Informe a dificuldade",
            path: ["modules", m, "difficulty"],
          });
      }
      for (const kind of ["pairs", "trueFalse", "multipleChoice"] as const) {
        module[kind].forEach((item, i) => {
          const path = ["modules", m, kind, i];
          unique(item.id, [...path, "id"]);
          if (pack.version === 2 || item.objectiveId) {
            if (
              !module.objectives?.some(
                (objective) => objective.id === item.objectiveId,
              )
            )
              ctx.addIssue({
                code: "custom",
                message: "Objetivo ausente ou desconhecido",
                path: [...path, "objectiveId"],
              });
          }
          if (pack.version === 2 && !item.sourceIds?.length)
            ctx.addIssue({
              code: "custom",
              message: "Vincule uma fonte à atividade",
              path: [...path, "sourceIds"],
            });
          item.sourceIds?.forEach((id, s) => {
            if (!sourceIds.has(id))
              ctx.addIssue({
                code: "custom",
                message: "Fonte desconhecida",
                path: [...path, "sourceIds", s],
              });
          });
          if (
            pack.version === 2 &&
            kind === "multipleChoice" &&
            !("optionExplanations" in item && item.optionExplanations)
          )
            ctx.addIssue({
              code: "custom",
              message: "Explique cada alternativa",
              path: [...path, "optionExplanations"],
            });
        });
      }
    });
  });

export const gamePackCollectionSchema = z
  .array(gamePackSchema)
  .max(PACK_LIMITS.packs)
  .superRefine((packs, ctx) => {
    const ids = new Set<string>();
    packs.forEach((pack, i) => {
      if (pack.id === OFFICIAL_PACK_ID || ids.has(pack.id))
        ctx.addIssue({
          code: "custom",
          message: "ID reservado ou pacote duplicado",
          path: [i, "id"],
        });
      ids.add(pack.id);
    });
  });
export type GamePack = z.infer<typeof gamePackSchema>;
export type GameModule = z.infer<typeof gameModuleSchema>;
export type GameType = "pairs" | "trueFalse" | "multipleChoice";

const safeId = (value: string) =>
  value
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);

export const builtInGamePack: GamePack = gamePackSchema.parse({
  schema: "evolua-game-pack",
  version: 1,
  id: "metodologia-cientifica",
  title: "Metodologia Científica",
  description: "Jogos criados a partir do conteúdo original da Evolua.",
  modules: content.topics.map((topic) => {
    const cards = content.flashcards.filter(
      (card) => card.topicId === topic.id,
    );
    const quizzes = content.quizzes.filter((quiz) => quiz.topicId === topic.id);
    return {
      id: `mod-${safeId(topic.id)}`,
      title: topic.name,
      description: topic.description,
      pairs: cards.map((card) => ({
        id: `pair-${safeId(card.id)}`,
        prompt: card.front,
        answer: card.back,
        explanation: card.back,
      })),
      // Afirmações montadas por troca de respostas não garantem falsidade.
      // Até revisão editorial, este modo fica disponível nos pacotes importados.
      trueFalse: [],
      multipleChoice: quizzes.map((quiz) => ({
        id: `quiz-${safeId(quiz.id)}`,
        question: quiz.question,
        options: quiz.options,
        correctOptionIndex: quiz.correctOptionIndex,
        explanation: quiz.explanation,
      })),
    };
  }),
});

export type GamePromptOptions = {
  subject: string;
  audience: string;
  objective: string;
  difficulty: "iniciante" | "intermediário" | "avançado";
  itemCount: number;
};

export function buildGamePackPrompt(options: GamePromptOptions): string {
  const count = Math.min(12, Math.max(3, Math.round(options.itemCount)));
  return `Crie jogos educacionais para a Evolua usando o contrato evolua-game-pack v2.
ASSUNTO / MATERIAL-BASE: ${options.subject.trim() || "Solicite o material-base antes de gerar"}
PÚBLICO: ${options.audience.trim() || "Estudantes em geral"}
OBJETIVO: ${options.objective.trim() || "Consolidar conceitos essenciais"}
DIFICULDADE: ${options.difficulty}

Procedimento de qualidade: planeje a cobertura dos objetivos; gere as atividades; confira respostas contra o material-base; revise ambiguidades, distratores e explicações; valide a estrutura; corrija as falhas antes de responder. Não exponha raciocínio interno, devolva apenas os resultados finais verificáveis.
Use somente fatos sustentados pelo material fornecido. Se faltar evidência, solicite esclarecimento em vez de inventar fatos, fontes, páginas ou URLs. Não complete quantidades com conteúdo sem fundamento.
Crie de 1 a 6 módulos e, quando houver material suficiente, ${count} itens em pairs, ${count} em trueFalse e ${count} em multipleChoice por módulo.
Responda SOMENTE com JSON válido, sem Markdown. Se houver ferramentas de execução, confira JSON com parser e valide os limites; nunca alegue execução de ferramentas que não usou.

Regras do contrato:
- schema "evolua-game-pack", version 2 e revision inteiro positivo (revisão editorial).
- IDs únicos em TODO o arquivo, incluindo pacote, fontes, módulos, objetivos e atividades; 2 a 64 caracteres, somente letras minúsculas, números e hífens, começando por letra ou número. O ID "${OFFICIAL_PACK_ID}" é reservado.
- Máximo ${PACK_LIMITS.bytes} bytes, ${PACK_LIMITS.modules} módulos e ${PACK_LIMITS.items} itens de cada jogo por módulo.
- Títulos, prompts/respostas de pares, alternativas e localizadores: até ${PACK_LIMITS.shortText} caracteres. Descrições, enunciados, explicações e trechos: até ${PACK_LIMITS.longText} caracteres. Nenhum texto vazio.
- sources: de 1 a 100 fontes com id, title, locator (página/seção/URL realmente disponível), excerpt curto e fiel ao material.
- Cada módulo tem id, title, description, difficulty, objectives (1 a 20 objetos id/description) e listas pairs, trueFalse, multipleChoice. Use [] para jogo sem material suficiente. Módulo precisa de ao menos dois pares ou uma pergunta.
- Cada item tem id, objectiveId válido no módulo, sourceIds (1 a 20 IDs de fontes existentes) e explanation.
- pairs: prompt e answer distintos e não ambíguos em todo o módulo; associação única.
- trueFalse: statement com uma proposição clara e answer booleano; misture verdadeiras/falsas e corrija as falsas na explanation. Não crie falsas apenas trocando respostas aleatórias entre conceitos.
- multipleChoice: question, 2 a 6 options distintas (prefira 4), correctOptionIndex começando em zero e apontando para a única opção correta; optionExplanations com uma explicação por opção na mesma ordem.
- Vincule cada objetivo a atividades, evite duplicação e cubra diferentes níveis de compreensão.
- Conteúdo é texto, nunca HTML ou código executável. Autorrevisão não equivale a comprovação factual.

Exemplo completo estruturalmente válido (substitua pelo material solicitado):
${JSON.stringify(exampleGamePack, null, 2)}`;
}

export const exampleGamePack: GamePack = gamePackSchema.parse({
  schema: "evolua-game-pack",
  version: 2,
  revision: 1,
  id: "adicao-basica",
  title: "Adição",
  description: "Somar números inteiros.",
  sources: [
    {
      id: "fonte-aula",
      title: "Material-base fornecido",
      locator: "Seção: adição",
      excerpt: "Dois mais dois é quatro.",
    },
  ],
  modules: [
    {
      id: "mod-soma",
      title: "Somas simples",
      description: "Praticar adição.",
      difficulty: "iniciante",
      objectives: [
        { id: "obj-somar", description: "Somar números inteiros positivos." },
      ],
      pairs: [],
      trueFalse: [],
      multipleChoice: [
        {
          id: "quiz-soma",
          objectiveId: "obj-somar",
          sourceIds: ["fonte-aula"],
          question: "Quanto é 2 + 2?",
          options: ["4", "5"],
          correctOptionIndex: 0,
          explanation: "2 + 2 = 4.",
          optionExplanations: [
            "Correto: duas unidades mais duas totalizam quatro.",
            "Cinco corresponde a 2 + 3, não a 2 + 2.",
          ],
        },
      ],
    },
  ],
});

export function qualityWarnings(pack: GamePack): string[] {
  const warnings: string[] = [];
  if (pack.version === 1)
    warnings.push(
      "Pacote legado v1: objetivos e evidências não são obrigatórios.",
    );
  warnings.push(
    "Referências declaradas e autorrevisão da IA não comprovam a veracidade. Confira o material-base.",
  );
  pack.modules.forEach((module) => {
    const items = [
      ...module.pairs,
      ...module.trueFalse,
      ...module.multipleChoice,
    ];
    module.objectives?.forEach((objective) => {
      if (!items.some((item) => item.objectiveId === objective.id))
        warnings.push(
          `${module.title}: objetivo sem atividade — ${objective.description}`,
        );
    });
    if (module.pairs.length === 1)
      warnings.push(
        `${module.title}: um único par não habilita o jogo de pares.`,
      );
    if (
      module.trueFalse.length &&
      new Set(module.trueFalse.map((item) => item.answer)).size === 1
    )
      warnings.push(
        `${module.title}: todas as afirmações têm a mesma resposta.`,
      );
    const prompts = [
      ...module.trueFalse.map((item) => normalizedText(item.statement)),
      ...module.multipleChoice.map((item) => normalizedText(item.question)),
    ];
    if (new Set(prompts).size !== prompts.length)
      warnings.push(`${module.title}: há perguntas repetidas.`);
  });
  return warnings;
}

export function summarizePack(pack: GamePack) {
  return pack.modules.reduce(
    (total, module) => ({
      pairs: total.pairs + module.pairs.length,
      trueFalse: total.trueFalse + module.trueFalse.length,
      multipleChoice: total.multipleChoice + module.multipleChoice.length,
    }),
    { pairs: 0, trueFalse: 0, multipleChoice: 0 },
  );
}
