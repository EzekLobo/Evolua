import { z } from "zod";
import {
  courseEditorialWarnings,
  coursePackSchema,
  normalizeCoursePack,
  summarizeCoursePack,
  validateCoursePack,
  type CoursePack,
  type CourseValidationIssue,
} from "./course-schema";
import { privateStorageKey } from "./private-storage";

export const COURSE_COLLECTION_SCHEMA = "evolua-course-collection" as const;
export const COURSE_COLLECTION_VERSION = 1 as const;

const isoDate = z.string().datetime({ offset: true });

export const storedCourseSchema = z
  .object({
    pack: coursePackSchema,
    importedAt: isoDate,
    updatedAt: isoDate,
  })
  .strict();

export const courseCollectionSchema = z
  .object({
    schema: z.literal(COURSE_COLLECTION_SCHEMA),
    version: z.literal(COURSE_COLLECTION_VERSION),
    items: z.array(storedCourseSchema),
  })
  .strict();

export type StoredCourse = z.infer<typeof storedCourseSchema>;
export type CourseCollection = z.infer<typeof courseCollectionSchema>;
export type CourseStoreSnapshot = {
  active: CourseCollection;
  drafts: CourseCollection;
};

export type CoursePreview = {
  pack: CoursePack;
  summary: ReturnType<typeof summarizeCoursePack>;
  warnings: string[];
  replacement:
    | { kind: "none" }
    | {
        kind: "active" | "draft";
        previousRevision: number;
        revisionChanged: boolean;
      };
};

export type CourseImportPreview =
  | { success: true; preview: CoursePreview }
  | { success: false; errors: CourseValidationIssue[] };

export type CourseKind = "active" | "draft";

export function emptyCourseCollection(): CourseCollection {
  return {
    schema: COURSE_COLLECTION_SCHEMA,
    version: COURSE_COLLECTION_VERSION,
    items: [],
  };
}

export function emptyCourseStoreSnapshot(): CourseStoreSnapshot {
  return { active: emptyCourseCollection(), drafts: emptyCourseCollection() };
}

function collectionKey(uid: string, kind: CourseKind) {
  return privateStorageKey(uid, kind === "active" ? "course-packs" : "course-drafts");
}

function parseCollection(raw: string | null): CourseCollection {
  if (!raw) return emptyCourseCollection();
  return courseCollectionSchema.parse(JSON.parse(raw));
}

export function readCourseStore(uid: string): CourseStoreSnapshot {
  return {
    active: parseCollection(localStorage.getItem(collectionKey(uid, "active"))),
    drafts: parseCollection(localStorage.getItem(collectionKey(uid, "draft"))),
  };
}

function rollbackStorage(previous: ReadonlyArray<readonly [string, string | null]>) {
  for (const [key, stored] of previous) {
    if (stored === null) localStorage.removeItem(key);
    else localStorage.setItem(key, stored);
  }
}

/** Writes both course namespaces and restores the exact previous snapshot on failure. */
export function writeCourseStore(uid: string, snapshot: CourseStoreSnapshot) {
  const parsed: CourseStoreSnapshot = {
    active: courseCollectionSchema.parse(snapshot.active),
    drafts: courseCollectionSchema.parse(snapshot.drafts),
  };
  const entries = [
    [collectionKey(uid, "active"), JSON.stringify(parsed.active)] as const,
    [collectionKey(uid, "draft"), JSON.stringify(parsed.drafts)] as const,
  ];
  const previous = entries.map(([key]) => [key, localStorage.getItem(key)] as const);

  try {
    for (const [key, value] of entries) localStorage.setItem(key, value);
  } catch (error) {
    try {
      rollbackStorage(previous);
    } catch {
      throw Error(
        "O curso não foi salvo e a reversão não pôde ser confirmada. Exporte um backup e confira as permissões de armazenamento.",
      );
    }
    throw error;
  }
  return parsed;
}

function now() {
  return new Date().toISOString();
}

function recordFor(pack: CoursePack, previous?: StoredCourse): StoredCourse {
  const timestamp = now();
  return {
    pack,
    importedAt: previous?.importedAt ?? timestamp,
    updatedAt: timestamp,
  };
}

function withItem(collection: CourseCollection, record: StoredCourse) {
  const items = collection.items.filter(
    (item) => !(item.pack.id === record.pack.id && item.pack.revision === record.pack.revision),
  );
  return { ...collection, items: [...items, record] };
}

export function previewCourseImport(
  value: unknown,
  snapshot: CourseStoreSnapshot = emptyCourseStoreSnapshot(),
): CourseImportPreview {
  const result = validateCoursePack(normalizeCoursePack(value));
  if (!result.success) return { success: false, errors: result.errors };

  const active = snapshot.active.items.find((item) => item.pack.id === result.data.id);
  const draft = snapshot.drafts.items.find((item) => item.pack.id === result.data.id);
  const existing = active ?? draft;
  return {
    success: true,
    preview: {
      pack: result.data,
      summary: summarizeCoursePack(result.data),
      warnings: courseEditorialWarnings(result.data),
      replacement: existing
        ? {
            kind: active ? "active" : "draft",
            previousRevision: existing.pack.revision,
            revisionChanged: existing.pack.revision !== result.data.revision,
          }
        : { kind: "none" },
    },
  };
}

export function saveCourseDraft(uid: string, pack: CoursePack) {
  const current = readCourseStore(uid);
  const previous = current.drafts.items.find(
    (item) => item.pack.id === pack.id && item.pack.revision === pack.revision,
  );
  const next = {
    ...current,
    drafts: withItem(current.drafts, recordFor(pack, previous)),
  };
  return writeCourseStore(uid, next);
}

export function activateCourse(uid: string, pack: CoursePack) {
  const current = readCourseStore(uid);
  const previous = current.active.items.find((item) => item.pack.id === pack.id);
  const next = {
    active: {
      ...current.active,
      items: current.active.items.filter((item) => item.pack.id !== pack.id),
    },
    drafts: {
      ...current.drafts,
      items: current.drafts.items.filter(
        (item) => !(item.pack.id === pack.id && item.pack.revision === pack.revision),
      ),
    },
  };
  next.active = withItem(next.active, recordFor(pack, previous));
  return writeCourseStore(uid, next);
}

export function removeCourse(
  uid: string,
  kind: CourseKind,
  id: string,
  revision?: number,
) {
  const current = readCourseStore(uid);
  const collection = kind === "active" ? current.active : current.drafts;
  const nextCollection = {
    ...collection,
    items: collection.items.filter(
      (item) =>
        item.pack.id !== id ||
        (revision !== undefined && item.pack.revision !== revision),
    ),
  };
  return writeCourseStore(uid, { ...current, [kind]: nextCollection });
}

export function courseCollectionToJson(collection: CourseCollection) {
  return courseCollectionSchema.parse(collection);
}
