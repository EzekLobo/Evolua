import { describe, it, expect } from "vitest";
import {
  accuracy,
  achievements,
  addDays,
  dateKey,
  emptyProgress,
  isDue,
  isError,
  mastered,
  progressSchema,
  recordAttempt,
  streak,
  totalAttempts,
  type Attempt,
} from "../src/lib/learning-engine";
const today = "2026-10-23";
const attempt = (
  id: string,
  correct = true,
  kind: "card" | "quiz" = "card",
  itemId = "fc-1",
): Attempt => ({ id, itemId, kind, correct, confidence: correct ? 3 : 0 });
describe("learning engine", () => {
  it("awards XP once for the same event even if a handler runs twice", () => {
    const first = recordAttempt(emptyProgress(), attempt("a"), today);
    expect(recordAttempt(first, attempt("a"), today)).toEqual(first);
    expect(first.xp).toBe(12);
    expect(totalAttempts(first)).toBe(1);
  });
  it("limits XP for repeated practice on the same item and day", () => {
    let p = emptyProgress();
    for (let n = 0; n < 10; n++)
      p = recordAttempt(p, attempt(String(n)), today);
    expect(p.xp).toBe(16);
    expect(totalAttempts(p)).toBe(10);
    expect(recordAttempt(p, attempt("tomorrow"), addDays(today, 1)).xp).toBe(
      28,
    );
  });
  it("schedules successive correct reviews at 1, 3, 7, 14 and 30 days", () => {
    let p = emptyProgress();
    for (const [i, interval] of [1, 3, 7, 14, 30, 30].entries()) {
      p = recordAttempt(p, attempt(String(i)), today);
      expect(p.items["fc-1"].due).toBe(addDays(today, interval));
    }
  });
  it("requires consecutive successes for mastery and resets after an error", () => {
    let p = recordAttempt(emptyProgress(), attempt("a"), today);
    expect(mastered(p, "fc-1")).toBe(false);
    p = recordAttempt(p, attempt("b"), today);
    expect(mastered(p, "fc-1")).toBe(true);
    p = recordAttempt(p, attempt("c", false), today);
    expect(mastered(p, "fc-1")).toBe(false);
    expect(isError(p, "fc-1")).toBe(true);
    expect(isDue(p, "fc-1", today)).toBe(true);
  });
  it("treats partial recall as a review need", () => {
    const p = recordAttempt(
      emptyProgress(),
      { ...attempt("a"), confidence: 1 },
      today,
    );
    expect(isError(p, "fc-1")).toBe(true);
    expect(p.xp).toBe(4);
  });
  it("includes failed quizzes in the same review system", () => {
    const p = recordAttempt(
      emptyProgress(),
      attempt("a", false, "quiz", "q-1"),
      today,
    );
    expect(isError(p, "q-1")).toBe(true);
    expect(p.items["q-1"].kind).toBe("quiz");
  });
  it("does not consider unseen or future cards due", () => {
    const p = recordAttempt(emptyProgress(), attempt("a"), today);
    expect(isDue(p, "unseen", today)).toBe(false);
    expect(isDue(p, "fc-1", today)).toBe(false);
    expect(isDue(p, "fc-1", addDays(today, 1))).toBe(true);
  });
  it("computes a streak including yesterday and clears it after a skipped day", () => {
    let p = emptyProgress();
    p = recordAttempt(p, attempt("a"), "2026-10-21");
    p = recordAttempt(p, attempt("b"), "2026-10-22");
    expect(streak(p, "2026-10-23")).toBe(2);
    expect(streak(p, "2026-10-24")).toBe(0);
    p = recordAttempt(p, attempt("c"), "2026-10-23");
    expect(streak(p, "2026-10-23")).toBe(3);
  });
  it("uses the Sao Paulo calendar day around UTC midnight", () => {
    expect(dateKey(new Date("2026-10-24T02:59:59Z"))).toBe("2026-10-23");
    expect(dateKey(new Date("2026-10-24T03:00:00Z"))).toBe("2026-10-24");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("computes accuracy using all attempts", () => {
    let p = recordAttempt(emptyProgress(), attempt("a"), today);
    p = recordAttempt(p, attempt("b", false), today);
    expect(accuracy(p)).toBe(50);
    expect(accuracy(emptyProgress())).toBe(0);
  });
  it("validates progress and rejects malformed or unsupported backups", () => {
    expect(progressSchema.safeParse(emptyProgress()).success).toBe(true);
    expect(
      progressSchema.safeParse({ ...emptyProgress(), version: 2 }).success,
    ).toBe(false);
    expect(
      progressSchema.safeParse({ ...emptyProgress(), goal: 0 }).success,
    ).toBe(false);
    expect(
      progressSchema.safeParse({ ...emptyProgress(), xp: -12 }).success,
    ).toBe(false);
  });
  it("keeps an earned mastery badge when a later review is incorrect", () => {
    let p=emptyProgress();
    const ids=Array.from({length:10},(_,i)=>`card-${i}`);
    for(const id of ids){
      p=recordAttempt(p,attempt(`${id}-1`,true,'card',id),today);
      p=recordAttempt(p,attempt(`${id}-2`,true,'card',id),today);
    }
    expect(p.earned).toContain('master');
    p=recordAttempt(p,attempt('later',false,'card',ids[0]),addDays(today,1));
    expect(achievements(p,ids).find(a=>a.id==='master')?.unlocked).toBe(true);
  });
});
