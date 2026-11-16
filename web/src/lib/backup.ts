import { z } from "zod";
import { gamePackCollectionSchema } from "./game-content";
import { progressSchema } from "./learning-engine";
import { privateStorageKeys } from "./private-storage";
import { courseCollectionSchema } from "./course-store";

/** Legacy key kept for compatibility with pre-EP-110 integrations. */
export const PACKS_STORAGE_KEY = "evolua.game-packs.v1";
export const backupSchema = z.object({
  app: z.literal("evolua"),
  progress: progressSchema,
  packs: gamePackCollectionSchema.optional(),
  courses: courseCollectionSchema.optional(),
  courseDrafts: courseCollectionSchema.optional(),
});
export type Backup = z.infer<typeof backupSchema>;

export function restoreBackup(value: Backup, uid: string) {
  const backup = backupSchema.parse(value);
  const scopedKeys = privateStorageKeys(uid);
  const keys =
    [
      scopedKeys.progress,
      ...(backup.packs === undefined ? [] : [scopedKeys.gamePacks]),
      ...(backup.courses === undefined ? [] : [scopedKeys.coursePacks]),
      ...(backup.courseDrafts === undefined ? [] : [scopedKeys.courseDrafts]),
    ];
  const previous = keys.map((key) => [key, localStorage.getItem(key)] as const);
  try {
    if (backup.packs !== undefined)
      localStorage.setItem(scopedKeys.gamePacks, JSON.stringify(backup.packs));
    if (backup.courses !== undefined)
      localStorage.setItem(scopedKeys.coursePacks, JSON.stringify(backup.courses));
    if (backup.courseDrafts !== undefined)
      localStorage.setItem(
        scopedKeys.courseDrafts,
        JSON.stringify(backup.courseDrafts),
      );
    localStorage.setItem(scopedKeys.progress, JSON.stringify(backup.progress));
  } catch (error) {
    try {
      for (const [key, stored] of previous) {
        if (localStorage.getItem(key) === stored) continue;
        if (stored === null) localStorage.removeItem(key);
        else localStorage.setItem(key, stored);
      }
    } catch {
      throw Error(
        "A restauração falhou e a reversão não pôde ser confirmada. Mantenha o backup e confira as permissões de armazenamento antes de recarregar.",
      );
    }
    throw error;
  }
  return backup;
}
