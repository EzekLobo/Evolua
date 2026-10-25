import { describe, expect, it } from "vitest";
import {
  changedActivityIds,
  correctionPrompt,
  validatePackText,
} from "../src/lib/assisted-authoring";
import {
  buildGamePackPrompt,
  exampleGamePack,
  qualityWarnings,
  PACK_LIMITS,
} from "../src/lib/game-content";
import { testGamePack } from "./game-fixture";

describe("authoring contract and diagnostics", () => {
  it("identifies changed activities whose stable IDs retain the old history", () => {
    const next = structuredClone(testGamePack);
    next.modules[0].trueFalse[0].explanation = "Uma explicação revisada.";
    expect(changedActivityIds(testGamePack, next)).toEqual(["truth-four"]);
  });
  it("accepts the v2 example actually embedded in the generated prompt", () => {
    const prompt = buildGamePackPrompt({
      subject: "Soma",
      audience: "Alunos",
      objective: "Somar",
      difficulty: "iniciante",
      itemCount: 3,
    });
    const embedded = prompt.slice(prompt.indexOf('{\n  "schema"'));
    expect(validatePackText(embedded).success).toBe(true);
    expect(JSON.parse(embedded)).toEqual(exampleGamePack);
  });
  it("accepts BOM and a single Markdown fence, rejecting extra prose or multiple objects", () => {
    expect(
      validatePackText(
        `\uFEFF\u0060\u0060\u0060json\n${JSON.stringify(testGamePack)}\n\u0060\u0060\u0060`,
      ).success,
    ).toBe(true);
    expect(
      validatePackText(`Segue: ${JSON.stringify(testGamePack)}`).success,
    ).toBe(false);
    expect(validatePackText(`${JSON.stringify(testGamePack)} {}`).success).toBe(
      false,
    );
  });
  it("reports precise paths for duplicate IDs and missing evidence", () => {
    const pack = structuredClone(testGamePack);
    pack.modules[0].trueFalse[0].id = pack.modules[0].pairs[0].id;
    pack.modules[0].multipleChoice[0].sourceIds = ["unknown"];
    const result = validatePackText(JSON.stringify(pack));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(
        result.issues.some(
          (issue) => issue.path === "modules[0].trueFalse[0].id",
        ),
      ).toBe(true);
      expect(
        result.issues.some(
          (issue) => issue.path === "modules[0].multipleChoice[0].sourceIds[0]",
        ),
      ).toBe(true);
    }
  });
  it("rejects unsupported versions, reserved IDs, normalized duplicates and missing option feedback", () => {
    for (const change of [
      (p: typeof testGamePack) => {
        p.id = "metodologia-cientifica";
      },
      (p: typeof testGamePack) => {
        p.modules[0].pairs[1].prompt = " ２  +   ２ ";
      },
      (p: typeof testGamePack) => {
        delete p.modules[0].multipleChoice[0].optionExplanations;
      },
    ]) {
      const p = structuredClone(testGamePack);
      change(p);
      expect(validatePackText(JSON.stringify(p)).success).toBe(false);
    }
    expect(
      validatePackText(JSON.stringify({ ...testGamePack, version: 3 })).success,
    ).toBe(false);
  });
  it("checks byte limit and includes real diagnostics in the repair prompt", () => {
    const text = "a".repeat(PACK_LIMITS.bytes + 1);
    const result = validatePackText(text);
    if (result.success) throw Error("Oversized input accepted");
    expect(result.issues[0].path).toBe("arquivo");
    expect(correctionPrompt("{broken}", result.issues)).toContain("{broken}");
    expect(correctionPrompt("{broken}", result.issues)).toContain(
      "arquivo: O limite é 1 MB",
    );
  });
  it("warns about uncovered objectives without claiming factual certification", () => {
    const pack = structuredClone(testGamePack);
    pack.modules[0].objectives!.push({
      id: "obj-uncovered",
      description: "Objetivo sem questão",
    });
    expect(
      qualityWarnings(pack).some((warning) =>
        warning.includes("objetivo sem atividade"),
      ),
    ).toBe(true);
    expect(
      qualityWarnings(pack).some((warning) =>
        warning.includes("não comprovam"),
      ),
    ).toBe(true);
  });
});
