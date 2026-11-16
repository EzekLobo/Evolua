/**
 * Contrato de armazenamento privado local.
 *
 * O conteúdo incorporado da aplicação não usa este namespace. Todo dado
 * pertencente a uma conta autenticada deve usar uma chave derivada do UID;
 * nunca há fallback silencioso para uma chave global antiga.
 */
export const PRIVATE_STORAGE_PREFIX = "evolua.user.v1";
export const PRIVATE_STORAGE_VERSION = 1 as const;

export const PRIVATE_STORAGE_RESOURCES = [
  "progress",
  "game-packs",
  "ai-preference",
  "course-packs",
  "course-progress",
  "course-drafts",
  "tutor-state",
  "accompaniment-state",
] as const;

export type PrivateStorageResource =
  (typeof PRIVATE_STORAGE_RESOURCES)[number];

function normalizedUid(uid: string) {
  const value = uid.trim();
  if (!value) throw new Error("Um UID autenticado é obrigatório.");
  return value;
}

/** Returns the only supported key shape for account-owned local data. */
export function privateStorageKey(
  uid: string,
  resource: PrivateStorageResource,
) {
  return `${PRIVATE_STORAGE_PREFIX}:${encodeURIComponent(normalizedUid(uid))}:${resource}`;
}

export function privateStorageKeys(uid: string) {
  return {
    progress: privateStorageKey(uid, "progress"),
    gamePacks: privateStorageKey(uid, "game-packs"),
    aiPreference: privateStorageKey(uid, "ai-preference"),
    coursePacks: privateStorageKey(uid, "course-packs"),
    courseProgress: privateStorageKey(uid, "course-progress"),
    courseDrafts: privateStorageKey(uid, "course-drafts"),
    tutorState: privateStorageKey(uid, "tutor-state"),
    accompanimentState: privateStorageKey(uid, "accompaniment-state"),
  } as const;
}

/** Storage events are accepted only for the currently mounted account. */
export function isPrivateStorageKeyForUid(
  key: string | null,
  uid: string,
  resource: PrivateStorageResource,
) {
  return key === privateStorageKey(uid, resource);
}
