import { z } from "zod";

export const sourceSchema = z.object({
  pdf: z.string().min(1),
  page: z.number().int().positive(),
  excerpt: z.string().min(1),
});
const item = z.object({
  id: z.string().min(1),
  topicId: z.string().min(1),
  source: sourceSchema,
});
export const contentSchema = z
  .object({
    title: z.string(),
    topics: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          description: z.string(),
        }),
      )
      .min(1),
    flashcards: z.array(
      item.extend({
        type: z.string(),
        difficulty: z.number().int().min(1).max(3),
        front: z.string().min(1),
        back: z.string().min(1),
      }),
    ),
    quizzes: z.array(
      item
        .extend({
          question: z.string().min(1),
          options: z.array(z.string().min(1)).min(2),
          correctOptionIndex: z.number().int().nonnegative(),
          optionExplanations: z.array(z.string().min(1)),
          explanation: z.string().min(1),
        })
        .superRefine((q, ctx) => {
          if (q.correctOptionIndex >= q.options.length)
            ctx.addIssue({
              code: "custom",
              message: "Alternativa correta inválida",
            });
          if (q.optionExplanations.length !== q.options.length)
            ctx.addIssue({
              code: "custom",
              message: "Cada alternativa precisa de uma explicação",
            });
        }),
    ),
    relations: z.array(
      item.extend({
        from: z.string(),
        to: z.string(),
        description: z.string(),
      }),
    ),
    glossary: z.array(
      item.extend({ term: z.string(), definition: z.string() }),
    ),
    examPractice: z.array(
      item.extend({
        prompt: z.string(),
        weight: z.string(),
        approach: z.string(),
        checklist: z.array(z.string()),
      }),
    ),
    examModels: z.array(
      z.object({
        id: z.string(),
        title: z.string(),
        focus: z.string(),
        duration: z.string(),
        questions: z.array(z.string()),
        rubric: z.array(z.string()),
        source: sourceSchema,
      }),
    ),
    studyGuides: z.array(
      z.object({
        id: z.string(),
        pdf: z.string(),
        title: z.string(),
        purpose: z.string(),
        visualTree: z.array(z.string()),
        flow: z.array(z.string()),
        diagram: z.array(z.string()),
        metacognition: z.array(z.string()),
        strategies: z.array(z.string()),
        source: sourceSchema,
      }),
    ),
  })
  .superRefine((data, ctx) => {
    const topics = new Set(data.topics.map((t) => t.id));
    const ids = new Set<string>();
    for (const key of [
      "flashcards",
      "quizzes",
      "relations",
      "glossary",
      "examPractice",
      "examModels",
      "studyGuides",
    ] as const) {
      for (const entry of data[key]) {
        if (ids.has(entry.id))
          ctx.addIssue({
            code: "custom",
            message: `ID duplicado: ${entry.id}`,
          });
        ids.add(entry.id);
        if ("topicId" in entry && !topics.has(entry.topicId))
          ctx.addIssue({
            code: "custom",
            message: `Tópico desconhecido: ${entry.id}`,
          });
      }
    }
  });
export type StudyContent = z.infer<typeof contentSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type Flashcard = StudyContent["flashcards"][number];
export type Quiz = StudyContent["quizzes"][number];
