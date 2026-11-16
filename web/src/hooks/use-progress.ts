"use client";
import { useCallback, useEffect, useState } from "react";
import {
  emptyProgress,
  progressSchema,
  type Progress,
} from "../lib/learning-engine";
import { privateStorageKey } from "../lib/private-storage";

export function useProgress(uid: string) {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [warning, setWarning] = useState("");

  useEffect(() => {
    const key = privateStorageKey(uid, "progress");
    let active = true;
    setProgress(emptyProgress());
    setLoadedUid(null);
    setReady(false);
    setWarning("");
    try {
      const raw = localStorage.getItem(key);
      if (raw && active) setProgress(progressSchema.parse(JSON.parse(raw)));
    } catch {
      if (active) {
        setWarning(
          "Não foi possível carregar seu progresso. Seus dados existentes não serão sobrescritos até a próxima atividade. Você pode importar um backup em Perfil.",
        );
      }
    }
    if (active) {
      setLoadedUid(uid);
      setReady(true);
    }
    const onStorage = (event: StorageEvent) => {
      if (!active || event.key !== key) return;
      try {
        if (event.newValue === null) setProgress(emptyProgress());
        else {
          const parsed = progressSchema.safeParse(JSON.parse(event.newValue));
          if (parsed.success) setProgress(parsed.data);
        }
      } catch {
        /* Ignore an invalid change from another tab. */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [uid]);

  const update = useCallback(
    (change: Progress | ((p: Progress) => Progress)) => {
      setProgress((previous) => {
        const next = typeof change === "function" ? change(previous) : change;
        try {
          localStorage.setItem(
            privateStorageKey(uid, "progress"),
            JSON.stringify(next),
          );
        } catch {
          setWarning(
            "O navegador não permitiu salvar seu progresso. Exporte um backup antes de fechar esta página.",
          );
          return previous;
        }
        return next;
      });
    },
    [uid],
  );

  return {
    progress,
    update,
    ready: ready && loadedUid === uid,
    warning,
    loadRestoredProgress: setProgress,
  };
}
