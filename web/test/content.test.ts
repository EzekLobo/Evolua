import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import raw from "../content/metodologia.json";
import { contentSchema } from "../src/lib/content-schema";
describe("educational content migration", () => {
  it("preserves every original item and source without modifying the Android content", () => {
    const android = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "../app/src/main/assets/study_content.json"),
        "utf8",
      ),
    );
    expect(raw).toEqual(android);
  });
  it("validates every item, topic relation, answer and source", () => {
    const result = contentSchema.safeParse(raw);
    expect(result.success, result.error?.message).toBe(true);
    expect(raw.flashcards).toHaveLength(43);
    expect(raw.quizzes).toHaveLength(28);
    expect(raw.examModels).toHaveLength(5);
  });
  it("rejects dangling topics and duplicate IDs", () => {
    const data = structuredClone(raw);
    data.flashcards[0].topicId = "missing";
    expect(contentSchema.safeParse(data).success).toBe(false);
    data.flashcards[0].topicId = raw.flashcards[0].topicId;
    data.flashcards[1].id = data.flashcards[0].id;
    expect(contentSchema.safeParse(data).success).toBe(false);
  });
  it("rejects quizzes with invalid answer indices or missing feedback", () => {
    const data = structuredClone(raw);
    data.quizzes[0].correctOptionIndex = 99;
    expect(contentSchema.safeParse(data).success).toBe(false);
    data.quizzes[0].correctOptionIndex = 0;
    data.quizzes[0].optionExplanations = [];
    expect(contentSchema.safeParse(data).success).toBe(false);
  });
});
