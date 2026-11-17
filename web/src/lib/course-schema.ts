import { z } from "zod";
import { gameModuleSchema } from "./game-content";

/**
 * Limits for a complete course. These are deliberately independent from the
 * 240/2,000 character limits used by the legacy game-pack contract.
 */
export const COURSE_PACK_LIMITS = {
  bytes: 2 * 1024 * 1024,
  title: 160,
  description: 4_000,
  shortText: 240,
  bodyText: 12_000,
  lessonText: 60_000,
  listItem: 2_000,
  sourceExcerpt: 4_000,
  prerequisites: 12,
  scopeItems: 20,
  objectives: 50,
  objectiveEvidence: 6,
  sources: 100,
  modules: 20,
  lessonsPerModule: 20,
  lessons: 200,
  sectionsPerLesson: 30,
  blocksPerSection: 20,
  blocksPerLesson: 60,
  blocks: 1_000,
  activitiesPerLesson: 20,
  activities: 300,
  idsPerLink: 20,
} as const;

const idSchema = z
  .string()
  .trim()
  .min(2, "O ID precisa ter pelo menos 2 caracteres")
  .max(64, "O ID não pode exceder 64 caracteres")
  .regex(
    /^[a-z0-9][a-z0-9-]*$/,
    "Use apenas letras minúsculas, números e hífens no ID",
  );

const containsArbitraryMarkup = (value: string) =>
  /<\s*\/?\s*[a-z][^>]*>|javascript\s*:|on[a-z]+\s*=/i.test(value);

const text = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} não pode ficar vazio`)
    .max(max, `${label} não pode exceder ${max} caracteres`)
    .refine(
      (value) => !containsArbitraryMarkup(value),
      `${label} não pode conter HTML, scripts ou handlers executáveis`,
    );

const titleText = text(COURSE_PACK_LIMITS.title, "O título");
const descriptionText = text(COURSE_PACK_LIMITS.description, "A descrição");
const shortText = text(COURSE_PACK_LIMITS.shortText, "O texto curto");
const bodyText = text(COURSE_PACK_LIMITS.bodyText, "O texto");
const listItemText = text(COURSE_PACK_LIMITS.listItem, "O item da lista");
const sourceExcerptText = text(
  COURSE_PACK_LIMITS.sourceExcerpt,
  "O trecho da fonte",
);
const idList = z.array(idSchema).min(1).max(COURSE_PACK_LIMITS.idsPerLink);
const textList = (maxItems: number, maxText: number, label: string) =>
  z.array(text(maxText, label)).max(maxItems);

export const coursePrerequisiteSchema = z
  .object({
    id: idSchema,
    title: titleText,
    description: shortText,
  })
  .strict();

export const courseObjectiveSchema = z
  .object({
    id: idSchema,
    title: titleText,
    description: descriptionText,
    evidenceOfLearning: z
      .array(shortText)
      .min(1)
      .max(COURSE_PACK_LIMITS.objectiveEvidence),
  })
  .strict();

export const courseSourceSchema = z
  .object({
    id: idSchema,
    title: titleText,
    kind: z.enum(["book", "article", "pdf", "web", "internal", "other"]),
    locator: shortText,
    excerpt: sourceExcerptText,
  })
  .strict();

const textBlockSchema = z
  .object({
    id: idSchema,
    type: z.literal("text"),
    text: bodyText,
  })
  .strict();

const listBlockSchema = z
  .object({
    id: idSchema,
    type: z.literal("list"),
    ordered: z.boolean(),
    items: z
      .array(listItemText)
      .min(1)
      .max(COURSE_PACK_LIMITS.blocksPerSection),
  })
  .strict();

const resolvedExampleBlockSchema = z
  .object({
    id: idSchema,
    type: z.literal("resolved-example"),
    title: titleText,
    prompt: bodyText,
    steps: z
      .array(
        z
          .object({
            id: idSchema,
            action: bodyText,
            reasoning: bodyText,
          })
          .strict(),
      )
      .min(2)
      .max(12),
    conclusion: bodyText,
  })
  .strict();

const counterexampleBlockSchema = z
  .object({
    id: idSchema,
    type: z.literal("counterexample"),
    title: titleText,
    situation: bodyText,
    commonMistake: bodyText,
    correction: bodyText,
    whyItMatters: bodyText,
  })
  .strict();

const synthesisBlockSchema = z
  .object({
    id: idSchema,
    type: z.literal("synthesis"),
    keyPoints: z.array(bodyText).min(2).max(10),
    takeaway: bodyText,
  })
  .strict();

const analogyBlockSchema = z
  .object({
    id: idSchema,
    type: z.literal("analogy"),
    familiarSituation: bodyText,
    concept: bodyText,
    mappings: z
      .array(
        z
          .object({
            id: idSchema,
            familiar: bodyText,
            concept: bodyText,
          })
          .strict(),
      )
      .min(2)
      .max(8),
    limits: z.array(bodyText).min(1).max(5),
    returnToConcept: bodyText,
    question: shortText,
  })
  .strict();

export const courseBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  listBlockSchema,
  resolvedExampleBlockSchema,
  counterexampleBlockSchema,
  synthesisBlockSchema,
  analogyBlockSchema,
]);

const activityBase = {
  id: idSchema,
  title: titleText,
  objectiveIds: idList,
  sectionIds: idList,
  prompt: bodyText,
  expectedAnswer: bodyText,
  feedback: bodyText,
};

export const comprehensionActivitySchema = z
  .object({
    ...activityBase,
    type: z.literal("comprehension"),
  })
  .strict();

export const applicationActivitySchema = z
  .object({
    ...activityBase,
    type: z.literal("application"),
    scenario: bodyText,
  })
  .strict();

export const transferActivitySchema = z
  .object({
    ...activityBase,
    type: z.literal("transfer"),
    scenario: bodyText,
    constraints: z.array(shortText).min(1).max(8),
  })
  .strict();

export const courseActivitySchema = z.discriminatedUnion("type", [
  comprehensionActivitySchema,
  applicationActivitySchema,
  transferActivitySchema,
]);

export const courseSectionSchema = z
  .object({
    id: idSchema,
    title: titleText,
    order: z.number().int().positive(),
    objectiveIds: idList,
    sourceIds: idList,
    blocks: z
      .array(courseBlockSchema)
      .min(1)
      .max(COURSE_PACK_LIMITS.blocksPerSection),
  })
  .strict();

export const courseLessonSchema = z
  .object({
    id: idSchema,
    title: titleText,
    description: descriptionText,
    order: z.number().int().positive(),
    objectiveIds: idList,
    sections: z
      .array(courseSectionSchema)
      .min(1)
      .max(COURSE_PACK_LIMITS.sectionsPerLesson),
    activities: z
      .array(courseActivitySchema)
      .min(1)
      .max(COURSE_PACK_LIMITS.activitiesPerLesson),
  })
  .strict();

export const courseModuleSchema = z
  .object({
    id: idSchema,
    title: titleText,
    description: descriptionText,
    order: z.number().int().positive(),
    objectiveIds: idList,
    games: gameModuleSchema.optional(),
    lessons: z
      .array(courseLessonSchema)
      .min(1)
      .max(COURSE_PACK_LIMITS.lessonsPerModule),
  })
  .strict();

const editorialSchema = z
  .object({
    status: z.enum(["draft", "reviewed", "approved"]),
    reviewer: shortText.optional(),
    reviewedAt: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use uma data editorial no formato AAAA-MM-DD")
      .optional(),
    notes: z.array(shortText).max(10).default([]),
  })
  .strict()
  .superRefine((editorial, ctx) => {
    if (editorial.status !== "draft" && !editorial.reviewer) {
      ctx.addIssue({
        code: "custom",
        message: "Cursos revisados precisam identificar o responsável editorial",
        path: ["reviewer"],
      });
    }
    if (editorial.status !== "draft" && !editorial.reviewedAt) {
      ctx.addIssue({
        code: "custom",
        message: "Cursos revisados precisam informar a data da revisão",
        path: ["reviewedAt"],
      });
    }
  });

export const coursePackSchema = z
  .object({
    schema: z.literal("evolua-course-pack"),
    version: z.literal(1),
    id: idSchema,
    revision: z.number().int().positive(),
    title: titleText,
    description: descriptionText,
    audience: z
      .object({
        description: descriptionText,
        priorKnowledge: textList(10, COURSE_PACK_LIMITS.shortText, "O conhecimento prévio"),
      })
      .strict(),
    level: z.enum(["iniciante", "intermediario", "avancado"]),
    prerequisites: z
      .array(coursePrerequisiteSchema)
      .max(COURSE_PACK_LIMITS.prerequisites),
    scope: textList(COURSE_PACK_LIMITS.scopeItems, COURSE_PACK_LIMITS.bodyText, "O item do escopo"),
    exclusions: textList(
      COURSE_PACK_LIMITS.scopeItems,
      COURSE_PACK_LIMITS.bodyText,
      "O item das exclusões",
    ),
    objectives: z
      .array(courseObjectiveSchema)
      .min(1)
      .max(COURSE_PACK_LIMITS.objectives),
    sources: z.array(courseSourceSchema).min(1).max(COURSE_PACK_LIMITS.sources),
    modules: z
      .array(courseModuleSchema)
      .min(1)
      .max(COURSE_PACK_LIMITS.modules),
    editorial: editorialSchema,
  })
  .strict()
  .superRefine((pack, ctx) => {
    if (pack.modules.some(module => module.games)) {
      pack.modules.forEach((module, index) => {
        const games = module.games;
        if (!games || games.pairs.length < 2 || !games.trueFalse.length || !games.multipleChoice.length) {
          ctx.addIssue({ code: "custom", path: ["modules", index, "games"], message: "Inclua pares, verdadeiro ou falso e múltipla escolha em cada módulo do curso." });
        }
      });
    }
    const registeredIds = new Map<string, (string | number)[]>();
    const registerId = (id: string, path: (string | number)[]) => {
      const previousPath = registeredIds.get(id);
      if (previousPath) {
        ctx.addIssue({
          code: "custom",
          message: `ID duplicado: ${id} (já usado em ${formatPath(previousPath)})`,
          path,
        });
      } else {
        registeredIds.set(id, path);
      }
    };

    registerId(pack.id, ["id"]);
    pack.prerequisites.forEach((item, index) =>
      registerId(item.id, ["prerequisites", index, "id"]),
    );
    pack.objectives.forEach((item, index) =>
      registerId(item.id, ["objectives", index, "id"]),
    );
    pack.sources.forEach((item, index) =>
      registerId(item.id, ["sources", index, "id"]),
    );

    const objectiveIds = new Set(pack.objectives.map((objective) => objective.id));
    const sourceIds = new Set(pack.sources.map((source) => source.id));
    const allSectionIds = new Set(
      pack.modules.flatMap((module) =>
        module.lessons.flatMap((lesson) =>
          lesson.sections.map((section) => section.id),
        ),
      ),
    );
    const coveredObjectives = new Set<string>();
    const activeObjectives = new Set<string>();
    let lessonCount = 0;
    let blockCount = 0;
    let activityCount = 0;

    const checkReferences = (
      ids: string[],
      available: Set<string>,
      path: (string | number)[],
      label: string,
    ) => {
      ids.forEach((id, index) => {
        if (!available.has(id)) {
          ctx.addIssue({
            code: "custom",
            message: `${label} desconhecido: ${id}`,
            path: [...path, index],
          });
        }
      });
    };

    const checkOrder = (
      values: number[],
      path: (string | number)[],
      label: string,
    ) => {
      values.forEach((value, index) => {
        if (value !== index + 1) {
          ctx.addIssue({
            code: "custom",
            message: `${label} devem começar em 1 e seguir a ordem sem saltos`,
            path: [...path, index, "order"],
          });
        }
      });
    };

    checkOrder(
      pack.modules.map((module) => module.order),
      ["modules"],
      "Os módulos",
    );

    pack.modules.forEach((module, moduleIndex) => {
      const modulePath = ["modules", moduleIndex] as (string | number)[];
      registerId(module.id, [...modulePath, "id"]);
      if (module.games) {
        registerId(module.games.id, [...modulePath, "games", "id"]);
        for (const format of ["pairs", "trueFalse", "multipleChoice"] as const) {
          module.games[format].forEach((item, index) => {
            registerId(item.id, [...modulePath, "games", format, index, "id"]);
          });
        }
      }
      checkReferences(
        module.objectiveIds,
        objectiveIds,
        [...modulePath, "objectiveIds"],
        "Objetivo",
      );
      checkOrder(
        module.lessons.map((lesson) => lesson.order),
        [...modulePath, "lessons"],
        "As aulas",
      );

      module.lessons.forEach((lesson, lessonIndex) => {
        lessonCount += 1;
        const lessonPath = [...modulePath, "lessons", lessonIndex] as (string | number)[];
        registerId(lesson.id, [...lessonPath, "id"]);
        checkReferences(
          lesson.objectiveIds,
          objectiveIds,
          [...lessonPath, "objectiveIds"],
          "Objetivo",
        );
        const lessonBlockCount = lesson.sections.reduce(
          (total, section) => total + section.blocks.length,
          0,
        );
        if (lessonBlockCount > COURSE_PACK_LIMITS.blocksPerLesson) {
          ctx.addIssue({
            code: "custom",
            message: `A aula não pode exceder ${COURSE_PACK_LIMITS.blocksPerLesson} blocos`,
            path: [...lessonPath, "sections"],
          });
        }
        const lessonTextLength = courseTextLength(lesson);
        if (lessonTextLength > COURSE_PACK_LIMITS.lessonText) {
          ctx.addIssue({
            code: "custom",
            message: `A aula não pode exceder ${COURSE_PACK_LIMITS.lessonText} caracteres de conteúdo (${lessonTextLength})`,
            path: lessonPath,
          });
        }
        checkOrder(
          lesson.sections.map((section) => section.order),
          [...lessonPath, "sections"],
          "As seções",
        );

        lesson.sections.forEach((section, sectionIndex) => {
          const sectionPath = [
            ...lessonPath,
            "sections",
            sectionIndex,
          ] as (string | number)[];
          registerId(section.id, [...sectionPath, "id"]);
          checkReferences(
            section.objectiveIds,
            objectiveIds,
            [...sectionPath, "objectiveIds"],
            "Objetivo",
          );
          checkReferences(
            section.sourceIds,
            sourceIds,
            [...sectionPath, "sourceIds"],
            "Fonte",
          );
          section.objectiveIds.forEach((id) => coveredObjectives.add(id));
          blockCount += section.blocks.length;
          section.blocks.forEach((block, blockIndex) => {
            const blockPath = [
              ...sectionPath,
              "blocks",
              blockIndex,
            ] as (string | number)[];
            registerId(block.id, [...blockPath, "id"]);
            if (block.type === "resolved-example") {
              block.steps.forEach((step, stepIndex) =>
                registerId(step.id, [...blockPath, "steps", stepIndex, "id"]),
              );
            }
            if (block.type === "analogy") {
              block.mappings.forEach((mapping, mappingIndex) =>
                registerId(mapping.id, [
                  ...blockPath,
                  "mappings",
                  mappingIndex,
                  "id",
                ]),
              );
            }
          });
        });

        lesson.activities.forEach((activity, activityIndex) => {
          activityCount += 1;
          const activityPath = [
            ...lessonPath,
            "activities",
            activityIndex,
          ] as (string | number)[];
          registerId(activity.id, [...activityPath, "id"]);
          checkReferences(
            activity.objectiveIds,
            objectiveIds,
            [...activityPath, "objectiveIds"],
            "Objetivo",
          );
          checkReferences(
            activity.sectionIds,
            allSectionIds,
            [...activityPath, "sectionIds"],
            "Seção",
          );
          activity.objectiveIds.forEach((id) => activeObjectives.add(id));
        });
      });
    });

    pack.objectives.forEach((objective, index) => {
      if (!coveredObjectives.has(objective.id)) {
        ctx.addIssue({
          code: "custom",
          message: "O objetivo precisa estar vinculado a pelo menos uma seção explicativa",
          path: ["objectives", index, "id"],
        });
      }
      if (!activeObjectives.has(objective.id)) {
        ctx.addIssue({
          code: "custom",
          message: "O objetivo precisa estar vinculado a pelo menos uma atividade",
          path: ["objectives", index, "id"],
        });
      }
    });

    if (lessonCount > COURSE_PACK_LIMITS.lessons) {
      ctx.addIssue({
        code: "custom",
        message: `O pacote não pode exceder ${COURSE_PACK_LIMITS.lessons} aulas`,
        path: ["modules"],
      });
    }
    if (blockCount > COURSE_PACK_LIMITS.blocks) {
      ctx.addIssue({
        code: "custom",
        message: `O pacote não pode exceder ${COURSE_PACK_LIMITS.blocks} blocos`,
        path: ["modules"],
      });
    }
    if (activityCount > COURSE_PACK_LIMITS.activities) {
      ctx.addIssue({
        code: "custom",
        message: `O pacote não pode exceder ${COURSE_PACK_LIMITS.activities} atividades`,
        path: ["modules"],
      });
    }

    const serializedBytes = coursePackByteLength(pack);
    if (serializedBytes > COURSE_PACK_LIMITS.bytes) {
      ctx.addIssue({
        code: "custom",
        message: `O pacote excede o limite de ${COURSE_PACK_LIMITS.bytes} bytes (${serializedBytes} bytes)`,
        path: [],
      });
    }
  });

export type CoursePack = z.infer<typeof coursePackSchema>;
export type CoursePrerequisite = z.infer<typeof coursePrerequisiteSchema>;
export type CourseObjective = z.infer<typeof courseObjectiveSchema>;
export type CourseSource = z.infer<typeof courseSourceSchema>;
export type CourseBlock = z.infer<typeof courseBlockSchema>;
export type CourseSection = z.infer<typeof courseSectionSchema>;
export type CourseLesson = z.infer<typeof courseLessonSchema>;
export type CourseModule = z.infer<typeof courseModuleSchema>;
export type CourseActivity = z.infer<typeof courseActivitySchema>;
export type CourseActivityType = CourseActivity["type"];

export function formatPath(path: (string | number)[]): string {
  if (path.length === 0) return "$";
  return path
    .map((part) => (typeof part === "number" ? `[${part}]` : part))
    .join(".")
    .replace(/\.\[/g, "[");
}

export type CourseValidationIssue = {
  path: (string | number)[];
  formattedPath: string;
  message: string;
};

export type CourseValidationResult =
  | {
      success: true;
      data: CoursePack;
      errors: [];
      warnings: string[];
    }
  | {
      success: false;
      data: undefined;
      errors: CourseValidationIssue[];
      warnings: [];
    };

export function coursePackByteLength(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}

function courseTextLength(value: unknown): number {
  if (typeof value === "string") return value.length;
  if (Array.isArray(value))
    return value.reduce((total, child) => total + courseTextLength(child), 0);
  if (value && typeof value === "object")
    return Object.values(value).reduce(
      (total, child) => total + courseTextLength(child),
      0,
    );
  return 0;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value
      .normalize("NFKC")
      .replace(/\r\n?/g, "\n")
      .replace(/[ \t]+/g, " ")
      .trim();
  }
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeValue(child)]),
    );
  }
  return value;
}

/** Normalize imported JSON without changing its structural contract. */
export function normalizeCoursePack(value: unknown): unknown {
  return normalizeValue(value);
}

export function parseCoursePack(value: unknown): CoursePack {
  return coursePackSchema.parse(normalizeCoursePack(value));
}

export function summarizeCoursePack(pack: CoursePack) {
  return pack.modules.reduce(
    (summary, module) => {
      summary.modules += 1;
      summary.lessons += module.lessons.length;
      module.lessons.forEach((lesson) => {
        summary.sections += lesson.sections.length;
        summary.blocks += lesson.sections.reduce(
          (total, section) => total + section.blocks.length,
          0,
        );
        summary.activities += lesson.activities.length;
      });
      return summary;
    },
    { modules: 0, lessons: 0, sections: 0, blocks: 0, activities: 0 },
  );
}

/**
 * These are editorial signals, not replacements for human review. A course
 * can be structurally valid while still being too shallow for publication.
 */
export function courseEditorialWarnings(pack: CoursePack): string[] {
  const warnings: string[] = [];
  const blocks = pack.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) =>
      lesson.sections.flatMap((section) => section.blocks),
    ),
  );
  const activities = pack.modules.flatMap((module) =>
    module.lessons.flatMap((lesson) => lesson.activities),
  );
  const types = new Set(activities.map((activity) => activity.type));

  if (pack.editorial.status === "draft")
    warnings.push("Curso em rascunho: requer revisão humana antes do catálogo.");
  if (!blocks.some((block) => block.type === "resolved-example"))
    warnings.push("Inclua ao menos um exemplo resolvido com passos e justificativas.");
  if (!blocks.some((block) => block.type === "counterexample"))
    warnings.push("Inclua um contraexemplo ou erro comum com correção explicada.");
  if (!blocks.some((block) => block.type === "synthesis"))
    warnings.push("Inclua uma síntese explícita dos pontos centrais.");
  if (!blocks.some((block) => block.type === "analogy"))
    warnings.push(
      "Inclua uma analogia completa, com correspondências, limites, retorno ao conceito e pergunta.",
    );
  if (!types.has("comprehension"))
    warnings.push("Não há atividade de compreensão no curso.");
  if (!types.has("application"))
    warnings.push("Não há atividade de aplicação no curso.");
  if (!types.has("transfer"))
    warnings.push("Não há atividade de transferência para cenário novo no curso.");

  pack.objectives.forEach((objective) => {
    const linkedActivities = activities.filter((activity) =>
      activity.objectiveIds.includes(objective.id),
    );
    if (linkedActivities.length === 1)
      warnings.push(
        `Objetivo ${objective.id} tem somente uma atividade; avalie variedade de prática.`,
      );
  });
  return warnings;
}

export function validateCoursePack(value: unknown): CourseValidationResult {
  const result = coursePackSchema.safeParse(value);
  if (!result.success) {
    return {
      success: false,
      data: undefined,
      errors: result.error.issues.map((issue) => {
        const path = issue.path.filter(
          (part): part is string | number =>
            typeof part === "string" || typeof part === "number",
        );
        return {
          path,
          formattedPath: formatPath(path),
          message: issue.message,
        };
      }),
      warnings: [],
    };
  }
  return {
    success: true,
    data: result.data,
    errors: [],
    warnings: courseEditorialWarnings(result.data),
  };
}
