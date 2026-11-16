"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildGamePackPrompt,
  coursePlanSchema,
  gamePackSchema,
  type CoursePlan,
  PACK_LIMITS,
  qualityWarnings,
  type GamePack,
  type GamePromptOptions,
} from "../lib/game-content";
import {
  changedActivityIds,
  copyPrompt,
  correctionPrompt,
  storageError,
  validatePackText,
  type PackIssue,
} from "../lib/assisted-authoring";

const courseDraftKey = "evolua.course-draft.v1";
type CourseDraft = {
  id: string;
  plan: CoursePlan;
  options: GamePromptOptions;
  model: string;
  modules: Record<number, GamePack["modules"][number]>;
};

export function GamePackStudio({
  customPacks,
  savePack,
  removePack,
}: {
  customPacks: GamePack[];
  savePack: (pack: GamePack) => "created" | "updated";
  removePack: (id: string) => void;
}) {
  const [options, setOptions] = useState<GamePromptOptions>({
    subject: "",
    audience: "Estudantes em geral",
    objective: "",
    difficulty: "intermediário",
  });
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<PackIssue[]>([]);
  const [pending, setPending] = useState<GamePack | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [ownerToken, setOwnerToken] = useState("");
  const [geminiModel, setGeminiModel] = useState("");
  const [draft, setDraft] = useState<CourseDraft | null>(null);
  const generationInProgress = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLElement>(null);
  const prompt = useMemo(() => buildGamePackPrompt(options), [options]);
  const correction = issues.length ? correctionPrompt(text, issues) : "";
  const existing =
    pending && customPacks.find((pack) => pack.id === pending.id);
  const changedIds =
    existing && pending ? changedActivityIds(existing, pending) : [];
  useEffect(() => {
    if (pending) preview.current?.focus();
  }, [pending]);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(courseDraftKey);
      if (saved) {
        const draft = JSON.parse(saved) as CourseDraft;
        const plan = coursePlanSchema.parse(draft.plan);
        setDraft({ ...draft, id: draft.id ?? crypto.randomUUID(), plan });
        setOptions(draft.options);
        setGeminiModel(draft.model);
      }
    } catch {
      setMessage("Não foi possível recuperar o rascunho salvo.");
    }
  }, []);

  function saveDraft(next: CourseDraft) {
    setDraft(next);
    try {
      localStorage.setItem(courseDraftKey, JSON.stringify(next));
    } catch {
      setMessage("O rascunho está disponível nesta tela, mas o navegador não conseguiu salvá-lo.");
    }
  }

  function download(name: string, body: string, type = "application/json") {
    const url = URL.createObjectURL(new Blob([body], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function changeText(value: string) {
    setText(value);
    setPending(null);
    setReviewed(false);
    setIssues([]);
    setMessage("");
  }
  function validate(value: string) {
    const result = validatePackText(value);
    setReviewed(false);
    if (result.success) {
      setPending(result.pack);
      setIssues([]);
      setMessage(
        "Estrutura válida. Confira a prévia e as referências antes de ativar.",
      );
    } else {
      setPending(null);
      setIssues(result.issues);
      setMessage("Corrija os campos indicados e valide novamente.");
    }
  }
  async function readFile(file: File) {
    if (file.size > PACK_LIMITS.bytes) {
      setPending(null);
      setIssues([]);
      setReviewed(false);
      setMessage("Selecione um arquivo de até 1 MB.");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    try {
      const value = await file.text();
      changeText(value);
      validate(value);
    } catch {
      setMessage(
        "Não foi possível ler este arquivo. Tente selecionar novamente.",
      );
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }
  async function generateWithGemini(lessonIndex?: number) {
    const lessonDraft = lessonIndex === undefined ? null : draft;
    const input = lessonDraft?.options ?? options;
    if (generationInProgress.current || !input.subject.trim() || !ownerToken.trim()) return;
    if (lessonIndex !== undefined && !lessonDraft) return;
    if (lessonDraft && !coursePlanSchema.safeParse(lessonDraft.plan).success) {
      setMessage("Preencha todos os campos da ementa e use títulos diferentes.");
      return;
    }
    if (input.subject.length > 4000 || input.audience.length > 240 || input.objective.length > 500) {
      setMessage("Para gerar com Gemini, use até 4.000 caracteres no assunto, 240 no público e 500 no objetivo.");
      return;
    }
    generationInProgress.current = true;
    setGenerating(true);
    setMessage(lessonDraft ? "Gerando aula…" : "Gerando ementa…");
    try {
      const response = await fetch("/api/content-ai/generate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${ownerToken.trim()}`,
        },
        body: JSON.stringify({
          ...input,
          model: (lessonDraft?.model ?? geminiModel).trim() || undefined,
          stage: lessonDraft ? "lesson" : "plan",
          plan: lessonDraft?.plan,
          lessonIndex,
        }),
      });
      if (response.status === 404) {
        setMessage("A geração requer o servidor local com CONTENT_AI_ENABLED=true.");
        return;
      }
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error || "Não foi possível gerar as atividades.");
        return;
      }
      setMessage(lessonDraft ? "Aula gerada." : "Revise a ementa antes de gerar as aulas.");
      if (lessonDraft && lessonIndex !== undefined) {
        const pack = gamePackSchema.parse(result);
        if (pending?.id === lessonDraft.id) changeText("");
        saveDraft({ ...lessonDraft, modules: { ...lessonDraft.modules, [lessonIndex]: pack.modules[0] } });
      } else {
        saveDraft({ id: crypto.randomUUID(), plan: coursePlanSchema.parse(result.plan), options: input, model: geminiModel.trim(), modules: {} });
      }
    } catch {
      setMessage("Não foi possível concluir a geração. Tente novamente.");
    } finally {
      generationInProgress.current = false;
      setGenerating(false);
    }
  }

  function previewCourse() {
    if (!draft) return;
    const modules = draft.plan.skills.map((_, index) => draft.modules[index]);
    if (modules.some(module => !module)) return;
    const generated = JSON.stringify({
      schema: "evolua-game-pack", version: 1, id: draft.id,
      title: draft.plan.title, description: draft.plan.description, modules,
    }, null, 2);
    changeText(generated);
    validate(generated);
  }
  function editSkill(index: number, field: keyof CoursePlan["skills"][number], value: string) {
    if (!draft || generating) return;
    const skills = draft.plan.skills.map((skill, position) =>
      position === index ? { ...skill, [field]: value } : skill,
    );
    const modules = { ...draft.modules };
    delete modules[index];
    if (pending?.id === draft.id) changeText("");
    saveDraft({ ...draft, plan: { ...draft.plan, skills }, modules });
  }
  function activate() {
    if (!pending || !reviewed) return;
    try {
      const result = savePack(pending);
      setMessage(
        result === "created"
          ? `Pacote “${pending.title}” importado e pronto para jogar.`
          : `Pacote “${pending.title}” atualizado com sucesso.`,
      );
      setPending(null);
      setReviewed(false);
    } catch (error) {
      setMessage(
        customPacks.length >= PACK_LIMITS.packs && !existing
          ? `O limite é ${PACK_LIMITS.packs} pacotes. Exporte e exclua um pacote para liberar espaço.`
          : storageError(error),
      );
    }
  }
  return (
    <section className="game-studio" aria-labelledby="create-content-title">
      <h1 id="create-content-title">Criar conteúdo</h1>
      <div className="studio-columns">
        <section className="panel prompt-builder">
          <h2>Preparar assunto</h2>
          <label className="field-label">
            Assunto ou material-base
            <textarea
              rows={3}
              value={options.subject}
              onChange={(event) =>
                setOptions({ ...options, subject: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            Público
            <input
              value={options.audience}
              onChange={(event) =>
                setOptions({ ...options, audience: event.target.value })
              }
            />
          </label>
          <label className="field-label">
            Objetivo de aprendizagem
            <input
              value={options.objective}
              onChange={(event) =>
                setOptions({ ...options, objective: event.target.value })
              }
            />
          </label>
          <div className="studio-field-row">
            <label className="field-label">
              Dificuldade
              <select
                value={options.difficulty}
                onChange={(event) =>
                  setOptions({
                    ...options,
                    difficulty: event.target
                      .value as GamePromptOptions["difficulty"],
                  })
                }
              >
                {["iniciante", "intermediário", "avançado"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <details>
            <summary>Ver prompt</summary>
          <label className="field-label">
            Prompt gerado
            <textarea
              aria-label="Prompt gerado"
              className="generated-prompt"
              rows={8}
              readOnly
              value={prompt}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          </details>
          <details open>
            <summary>Gerar com Gemini</summary>
            <p className="muted small-text">
              Preencha o assunto e informe seu código de proprietário para gerar o curso.
            </p>
            <label className="field-label">
              Código de acesso
              <input type="password" value={ownerToken} onChange={event => setOwnerToken(event.target.value)} />
            </label>
            <label className="field-label">
              Modelo Gemini (opcional)
              <input value={geminiModel} onChange={event => setGeminiModel(event.target.value)} placeholder="Usar modelo do servidor" />
            </label>
            <button
              className="button button-primary"
              disabled={generating || !options.subject.trim() || !ownerToken.trim()}
              onClick={() => void generateWithGemini()}
            >
              {generating ? "Aguarde…" : draft ? "Gerar nova ementa" : "Gerar ementa"}
            </button>
            {draft && (
              <section aria-label="Ementa do rascunho">
                <h3>{draft.plan.title}</h3>
                <p>{Object.keys(draft.modules).length} de {draft.plan.skills.length} aulas geradas.</p>
                <ol>
                  {draft.plan.skills.map((skill, index) => (
                    <li key={index}>
                      <strong>{skill.title}</strong>
                      <details>
                        <summary>Revisar habilidade</summary>
                        <label className="field-label">Título<input value={skill.title} disabled={generating} maxLength={240} onChange={event => editSkill(index, "title", event.target.value)} /></label>
                        <label className="field-label">Objetivo<textarea value={skill.objective} disabled={generating} maxLength={450} onChange={event => editSkill(index, "objective", event.target.value)} /></label>
                        <label className="field-label">Pré-requisitos<textarea value={skill.prerequisites} disabled={generating} maxLength={250} onChange={event => editSkill(index, "prerequisites", event.target.value)} /></label>
                      </details>
                      <button className="button button-outline" disabled={generating || !ownerToken.trim()}
                        onClick={() => void generateWithGemini(index)}>
                        {draft.modules[index] ? "Gerar novamente" : "Gerar aula"}
                      </button>
                    </li>
                  ))}
                </ol>
                <button className="button button-outline" disabled={generating || draft.plan.skills.length >= PACK_LIMITS.modules}
                  onClick={() => {
                    if (pending?.id === draft.id) changeText("");
                    saveDraft({ ...draft, plan: { ...draft.plan, skills: [
                      ...draft.plan.skills,
                      { title: `Nova aula ${draft.plan.skills.length + 1}`, objective: "Defina a habilidade a desenvolver.", prerequisites: "Nenhum." },
                    ] } });
                  }}>
                  Adicionar habilidade
                </button>
                <button className="button button-primary" onClick={previewCourse}
                  disabled={generating || draft.plan.skills.some((_, index) => !draft.modules[index])}>
                  Revisar curso completo
                </button>
              </section>
            )}
          </details>
          <div className="studio-actions">
            <button
              className="button button-outline"
              onClick={() => void copyPrompt(prompt).then(setMessage)}
            >
              Copiar prompt
            </button>
            <button
              className="button button-outline"
              onClick={() =>
                download("prompt-evolua.txt", prompt, "text/plain")
              }
            >
              Baixar prompt
            </button>
          </div>
          <p className="muted small-text">
            Ao gerar aqui, o assunto ou texto informado é enviado ao Gemini.
            Para gerar em outra IA, copie o prompt e importe o resultado.
          </p>
        </section>
        <section className="panel pack-importer">
          <h2>Importar pacote</h2>
          <p>Cole a resposta da IA ou selecione um arquivo JSON de até 1 MB.</p>
          <label className="field-label">
            Resposta da IA
            <textarea
              rows={6}
              disabled={generating}
              value={text}
              onChange={(event) => changeText(event.target.value)}
              spellCheck={false}
            />
          </label>
          <div className="studio-actions">
            <button
              className="button button-primary"
              disabled={generating || !text.trim()}
              onClick={() => validate(text)}
            >
              Validar e visualizar
            </button>
            <button
              className="button button-outline"
              disabled={generating}
              onClick={() => fileInput.current?.click()}
            >
              Importar arquivo JSON
            </button>
          </div>
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="application/json,.json"
            aria-label="Selecionar pacote de jogos"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void readFile(file);
            }}
          />
          {issues.length > 0 && (
            <div role="alert" className="authoring-errors">
              <h4>Campos que precisam de correção</h4>
              <ul>
                {issues.map((issue, index) => (
                  <li key={index}>
                    <code>{issue.path}</code>: {issue.message}
                  </li>
                ))}
              </ul>
              <label className="field-label">
                Prompt de correção
                <textarea
                  aria-label="Prompt de correção"
                  readOnly
                  rows={6}
                  value={correction}
                  onFocus={(event) => event.currentTarget.select()}
                />
              </label>
              <div className="studio-actions">
                <button
                  className="button button-outline"
                  onClick={() => void copyPrompt(correction).then(setMessage)}
                >
                  Copiar correção
                </button>
                <button
                  className="button button-outline"
                  onClick={() =>
                    download("correcao-evolua.txt", correction, "text/plain")
                  }
                >
                  Baixar correção
                </button>
              </div>
            </div>
          )}
          {customPacks.length > 0 && (
            <div className="custom-pack-list">
              <h4>Pacotes importados</h4>
              {customPacks.map((pack) => (
                <div key={pack.id}>
                  <span>
                    <strong>{pack.title}</strong>
                    <small>
                      {pack.modules.length} módulo(s) · v{pack.version}
                    </small>
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`Baixar pacote ${pack.title}`}
                    onClick={() =>
                      download(`${pack.id}.json`, JSON.stringify(pack, null, 2))
                    }
                  >
                    ↓
                  </button>
                  <button
                    className="icon-button danger-icon"
                    aria-label={`Excluir pacote ${pack.title}`}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Excluir o pacote “${pack.title}” deste navegador?`,
                        )
                      )
                        return;
                      try {
                        removePack(pack.id);
                        setMessage(`Pacote “${pack.title}” excluído.`);
                      } catch (error) {
                        setMessage(storageError(error));
                      }
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {message && (
        <p className="inline-message studio-message" role="status">
          {message}
        </p>
      )}
      {pending && (
        <section
          ref={preview}
          tabIndex={-1}
          className="panel pack-preview"
          aria-label="Prévia do pacote"
        >
          <h3>Prévia: {pending.title}</h3>
          <p>{pending.description}</p>
          <p>
            Estrutura válida ·{" "}
            {pending.version === 2
              ? "Referências declaradas"
              : "Pacote legado sem evidências obrigatórias"}{" "}
            · revisão editorial {pending.revision ?? "não informada"}
          </p>
          {existing && (
            <p className="inline-message warning">
              Este pacote substituirá “{existing.title}”. Confira alterações nas
              atividades; IDs mantidos preservam o histórico, mesmo que a
              resposta tenha mudado.
            </p>
          )}
          {changedIds.length > 0 && (
            <p className="inline-message warning">
              Atividades alteradas mantendo o histórico: {changedIds.join(", ")}
              . Revise especialmente as respostas e explicações desses itens.
            </p>
          )}
          <ul>
            {qualityWarnings(pending).map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
          {pending.sources?.map((source) => (
            <details key={source.id}>
              <summary>Fonte: {source.title}</summary>
              <p>{source.locator}</p>
              <blockquote>{source.excerpt}</blockquote>
            </details>
          ))}
          {pending.modules.map((module) => (
            <details key={module.id}>
              <summary>
                {module.title} ·{" "}
                {module.difficulty ?? "Dificuldade não informada"} ·{" "}
                {module.pairs.length +
                  module.trueFalse.length +
                  module.multipleChoice.length}{" "}
                atividades
              </summary>
              <p style={{ whiteSpace: "pre-line" }}>{module.description}</p>
              {module.objectives?.map((objective) => (
                <p key={objective.id}>
                  <strong>Objetivo {objective.id}:</strong>{" "}
                  {objective.description}
                </p>
              ))}
              {[
                ...module.pairs,
                ...module.trueFalse,
                ...module.multipleChoice,
              ].map((item) => (
                <article key={item.id} className="preview-item">
                  <h4>
                    {"prompt" in item
                      ? item.prompt
                      : "statement" in item
                        ? item.statement
                        : item.question}
                  </h4>
                  <p>
                    <strong>Resposta: </strong>
                    {"options" in item
                      ? item.options[item.correctOptionIndex]
                      : String(item.answer)}
                  </p>
                  <p>{item.explanation}</p>
                  {"options" in item &&
                    item.options.map((option, index) => (
                      <p key={index}>
                        {option} —{" "}
                        {item.optionExplanations?.[index] ??
                          "Sem justificativa individual no formato legado."}
                      </p>
                    ))}
                  <small>
                    Objetivo: {item.objectiveId ?? "não informado"} · Fontes:{" "}
                    {item.sourceIds?.join(", ") ?? "não informadas"}
                  </small>
                </article>
              ))}
            </details>
          ))}
          <label className="review-checkbox">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(event) => setReviewed(event.target.checked)}
            />
            Revisei as atividades, as referências e os alertas apresentados.
          </label>
          <div className="studio-actions">
            <button
              className="button button-primary"
              disabled={generating || !reviewed}
              onClick={activate}
            >
              {existing ? "Confirmar substituição do pacote" : "Ativar pacote"}
            </button>
            <button
              className="button button-outline"
              onClick={() =>
                download(`${pending.id}.json`, JSON.stringify(pending, null, 2))
              }
            >
              Baixar JSON validado
            </button>
            <button
              className="button button-outline"
              onClick={() => setPending(null)}
            >
              Fechar prévia
            </button>
          </div>
        </section>
      )}
    </section>
  );
}
