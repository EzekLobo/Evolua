"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  builtInGamePack,
  gamePackCollectionSchema,
  type GamePack,
} from "../lib/game-content";
import { PACKS_STORAGE_KEY } from "../lib/backup";

export const GAME_PACKS_STORAGE_KEY = PACKS_STORAGE_KEY;

export function useGamePacks() {
  const [customPacks, setCustomPacks] = useState<GamePack[]>([]);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(GAME_PACKS_STORAGE_KEY);
        setCustomPacks(
          stored ? gamePackCollectionSchema.parse(JSON.parse(stored)) : [],
        );
        setWarning("");
      } catch {
        setWarning(
          "Não foi possível carregar os pacotes. Confira o armazenamento ou restaure um backup; os dados existentes não foram sobrescritos.",
        );
      }
    };
    load();
    const sync = (event: StorageEvent) => {
      if (event.key === GAME_PACKS_STORAGE_KEY || event.key === null) load();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const persist = useCallback((packs: GamePack[]) => {
    const parsed = gamePackCollectionSchema.parse(packs);
    localStorage.setItem(GAME_PACKS_STORAGE_KEY, JSON.stringify(parsed));
    setCustomPacks(parsed);
  }, []);

  const savePack = useCallback(
    (pack: GamePack) => {
      const stored = localStorage.getItem(GAME_PACKS_STORAGE_KEY);
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
    [persist],
  );

  const removePack = useCallback(
    (id: string) => {
      const stored = localStorage.getItem(GAME_PACKS_STORAGE_KEY);
      const latest = stored
        ? gamePackCollectionSchema.parse(JSON.parse(stored))
        : [];
      persist(latest.filter((pack) => pack.id !== id));
    },
    [persist],
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
