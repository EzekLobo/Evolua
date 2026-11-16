"use client";

import { useCallback, useEffect, useState } from "react";
import {
  activateCourse,
  emptyCourseStoreSnapshot,
  previewCourseImport,
  readCourseStore,
  removeCourse,
  saveCourseDraft,
  type CourseImportPreview,
  type CourseKind,
  type CourseStoreSnapshot,
  writeCourseStore,
} from "../lib/course-store";
import type { CoursePack } from "../lib/course-schema";
import { privateStorageKey } from "../lib/private-storage";

export function useCourses(uid: string) {
  const [store, setStore] = useState<CourseStoreSnapshot>(emptyCourseStoreSnapshot);
  const [ready, setReady] = useState(false);
  const [loadedUid, setLoadedUid] = useState<string | null>(null);
  const [warning, setWarning] = useState("");

  const reload = useCallback(() => {
    const next = readCourseStore(uid);
    setStore(next);
    setWarning("");
    return next;
  }, [uid]);

  useEffect(() => {
    let active = true;
    setStore(emptyCourseStoreSnapshot());
    setReady(false);
    setLoadedUid(null);
    setWarning("");
    try {
      const next = readCourseStore(uid);
      if (active) setStore(next);
    } catch {
      if (active)
        setWarning(
          "Não foi possível carregar seus cursos pessoais. O estado existente não foi sobrescrito; restaure um backup válido em Perfil.",
        );
    }
    if (active) {
      setLoadedUid(uid);
      setReady(true);
    }

    const keys = new Set([
      privateStorageKey(uid, "course-packs"),
      privateStorageKey(uid, "course-drafts"),
    ]);
    const onStorage = (event: StorageEvent) => {
      if (!active || !event.key || !keys.has(event.key)) return;
      try {
        reload();
      } catch {
        setWarning(
          "Uma alteração externa de cursos foi ignorada porque não passou pela validação; o estado atual foi preservado.",
        );
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [reload, uid]);

  const preview = useCallback(
    (value: unknown): CourseImportPreview => {
      let current = store;
      try {
        current = readCourseStore(uid);
      } catch {
        /* The preview can still explain the imported package without replacing storage. */
      }
      return previewCourseImport(value, current);
    },
    [store, uid],
  );

  const persist = useCallback(
    (next: CourseStoreSnapshot) => {
      try {
        const saved = writeCourseStore(uid, next);
        setStore(saved);
        setWarning("");
        return saved;
      } catch (error) {
        setWarning(
          "Não foi possível salvar o curso. O estado anterior foi preservado; exporte um backup antes de tentar novamente.",
        );
        throw error;
      }
    },
    [uid],
  );

  const saveDraft = useCallback(
    (pack: CoursePack) => {
      const saved = saveCourseDraft(uid, pack);
      setStore(saved);
      setWarning("");
      return saved;
    },
    [uid],
  );

  const activate = useCallback(
    (pack: CoursePack) => {
      const saved = activateCourse(uid, pack);
      setStore(saved);
      setWarning("");
      return saved;
    },
    [uid],
  );

  const remove = useCallback(
    (kind: CourseKind, id: string, revision?: number) => {
      const saved = removeCourse(uid, kind, id, revision);
      setStore(saved);
      setWarning("");
      return saved;
    },
    [uid],
  );

  return {
    activeCourses: store.active.items,
    drafts: store.drafts.items,
    store,
    ready: ready && loadedUid === uid,
    warning,
    preview,
    saveDraft,
    activate,
    remove,
    reload,
    persist,
    loadRestoredCourses: reload,
  };
}
