"use client";
import { useCallback, useEffect, useState } from "react";
import {
  emptyProgress,
  progressSchema,
  STORAGE_KEY,
  type Progress,
} from "../lib/learning-engine";

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [warning, setWarning] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProgress(progressSchema.parse(JSON.parse(raw)));
    } catch {
      setWarning(
        "Não foi possível carregar seu progresso. Seus dados existentes não serão sobrescritos até a próxima atividade. Você pode importar um backup em Perfil.",
      );
    }
    setReady(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = progressSchema.safeParse(JSON.parse(e.newValue));
          if (parsed.success) setProgress(parsed.data);
        } catch {
          /* Ignore an invalid change from another tab. */
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const update = useCallback(
    (change: Progress | ((p: Progress) => Progress)) => {
      setProgress((previous) => {
        const next = typeof change === "function" ? change(previous) : change;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          setWarning(
            "O navegador não permitiu salvar seu progresso. Exporte um backup antes de fechar esta página.",
          );
        }
        return next;
      });
    },
    [],
  );
  return {
    progress,
    update,
    ready,
    warning,
    loadRestoredProgress: setProgress,
  };
}
