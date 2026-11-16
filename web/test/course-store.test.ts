// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import rawCourse from "../content/course-example.json";
import { coursePackSchema, type CoursePack } from "../src/lib/course-schema";
import { useCourses } from "../src/hooks/use-courses";
import {
  activateCourse,
  emptyCourseStoreSnapshot,
  previewCourseImport,
  readCourseStore,
  removeCourse,
  saveCourseDraft,
  writeCourseStore,
} from "../src/lib/course-store";
import { emptyProgress } from "../src/lib/learning-engine";
import { privateStorageKey } from "../src/lib/private-storage";
import { restoreBackup } from "../src/lib/backup";

const ACCOUNT_A = "course-user-a";
const ACCOUNT_B = "course-user-b";

function course(revision = 1): CoursePack {
  const value = structuredClone(rawCourse);
  value.revision = revision;
  return coursePackSchema.parse(value);
}

function Harness({ uid }: { uid: string }) {
  const courses = useCourses(uid);
  return createElement(
    "div",
    null,
    createElement("output", { "data-testid": "ready" }, String(courses.ready)),
    createElement(
      "output",
      { "data-testid": "active" },
      courses.activeCourses
        .map((item) => `${item.pack.id}:${item.pack.revision}`)
        .join(","),
    ),
    createElement(
      "output",
      { "data-testid": "drafts" },
      courses.drafts
        .map((item) => `${item.pack.id}:${item.pack.revision}`)
        .join(","),
    ),
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EP-103 ciclo de vida dos cursos", () => {
  it("gera prévia sem gravar e só ativa depois da confirmação de domínio", () => {
    const preview = previewCourseImport(course());
    expect(preview.success).toBe(true);
    expect(localStorage.length).toBe(0);
    if (!preview.success) return;

    activateCourse(ACCOUNT_A, preview.preview.pack);
    const saved = readCourseStore(ACCOUNT_A);
    expect(saved.active.items[0].pack.id).toBe(preview.preview.pack.id);
    expect(saved.drafts.items).toHaveLength(0);
  });

  it("mostra caminhos de um pacote inválido e não substitui o estado", () => {
    const invalid = course();
    invalid.modules[0].lessons[0].sections[0].sourceIds = ["fonte-ausente"];
    const result = previewCourseImport(invalid, emptyCourseStoreSnapshot());

    expect(result.success).toBe(false);
    if (!result.success)
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            formattedPath: "modules[0].lessons[0].sections[0].sourceIds[0]",
          }),
        ]),
      );
    expect(localStorage.length).toBe(0);
  });

  it("identifica substituição por id e revisão e mantém rascunho separado", () => {
    saveCourseDraft(ACCOUNT_A, course(1));
    const first = readCourseStore(ACCOUNT_A);
    const replacement = previewCourseImport(course(2), first);

    expect(replacement.success).toBe(true);
    if (replacement.success) {
      expect(replacement.preview.replacement).toMatchObject({
        kind: "draft",
        previousRevision: 1,
        revisionChanged: true,
      });
    }
    activateCourse(ACCOUNT_A, course(2));
    const saved = readCourseStore(ACCOUNT_A);
    expect(saved.active.items.map((item) => item.pack.revision)).toEqual([2]);
    expect(saved.drafts.items.map((item) => item.pack.revision)).toEqual([1]);
  });

  it("remove curso sem apagar a chave de progresso ou XP", () => {
    localStorage.setItem(
      privateStorageKey(ACCOUNT_A, "progress"),
      JSON.stringify({ ...emptyProgress(), xp: 123 }),
    );
    activateCourse(ACCOUNT_A, course());
    removeCourse(ACCOUNT_A, "active", course().id, 1);

    expect(readCourseStore(ACCOUNT_A).active.items).toHaveLength(0);
    expect(localStorage.getItem(privateStorageKey(ACCOUNT_A, "progress"))).toContain(
      '"xp":123',
    );
  });

  it("mantém duas contas isoladas e ignora storage event de outra conta", async () => {
    activateCourse(ACCOUNT_B, course());
    render(createElement(Harness, { uid: ACCOUNT_A }));
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    expect(screen.getByTestId("active").textContent).toBe("");

    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: privateStorageKey(ACCOUNT_B, "course-packs"),
          newValue: localStorage.getItem(privateStorageKey(ACCOUNT_B, "course-packs")),
        }),
      );
    });
    expect(screen.getByTestId("active").textContent).toBe("");
  });

  it("faz rollback quando a segunda chave falha", () => {
    const old = readCourseStore(ACCOUNT_A);
    writeCourseStore(ACCOUNT_A, {
      active: {
        ...old.active,
        items: [],
      },
      drafts: {
        ...old.drafts,
        items: [],
      },
    });
    activateCourse(ACCOUNT_A, course());
    const before = readCourseStore(ACCOUNT_A);
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === privateStorageKey(ACCOUNT_A, "course-drafts"))
        throw new DOMException("full", "QuotaExceededError");
      return originalSetItem.call(this, key, value);
    });

    expect(() => saveCourseDraft(ACCOUNT_A, course(2))).toThrow();
    expect(readCourseStore(ACCOUNT_A)).toEqual(before);
  });

  it("restaura backups antigos e faz ida e volta dos cursos novos", () => {
    activateCourse(ACCOUNT_A, course());
    saveCourseDraft(ACCOUNT_A, course(2));
    const original = readCourseStore(ACCOUNT_A);

    restoreBackup({ app: "evolua", progress: { ...emptyProgress(), xp: 4 } }, ACCOUNT_A);
    expect(readCourseStore(ACCOUNT_A)).toEqual(original);

    restoreBackup(
      {
        app: "evolua",
        progress: emptyProgress(),
        courses: original.active,
        courseDrafts: original.drafts,
      },
      ACCOUNT_B,
    );
    expect(readCourseStore(ACCOUNT_B)).toEqual(original);
  });
});
