"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  COURSE_PACK_LIMITS,
  type CoursePack,
} from "../lib/course-schema";
import {
  buildCoursePackPrompt,
  type CourseLevel,
  type CoursePromptOptions,
} from "../lib/course-authoring";
import {
  AI_PROVIDERS,
  aiPreferenceStorageKey,
  copyPrompt,
} from "../lib/assisted-authoring";
import type {
  CourseImportPreview,
  CoursePreview,
  StoredCourse,
} from "../lib/course-store";

export type CourseManagerProps = {
  uid?: string;
  activeCourses: StoredCourse[];
  drafts: StoredCourse[];
  preview: (value: unknown) => CourseImportPreview;
  saveDraft: (pack: CoursePack) => unknown;
  activate: (pack: CoursePack) => unknown;
  remove: (kind: "active" | "draft", id: string, revision?: number) => unknown;
};

function downloadText(name: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: "text/plain" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const CoursePromptBuilder = memo(function CoursePromptBuilder({ uid }: { uid: string }) {
  const [options, setOptions] = useState<CoursePromptOptions>({
    subject: "",
    materialBase: "",
    audience: "Estudantes em geral",
    priorKnowledge: [],
    objective: "",
    level: "intermediario",
    scope: [],
    exclusions: [],
    depth: "Completa, progressiva e suficiente para explicar conceitos, aplicação e limites",
    moduleCount: 4,
    lessonsPerModule: 3,
  });
  const [providerId, setProviderId] = useState<string>("chatgpt");
  const [message, setMessage] = useState("");
  const prompt = useMemo(() => buildCoursePackPrompt(options), [options]);
  const provider =
    AI_PROVIDERS.find((item) => item.id === providerId) ?? AI_PROVIDERS[0];

  useEffect(() => {
    try {
      const saved = localStorage.getItem(aiPreferenceStorageKey(uid));
      if (AI_PROVIDERS.some((item) => item.id === saved)) setProviderId(saved!);
    } catch {
      setMessage("A preferência de IA vale somente nesta sessão.");
    }
  }, [uid]);

  function update<K extends keyof CoursePromptOptions>(
    key: K,
    value: CoursePromptOptions[K],
  ) {
    setOptions((current) => ({ ...current, [key]: value }));
  }

  function openAndCopy() {
    if (provider.url) window.open(provider.url, "_blank", "noopener,noreferrer");
    void copyPrompt(prompt).then(setMessage);
  }

  return (
    <section className="panel prompt-builder course-prompt-builder" aria-labelledby="course-prompt-title">
      <span className="step-number">1</span>
      <div className="authoring-panel-heading">
        <div>
          <span className="eyebrow">AUTORIA COM IA EXTERNA</span>
          <h3 id="course-prompt-title">Monte o plano do seu curso</h3>
          <p>
            A Evolua prepara um prompt completo. A IA externa monta o JSON; a
            aplicação valida a compatibilidade antes da ativação.
          </p>
        </div>
        <Sparkles size={22} aria-hidden="true" />
      </div>
      <div className="course-prompt-fields">
        <label className="field-label">
          Assunto ou material-base
          <textarea
            rows={4}
            value={options.subject}
            onChange={(event) => update("subject", event.target.value)}
            placeholder="Ex.: metodologia científica, com o material de apoio abaixo"
          />
        </label>
        <label className="field-label">
          Material-base para a IA revisar
          <textarea
            rows={7}
            value={options.materialBase}
            onChange={(event) => update("materialBase", event.target.value)}
            placeholder="Cole aqui o texto, resumo ou referências que devem fundamentar o curso."
          />
        </label>
        <div className="studio-field-row">
          <label className="field-label">
            Público
            <input
              value={options.audience}
              onChange={(event) => update("audience", event.target.value)}
            />
          </label>
          <label className="field-label">
            Nível
            <select
              value={options.level}
              onChange={(event) =>
                update("level", event.target.value as CourseLevel)
              }
            >
              <option value="iniciante">Iniciante</option>
              <option value="intermediario">Intermediário</option>
              <option value="avancado">Avançado</option>
            </select>
          </label>
        </div>
        <label className="field-label">
          Objetivo de aprendizagem
          <input
            value={options.objective}
            onChange={(event) => update("objective", event.target.value)}
            placeholder="O que o aluno deverá compreender e conseguir fazer?"
          />
        </label>
        <div className="studio-field-row">
          <label className="field-label">
            Módulos-alvo
            <select
              value={options.moduleCount}
              onChange={(event) => update("moduleCount", Number(event.target.value))}
            >
              {[1, 2, 3, 4, 6, 8].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Aulas por módulo
            <select
              value={options.lessonsPerModule}
              onChange={(event) =>
                update("lessonsPerModule", Number(event.target.value))
              }
            >
              {[1, 2, 3, 4, 6].map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="field-label">
          Minha IA preferida
          <select
            value={provider.id}
            onChange={(event) => {
              setProviderId(event.target.value);
              try {
                localStorage.setItem(
                  aiPreferenceStorageKey(uid),
                  event.target.value,
                );
              } catch {
                setMessage("A preferência de IA vale somente nesta sessão.");
              }
            }}
          >
            {AI_PROVIDERS.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="field-label">
        Prompt gerado para o curso
        <textarea
          aria-label="Prompt gerado para o curso"
          className="generated-prompt"
          rows={10}
          readOnly
          value={prompt}
          onFocus={(event) => event.currentTarget.select()}
        />
      </label>
      <div className="studio-actions">
        <button className="button button-primary" onClick={openAndCopy}>
          <Copy size={16} /> Copiar prompt e abrir IA
        </button>
        <button
          className="button button-outline"
          onClick={() => downloadText("prompt-evolua-curso.txt", prompt)}
        >
          <Download size={16} /> Baixar prompt
        </button>
        {provider.url && (
          <a
            className="text-button"
            href={provider.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Abrir {provider.name} <ExternalLink size={14} />
          </a>
        )}
      </div>
      {message && <p className="inline-message" role="status">{message}</p>}
      <p className="muted small-text">
        O material não é enviado automaticamente pela Evolua. Depois, cole o
        JSON retornado no importador abaixo para revisar a compatibilidade.
      </p>
    </section>
  );
});

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
  uid,
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
  const [courseText, setCourseText] = useState("");

  function validateText(value: string) {
    setErrors([]);
    setPending(null);
    setConfirmed(false);
    try {
      if (new TextEncoder().encode(value).byteLength > COURSE_PACK_LIMITS.bytes)
        throw Error("O arquivo excede o limite de 2 MB.");
      const clean = value.replace(/^\uFEFF/, "").trim().replace(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i, "$1");
      const result = preview(JSON.parse(clean));
      if (result.success) setPending(result.preview);
      else setErrors(result.errors.map((error) => `${error.formattedPath}: ${error.message}`));
    } catch (error) {
      setErrors([error instanceof Error ? error.message : "JSON inválido."]);
    }
  }

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
          <span className="eyebrow">CURSOS E ESTUDO GUIADO</span>
          <h2 id="course-manager-title">Crie, importe e estude</h2>
          <p>
            Monte o conteúdo com o prompt de autoria ou importe um JSON pronto,
            revise a prévia e escolha entre manter como rascunho ou ativar no
            seu catálogo pessoal.
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

      <CoursePromptBuilder uid={uid ?? ""} />
      <section className="panel course-prompt-builder" aria-label="Importar curso">
        <span className="step-number">2</span>
        <h3>Cole o curso retornado pela IA</h3>
        <label className="field-label">
          JSON do curso
          <textarea rows={10} value={courseText} onChange={(event) => { setCourseText(event.target.value); setPending(null); setConfirmed(false); }} />
        </label>
        <div className="studio-actions">
          <button className="button button-primary" disabled={!courseText.trim()} onClick={() => validateText(courseText)}>Validar e visualizar curso</button>
          <button className="button button-outline" onClick={() => input.current?.click()}>Importar arquivo JSON</button>
        </div>
      </section>

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
