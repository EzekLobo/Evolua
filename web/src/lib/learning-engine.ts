import { z } from "zod";

const day = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => !Number.isNaN(Date.parse(v)), "Data inválida");
const integer = z.number().int().nonnegative().max(100000000);
const itemSchema = z.object({
  attempts: integer,
  correct: integer,
  consecutive: integer,
  confidence: z.number().int().min(0).max(3),
  lastDay: day,
  due: day,
  kind: z.enum(["card", "quiz"]),
});
const dailySchema = z.object({
  reviews: integer,
  correct: integer,
  xp: integer,
  items: z.record(z.string(), integer),
});
export const progressSchema = z.object({
  version: z.literal(1),
  name: z.string().max(40),
  goal: z.number().int().min(5).max(50),
  xp: integer,
  days: z.record(day, dailySchema),
  items: z.record(z.string(), itemSchema),
  processed: z.array(z.string().max(100)).max(500),
  notes: z.record(z.string(), z.string().max(20000)),
  earned: z.array(z.string()).max(100).default([]),
});
export type Progress = z.infer<typeof progressSchema>;
export type Attempt = {
  id: string;
  itemId: string;
  kind: "card" | "quiz";
  correct: boolean;
  confidence?: number;
};
export const STORAGE_KEY = "evolua.progress.v1";
export function emptyProgress(): Progress {
  return {
    version: 1,
    name: "",
    goal: 15,
    xp: 0,
    days: {},
    items: {},
    processed: [],
    notes: {},
    earned: [],
  };
}
export function dateKey(date = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return `${p.find((x) => x.type === "year")!.value}-${p.find((x) => x.type === "month")!.value}-${p.find((x) => x.type === "day")!.value}`;
}
export function addDays(day: string, amount: number): string {
  return new Date(Date.parse(`${day}T12:00:00Z`) + amount * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function streak(progress: Progress, today = dateKey()): number {
  let cursor = progress.days[today]?.reviews ? today : addDays(today, -1);
  let result = 0;
  while (progress.days[cursor]?.reviews) {
    result++;
    cursor = addDays(cursor, -1);
  }
  return result;
}
export function recordAttempt(
  progress: Progress,
  event: Attempt,
  today = dateKey(),
): Progress {
  if (progress.processed.includes(event.id)) return progress;
  const previous = progress.items[event.itemId];
  const daily = progress.days[today] ?? {
    reviews: 0,
    correct: 0,
    xp: 0,
    items: {},
  };
  const count = daily.items[event.itemId] ?? 0;
  const correct =
    event.correct && (event.kind === "quiz" || (event.confidence ?? 2) >= 2);
  const consecutive = correct ? (previous?.consecutive ?? 0) + 1 : 0;
  const intervals = [0, 1, 3, 7, 14, 30];
  const xp = count === 0 ? (correct ? 12 : 4) : count < 3 ? 2 : 0;
  const next: Progress = {
    ...progress,
    xp: progress.xp + xp,
    processed: [...progress.processed, event.id].slice(-500),
    days: {
      ...progress.days,
      [today]: {
        reviews: daily.reviews + 1,
        correct: daily.correct + (correct ? 1 : 0),
        xp: daily.xp + xp,
        items: { ...daily.items, [event.itemId]: count + 1 },
      },
    },
    items: {
      ...progress.items,
      [event.itemId]: {
        attempts: (previous?.attempts ?? 0) + 1,
        correct: (previous?.correct ?? 0) + (correct ? 1 : 0),
        consecutive,
        confidence: event.confidence ?? (correct ? 3 : 0),
        kind: event.kind,
        lastDay: today,
        due: addDays(today, intervals[Math.min(consecutive, 5)]),
      },
    },
  };
  const countMastered = Object.values(next.items).filter(
    (item) => item.kind === "card" && item.consecutive >= 2,
  ).length;
  const unlocked = [
    totalAttempts(next) > 0 ? "start" : "",
    totalAttempts(next) >= 10 ? "ten" : "",
    streak(next, today) >= 3 ? "streak" : "",
    countMastered >= 10 ? "master" : "",
    Object.values(next.days).some((d) => d.reviews >= next.goal) ? "goal" : "",
    next.xp >= 500 ? "xp" : "",
  ].filter(Boolean);
  next.earned = Array.from(new Set([...next.earned, ...unlocked]));
  return next;
}
export function mastered(progress: Progress, id: string) {
  return (progress.items[id]?.consecutive ?? 0) >= 2;
}
export function isDue(progress: Progress, id: string, today = dateKey()) {
  return !!progress.items[id] && progress.items[id].due <= today;
}
export function isError(progress: Progress, id: string) {
  return !!progress.items[id] && progress.items[id].consecutive === 0;
}
export function totalAttempts(progress: Progress) {
  return Object.values(progress.days).reduce((sum, x) => sum + x.reviews, 0);
}
export function accuracy(progress: Progress) {
  const attempts = totalAttempts(progress);
  return attempts
    ? Math.round(
        (Object.values(progress.days).reduce((sum, x) => sum + x.correct, 0) /
          attempts) *
          100,
      )
    : 0;
}
export function shuffled<T>(items: readonly T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function achievements(progress: Progress, cardIds: string[]) {
  const reviews = totalAttempts(progress),
    known = cardIds.filter((id) => mastered(progress, id)).length;
  return [
    {
      id: "start",
      name: "Primeiro passo",
      description: "Conclua sua primeira atividade.",
      unlocked: reviews > 0,
      icon: "sprout",
    },
    {
      id: "ten",
      name: "Mente em movimento",
      description: "Pratique 10 atividades.",
      unlocked: reviews >= 10,
      icon: "brain",
    },
    {
      id: "streak",
      name: "Ritmo de estudo",
      description: "Estude em 3 dias seguidos.",
      unlocked: streak(progress) >= 3,
      icon: "flame",
    },
    {
      id: "master",
      name: "Conhecimento sólido",
      description: "Domine 10 flashcards.",
      unlocked: known >= 10,
      icon: "gem",
    },
    {
      id: "goal",
      name: "Missão cumprida",
      description: "Alcance sua meta diária.",
      unlocked: Object.values(progress.days).some(
        (d) => d.reviews >= progress.goal,
      ),
      icon: "target",
    },
    {
      id: "xp",
      name: "Explorador do saber",
      description: "Conquiste 500 XP.",
      unlocked: progress.xp >= 500,
      icon: "trophy",
    },
  ].map((reward) => ({
    ...reward,
    unlocked: reward.unlocked || progress.earned.includes(reward.id),
  }));
}
