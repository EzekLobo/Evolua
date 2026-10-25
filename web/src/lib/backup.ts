import { z } from "zod";
import { gamePackCollectionSchema } from "./game-content";
import { progressSchema, STORAGE_KEY } from "./learning-engine";
export const PACKS_STORAGE_KEY = "evolua.game-packs.v1";
export const backupSchema = z.object({
  app: z.literal("evolua"),
  progress: progressSchema,
  packs: gamePackCollectionSchema.optional(),
});
export type Backup = z.infer<typeof backupSchema>;

export function restoreBackup(value: Backup) {
  const backup = backupSchema.parse(value);
  const keys =
    backup.packs === undefined
      ? [STORAGE_KEY]
      : [PACKS_STORAGE_KEY, STORAGE_KEY];
  const previous = keys.map((key) => [key, localStorage.getItem(key)] as const);
  try {
    if (backup.packs !== undefined)
      localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify(backup.packs));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.progress));
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
