import { describe, expect, it } from "vitest";
import rawCourse from "../content/course-example.json";
import {
  COURSE_PACK_LIMITS,
  coursePackSchema,
  courseEditorialWarnings,
  normalizeCoursePack,
  parseCoursePack,
  summarizeCoursePack,
  validateCoursePack,
} from "../src/lib/course-schema";

type CourseFixture = any;
const cloneCourse = (): CourseFixture => structuredClone(rawCourse);

describe("evolua-course-pack v1", () => {
  it("accepts a complete, non-superficial fixture and exposes a useful summary", () => {
    const result = validateCoursePack(rawCourse);

    expect(result.success, JSON.stringify(result.errors)).toBe(true);
    if (!result.success) return;

    expect(summarizeCoursePack(result.data)).toEqual({
      modules: 1,
      lessons: 2,
      sections: 5,
      blocks: 10,
      activities: 6,
    });
    expect(result.data.modules[0].lessons[0].activities.map((item) => item.type)).toEqual([
      "comprehension",
      "application",
      "transfer",
    ]);
    expect(courseEditorialWarnings(result.data)).toEqual([]);
  });

  it("rejects duplicate IDs and reports the current path", () => {
    const data = cloneCourse();
    data.modules[0].lessons[1].sections[0].id =
      data.modules[0].lessons[0].sections[0].id;

    const result = validateCoursePack(data);

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(
      result.errors.some(
        (issue) => issue.formattedPath === "modules[0].lessons[1].sections[0].id" &&
          issue.message.includes("ID duplicado"),
      ),
    ).toBe(true);
  });

  it("rejects dangling objective, section and source links precisely", () => {
    const objectiveData = cloneCourse();
    objectiveData.modules[0].lessons[0].activities[0].objectiveIds = [
      "objetivo-inexistente",
    ];
    const objectiveResult = validateCoursePack(objectiveData);
    expect(objectiveResult.success).toBe(false);
    if (!objectiveResult.success)
      expect(objectiveResult.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            formattedPath:
              "modules[0].lessons[0].activities[0].objectiveIds[0]",
          }),
        ]),
      );

    const sectionData = cloneCourse();
    sectionData.modules[0].lessons[0].activities[0].sectionIds = [
      "sec-inexistente",
    ];
    const sectionResult = validateCoursePack(sectionData);
    expect(sectionResult.success).toBe(false);
    if (!sectionResult.success)
      expect(sectionResult.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            formattedPath:
              "modules[0].lessons[0].activities[0].sectionIds[0]",
          }),
        ]),
      );

    const sourceData = cloneCourse();
    sourceData.modules[0].lessons[0].sections[0].sourceIds = [
      "fonte-inexistente",
    ];
    const sourceResult = validateCoursePack(sourceData);
    expect(sourceResult.success).toBe(false);
    if (!sourceResult.success)
      expect(sourceResult.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            formattedPath:
              "modules[0].lessons[0].sections[0].sourceIds[0]",
          }),
        ]),
      );
  });

  it("rejects unknown versions, missing essentials and arbitrary markup", () => {
    const versionData = cloneCourse();
    versionData.version = 2;
    expect(coursePackSchema.safeParse(versionData).success).toBe(false);

    const missingData = cloneCourse();
    delete missingData.modules[0].lessons[0].sections[0].blocks;
    const missingResult = validateCoursePack(missingData);
    expect(missingResult.success).toBe(false);
    if (!missingResult.success)
      expect(missingResult.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            formattedPath: "modules[0].lessons[0].sections[0].blocks",
          }),
        ]),
      );

    const markupData = cloneCourse();
    markupData.title = "<script>alert('x')</script>";
    const markupResult = validateCoursePack(markupData);
    expect(markupResult.success).toBe(false);
    if (!markupResult.success)
      expect(markupResult.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ formattedPath: "title" }),
        ]),
      );
  });

  it("rejects cardinality and package-byte limits", () => {
    const tooManyModules = cloneCourse();
    tooManyModules.modules = Array.from(
      { length: COURSE_PACK_LIMITS.modules + 1 },
      (_, index) => ({
        ...cloneCourse().modules[0],
        id: `mod-extra-${index}`,
        order: index + 1,
      }),
    );
    expect(coursePackSchema.safeParse(tooManyModules).success).toBe(false);

    const tooManyLessons = cloneCourse();
    tooManyLessons.modules[0].lessons = Array.from(
      { length: COURSE_PACK_LIMITS.lessonsPerModule + 1 },
      (_, index) => ({
        ...cloneCourse().modules[0].lessons[0],
        id: `lesson-extra-${index}`,
        order: index + 1,
      }),
    );
    expect(coursePackSchema.safeParse(tooManyLessons).success).toBe(false);

    const tooLarge = cloneCourse();
    tooLarge.description = "x".repeat(COURSE_PACK_LIMITS.description);
    tooLarge.modules[0].lessons[0].sections[0].blocks.push(
      ...Array.from({ length: 250 }, (_, index) => ({
        id: `blk-large-${index}`,
        type: "text" as const,
        text: "conteúdo de teste ".repeat(600),
      })),
    );
    expect(coursePackSchema.safeParse(tooLarge).success).toBe(false);
  });

  it("keeps structural failure separate from editorial depth warnings", () => {
    const data = cloneCourse();
    data.modules[0].lessons[0].sections[0].blocks = [
      data.modules[0].lessons[0].sections[0].blocks[0],
    ];
    data.modules[0].lessons[0].sections[1].blocks = [
      data.modules[0].lessons[0].sections[1].blocks[0],
    ];
    data.modules[0].lessons[1].sections[1].blocks = [
      {
        ...data.modules[0].lessons[1].sections[0].blocks[0],
        id: "blk-editorial-shallow",
      },
    ];
    data.editorial.status = "draft";
    delete data.editorial.reviewer;
    delete data.editorial.reviewedAt;

    const result = validateCoursePack(data);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.warnings).toEqual(
        expect.arrayContaining([
          expect.stringContaining("rascunho"),
          expect.stringContaining("analogia"),
        ]),
      );
    }
  });

  it("normalizes imported whitespace before parsing without changing the contract", () => {
    const data = cloneCourse();
    data.title = "  Metodologia   científica  ";
    data.modules[0].lessons[0].sections[0].blocks[0].text =
      "  Uma afirmação  com espaços extras.  ";

    const normalized = parseCoursePack(normalizeCoursePack(data));

    expect(normalized.title).toBe("Metodologia científica");
    expect(normalized.modules[0].lessons[0].sections[0].blocks[0]).toMatchObject({
      type: "text",
      text: "Uma afirmação com espaços extras.",
    });
  });
});
