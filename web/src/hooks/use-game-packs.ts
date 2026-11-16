"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  builtInGamePack,
  gamePackCollectionSchema,
  type GamePack,
} from "../lib/game-content";
import { PACKS_STORAGE_KEY } from "../lib/backup";
import { privateStorageKey } from "../lib/private-storage";

/** Legacy key kept for old callers; runtime storage is UID-scoped. */
export const GAME_PACKS_STORAGE_KEY = PACKS_STORAGE_KEY;

export function useGamePacks(uid: string) {
  const [customPacks, setCustomPacks] = useState<GamePack[]>([]);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const key = privateStorageKey(uid, "game-packs");
    let active = true;
    setCustomPacks([]);
    setWarning("");
    const load = () => {
      try {
        const stored = localStorage.getItem(key);
        if (!active) return;
        setCustomPacks(
          stored ? gamePackCollectionSchema.parse(JSON.parse(stored)) : [],
        );
        setWarning("");
      } catch {
        if (active) {
          setWarning(
            "Não foi possível carregar os pacotes. Confira o armazenamento ou restaure um backup; os dados existentes não foram sobrescritos.",
          );
        }
      }
    };
    load();
    const sync = (event: StorageEvent) => {
      if (event.key === key) load();
    };
    window.addEventListener("storage", sync);
    return () => {
      active = false;
      window.removeEventListener("storage", sync);
    };
  }, [uid]);

  const persist = useCallback(
    (packs: GamePack[]) => {
      const parsed = gamePackCollectionSchema.parse(packs);
      localStorage.setItem(
        privateStorageKey(uid, "game-packs"),
        JSON.stringify(parsed),
      );
      setCustomPacks(parsed);
    },
    [uid],
  );

  const savePack = useCallback(
    (pack: GamePack) => {
      const stored = localStorage.getItem(
        privateStorageKey(uid, "game-packs"),
      );
      const latest = stored
        ? gamePackCollectionSchema.parse(JSON.parse(stored))
        : [];
      const existing = latest.findIndex((item) => item.id === pack.id);
      const next = [...latest];
      if (existing >= 0) next[existing] = pack;
      else next.push(pack);
      persist(next);
      return existing >= 0 ? "updated" : "created";
    },
    [persist, uid],
  );

  const removePack = useCallback(
    (id: string) => {
      const stored = localStorage.getItem(
        privateStorageKey(uid, "game-packs"),
      );
      const latest = stored
        ? gamePackCollectionSchema.parse(JSON.parse(stored))
        : [];
      persist(latest.filter((pack) => pack.id !== id));
    },
    [persist, uid],
  );

  const packs = useMemo(() => [builtInGamePack, ...customPacks], [customPacks]);

  return {
    packs,
    customPacks,
    savePack,
    removePack,
    warning,
    loadRestoredPacks: setCustomPacks,
  };
}
