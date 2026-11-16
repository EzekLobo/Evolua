import { z } from "zod";
import { gamePackCollectionSchema } from "./game-content";
import { progressSchema } from "./learning-engine";
import { privateStorageKeys } from "./private-storage";

/** Legacy key kept for compatibility with pre-EP-110 integrations. */
export const PACKS_STORAGE_KEY = "evolua.game-packs.v1";
export const backupSchema = z.object({
  app: z.literal("evolua"),
  progress: progressSchema,
  packs: gamePackCollectionSchema.optional(),
});
export type Backup = z.infer<typeof backupSchema>;

export function restoreBackup(value: Backup, uid: string) {
  const backup = backupSchema.parse(value);
  const scopedKeys = privateStorageKeys(uid);
  const keys =
    backup.packs === undefined
      ? [scopedKeys.progress]
      : [scopedKeys.gamePacks, scopedKeys.progress];
  const previous = keys.map((key) => [key, localStorage.getItem(key)] as const);
  try {
    if (backup.packs !== undefined)
      localStorage.setItem(scopedKeys.gamePacks, JSON.stringify(backup.packs));
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
