"use client";

import { useRef, useState } from "react";
import { Check, FileJson, Trash2, Upload, X } from "lucide-react";
import {
  COURSE_PACK_LIMITS,
  type CoursePack,
} from "../lib/course-schema";
import type {
  CourseImportPreview,
  CoursePreview,
  StoredCourse,
} from "../lib/course-store";

export type CourseManagerProps = {
  activeCourses: StoredCourse[];
  drafts: StoredCourse[];
  preview: (value: unknown) => CourseImportPreview;
  saveDraft: (pack: CoursePack) => unknown;
  activate: (pack: CoursePack) => unknown;
  remove: (kind: "active" | "draft", id: string, revision?: number) => unknown;
};

function statusLabel(status: CoursePack["editorial"]["status"]) {
  return status === "draft"
    ? "Rascunho editorial"
    : status === "reviewed"
      ? "Revisado"
      : "Aprovado";
}

function PreviewDetails({ preview }: { preview: CoursePreview }) {
  const replacement = preview.replacement;
  const revisionChanged =
    replacement.kind !== "none" && replacement.revisionChanged;
  return (
    <div className="course-preview" data-testid="course-preview">
      <div className="course-preview-heading">
        <div>
          <span className="eyebrow">PRÉVIA DO CURSO</span>
          <h3>{preview.pack.title}</h3>
          <p>{preview.pack.description}</p>
        </div>
        <span className="tag">Revisão {preview.pack.revision}</span>
      </div>
      <div className="course-summary-grid">
        <span>
          <strong>{preview.summary.modules}</strong> módulos
        </span>
        <span>
          <strong>{preview.summary.lessons}</strong> aulas
        </span>
        <span>
          <strong>{preview.summary.blocks}</strong> blocos
        </span>
        <span>
          <strong>{preview.summary.activities}</strong> atividades
        </span>
      </div>
      <p className="muted small-text">
        Nível {preview.pack.level} · {statusLabel(preview.pack.editorial.status)}
      </p>
      {replacement.kind !== "none" && (
        <div className="inline-message warning" role="status">
          {replacement.kind === "active" ? "O curso ativo" : "O rascunho"} de
          revisão {replacement.previousRevision} será substituído por esta
          revisão {revisionChanged ? "nova" : "atualizada"}.
        </div>
      )}
      {preview.warnings.length > 0 && (
        <div className="authoring-errors course-warnings">
          <strong>Antes de usar</strong>
          <ul>
            {preview.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function CourseManager({
  activeCourses,
  drafts,
  preview,
  saveDraft,
  activate,
  remove,
}: CourseManagerProps) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<CoursePreview | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  async function importFile(file: File) {
    setMessage("");
    setErrors([]);
    try {
      if (file.size > COURSE_PACK_LIMITS.bytes)
        throw Error(`O arquivo excede ${COURSE_PACK_LIMITS.bytes} bytes.`);
      const result = preview(JSON.parse(await file.text()));
      if (!result.success) {
        setErrors(result.errors.map((error) => `${error.formattedPath}: ${error.message}`));
        setPending(null);
      } else {
        setPending(result.preview);
        setConfirmed(false);
      }
    } catch (error) {
      setPending(null);
      setErrors([
        error instanceof SyntaxError
          ? "$: o arquivo não contém JSON válido"
          : error instanceof Error
            ? `$: ${error.message}`
            : "$: não foi possível ler o arquivo",
      ]);
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  function closePreview() {
    setPending(null);
    setConfirmed(false);
  }

  function save(action: "draft" | "active") {
    if (!pending || (action === "active" && !confirmed)) return;
    try {
      if (action === "draft") saveDraft(pending.pack);
      else activate(pending.pack);
      setMessage(
        action === "draft"
          ? "Rascunho salvo. Ele ainda não altera seu catálogo ativo."
          : "Curso ativado. Abra as aulas abaixo para estudar e praticar.",
      );
      closePreview();
    } catch {
      setMessage("Não foi possível salvar. O estado anterior foi preservado.");
    }
  }

  function removeCourse(kind: "active" | "draft", course: StoredCourse) {
    if (
      window.confirm(
        `Remover ${course.pack.title} (revisão ${course.pack.revision})? O progresso e o XP não serão apagados.`,
      )
    ) {
      try {
        remove(kind, course.pack.id, course.pack.revision);
        setMessage("Curso removido. O progresso e o XP foram preservados.");
      } catch {
        setMessage("Não foi possível remover o curso; o estado anterior foi preservado.");
      }
    }
  }

  return (
    <section className="panel course-manager" aria-labelledby="course-manager-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow">CURSOS IMPORTADOS</span>
          <h2 id="course-manager-title">Novo curso e estudo guiado</h2>
          <p className="muted small-text">
            A importacao e o estudo ficam disponiveis para usuarios autorizados;
            somente a geracao automatica por IA/API e restrita ao administrador.
          </p>
          <p>
            Importe um JSON estruturado, revise a prévia e escolha entre manter
            como rascunho ou ativar no seu catálogo pessoal.
          </p>
        </div>
        <button
          className="button button-primary"
          onClick={() => input.current?.click()}
        >
          <Upload size={16} /> Novo curso
        </button>
        <input
          ref={input}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          aria-label="Selecionar curso JSON"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importFile(file);
          }}
        />
      </div>

      {errors.length > 0 && (
        <div className="authoring-errors" role="alert">
          <strong>Curso não importado</strong>
          <p>Corrija os caminhos abaixo e tente novamente:</p>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {message && <p className="inline-message" role="status">{message}</p>}

      {pending && (
        <div className="course-preview-shell">
          <PreviewDetails preview={pending} />
          <label className="review-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              Confirmo que revisei esta prévia e quero gravar esta revisão na
              conta atual.
            </span>
          </label>
          <div className="modal-actions">
            <button className="button button-outline" onClick={closePreview}>
              <X size={16} /> Cancelar
            </button>
            <button className="button button-outline" onClick={() => save("draft")}>
              Salvar rascunho
            </button>
            <button
              className="button button-primary"
              disabled={!confirmed}
              onClick={() => save("active")}
            >
              <Check size={16} /> Ativar curso
            </button>
          </div>
        </div>
      )}

      <div className="course-list" aria-live="polite">
        {activeCourses.length === 0 && drafts.length === 0 ? (
          <p className="muted">Nenhum curso pessoal importado ainda.</p>
        ) : (
          <>
            {activeCourses.map((course) => (
              <CourseRow
                key={`active-${course.pack.id}-${course.pack.revision}`}
                kind="active"
                course={course}
                onRemove={() => removeCourse("active", course)}
              />
            ))}
            {drafts.map((course) => (
              <CourseRow
                key={`draft-${course.pack.id}-${course.pack.revision}`}
                kind="draft"
                course={course}
                onRemove={() => removeCourse("draft", course)}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}

function CourseRow({
  kind,
  course,
  onRemove,
}: {
  kind: "active" | "draft";
  course: StoredCourse;
  onRemove: () => void;
}) {
  return (
    <article className="course-row">
      <span className="round-icon lime"><FileJson size={19} /></span>
      <div>
        <h3>{course.pack.title}</h3>
        <p>
          Revisão {course.pack.revision} · {course.pack.modules.length} módulo(s) ·{" "}
          {kind === "active" ? "ativo no catálogo" : "rascunho pessoal"}
        </p>
      </div>
      <span className="tag">{kind === "active" ? "Ativo" : "Rascunho"}</span>
      <button className="icon-button" aria-label={`Remover ${course.pack.title}`} onClick={onRemove}>
        <Trash2 size={17} />
      </button>
    </article>
  );
}
