"use client";
import { MathText } from "./math-text";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  PACK_LIMITS,
  qualityWarnings,
  type GamePack,
} from "../lib/game-content";
import {
  buildGamePackAuthoringPrompt,
  type GamePackAuthoringOptions,
} from "../lib/game-authoring";
import {
  AI_PROVIDERS,
  aiPreferenceStorageKey,
  changedActivityIds,
  copyPrompt,
  correctionPrompt,
  storageError,
  validatePackText,
  type PackIssue,
} from "../lib/assisted-authoring";

export function GamePackStudio({
  uid,
  customPacks,
  savePack,
  removePack,
}: {
  uid: string;
  canGenerate?: boolean;
  customPacks: GamePack[];
  savePack: (pack: GamePack) => "created" | "updated";
  removePack: (id: string) => void;
}) {
  const [options, setOptions] = useState<GamePackAuthoringOptions>({
    subject: "",
    materialBase: "",
    audience: "Estudantes em geral",
    objective: "",
    difficulty: "intermediário",
    moduleCount: 3,
    itemsPerGame: 6,
    itemCount: 6,
  });
  const [providerId, setProviderId] = useState<string>("chatgpt");
  const [text, setText] = useState("");
  const [issues, setIssues] = useState<PackIssue[]>([]);
  const [pending, setPending] = useState<GamePack | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [message, setMessage] = useState("");
  const [canShare, setCanShare] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLElement>(null);
  const prompt = useMemo(
    () => buildGamePackAuthoringPrompt(options),
    [options],
  );
  const provider =
    AI_PROVIDERS.find((item) => item.id === providerId) ?? AI_PROVIDERS[0];
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
      const saved = localStorage.getItem(aiPreferenceStorageKey(uid));
      if (AI_PROVIDERS.some((item) => item.id === saved)) setProviderId(saved!);
    } catch {
      setMessage(
        "A preferência de IA não pôde ser carregada. Você pode escolher uma abaixo.",
      );
    }
    setCanShare(typeof navigator.share === "function");
  }, [uid]);

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
  function openAndCopy(value: string) {
    // A abertura ocorre no gesto do usuário, antes da operação assíncrona.
    if (provider.url) {
      try {
        window.open(provider.url, "_blank", "noopener,noreferrer");
      } catch {
        /* O link explícito abaixo permanece disponível. */
      }
    }
    void copyPrompt(value).then(setMessage);
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
    <section className="game-studio" aria-label="Entrada modular">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ENTRADA MODULAR</span>
          <h2>Monte e importe novos jogos</h2>
          <p className="muted">
            Monte o prompt localmente, use uma IA externa para gerar o JSON e
            revise tudo antes de ativar. A Evolua não envia seu material por API;
            dúvidas e analogias ficam para o tutor futuro.
          </p>
        </div>
      </div>
      <div className="studio-columns">
        <section className="panel prompt-builder">
          <span className="step-number">1</span>
          <h3>Prepare e abra sua IA</h3>
          <p>
            Defina o que estudar. O prompt orienta geração, revisão pedagógica e
            correção do arquivo.
          </p>
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
            Material-base
            <textarea
              rows={5}
              value={options.materialBase ?? ""}
              onChange={(event) =>
                setOptions({ ...options, materialBase: event.target.value })
              }
              placeholder="Cole aqui o material que a IA externa deve analisar."
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
                      .value as GamePackAuthoringOptions["difficulty"],
                  })
                }
              >
                {["iniciante", "intermediário", "avançado"].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Itens por jogo
              <select
                value={options.itemsPerGame ?? options.itemCount ?? 6}
                onChange={(event) =>
                  setOptions({
                    ...options,
                    itemsPerGame: Number(event.target.value),
                  })
                }
              >
                {[3, 4, 6, 8, 10, 12].map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="field-label">
            Módulos desejados
            <select
              value={options.moduleCount ?? 3}
              onChange={(event) =>
                setOptions({ ...options, moduleCount: Number(event.target.value) })
              }
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
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
                  setMessage(
                    "A preferência vale nesta sessão; o navegador não permitiu salvá-la.",
                  );
                }
              }}
            >
              {AI_PROVIDERS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
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
          <div className="studio-actions">
            <button
              className="button button-primary"
              onClick={() => openAndCopy(prompt)}
            >
              <MathText>{provider.url ? "Copiar prompt e abrir IA" : "Copiar prompt"}</MathText>
            </button>
            <button
              className="button button-outline"
              onClick={() =>
                download("prompt-evolua.txt", prompt, "text/plain")
              }
            >
              Baixar prompt
            </button>
            {canShare && (
              <button
                className="button button-outline"
                onClick={async () => {
                  try {
                    await navigator.share({
                      title: "Prompt Evolua",
                      text: prompt,
                    });
                  } catch (error) {
                    if (
                      !(
                        error instanceof DOMException &&
                        error.name === "AbortError"
                      )
                    )
                      setMessage(
                        "Compartilhamento indisponível. Use copiar ou baixar.",
                      );
                  }
                }}
              >
                Compartilhar prompt
              </button>
            )}
          </div>
          {provider.url && (
            <p>
              <a
                className="text-button"
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir <MathText>{provider.name}</MathText>
              </a>
            </p>
          )}
          <p className="muted small-text">
            Este é um prompt para IA externa. Cole e envie o texto manualmente;
            o material não é enviado pela Evolua ao abrir o site.
          </p>
        </section>
        <section className="panel pack-importer">
          <span className="step-number">2</span>
          <h3>Cole a resposta ou importe o arquivo</h3>
          <p>
            JSON puro ou envolto em um bloco Markdown. Limite de 1 MB. Seus
            dados atuais são mantidos até a ativação.
          </p>
          <label className="field-label">
            Resposta da IA
            <textarea
              rows={12}
              value={text}
              onChange={(event) => changeText(event.target.value)}
              spellCheck={false}
            />
          </label>
          <div className="studio-actions">
            <button
              className="button button-primary"
              disabled={!text.trim()}
              onClick={() => validate(text)}
            >
              Validar e visualizar
            </button>
            <button
              className="button button-outline"
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
                    <code><MathText>{issue.path}</MathText></code>: <MathText>{issue.message}</MathText>
                  </li>
                ))}
              </ul>
              <><label className="field-label">
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
                  onClick={() => openAndCopy(correction)}
                >
                  <MathText>{provider.url
                    ? "Copiar correção e abrir IA"
                    : "Copiar correção"}</MathText>
                </button>
                <button
                  className="button button-outline"
                  onClick={() =>
                    download("correcao-evolua.txt", correction, "text/plain")
                  }
                >
                  Baixar correção
                </button>
               </div></>
            </div>
          )}
          {customPacks.length > 0 && (
            <div className="custom-pack-list">
              <h4>Pacotes importados</h4>
              {customPacks.map((pack) => (
                <div key={pack.id}>
                  <span>
                    <strong><MathText>{pack.title}</MathText></strong>
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
          <MathText>{message}</MathText>
        </p>
      )}
      {pending && (
        <section
          ref={preview}
          tabIndex={-1}
          className="panel pack-preview"
          aria-label="Prévia do pacote"
        >
          <h3>Prévia: <MathText>{pending.title}</MathText></h3>
          <p><MathText>{pending.description}</MathText></p>
          <p>
            Estrutura válida ·<MathText>{" "}</MathText>
            <MathText>{pending.version === 2
              ? "Referências declaradas"
              : "Pacote legado sem evidências obrigatórias"}</MathText><MathText>{" "}</MathText>
            · revisão editorial {pending.revision ?? "não informada"}
          </p>
          {existing && (
            <p className="inline-message warning">
              Este pacote substituirá “<MathText>{existing.title}</MathText>”. Confira alterações nas
              atividades; IDs mantidos preservam o histórico, mesmo que a
              resposta tenha mudado.
            </p>
          )}
          {changedIds.length > 0 && (
            <p className="inline-message warning">
              Atividades alteradas mantendo o histórico: <MathText>{changedIds.join(", ")}</MathText>
              . Revise especialmente as respostas e explicações desses itens.
            </p>
          )}
          <ul>
            {qualityWarnings(pending).map((warning, index) => (
              <li key={index}><MathText>{warning}</MathText></li>
            ))}
          </ul>
          {pending.sources?.map((source) => (
            <details key={source.id}>
              <summary>Fonte: <MathText>{source.title}</MathText></summary>
              <p><MathText>{source.locator}</MathText></p>
              <blockquote><MathText>{source.excerpt}</MathText></blockquote>
            </details>
          ))}
          {pending.modules.map((module) => (
            <details key={module.id}>
              <summary>
                <MathText>{module.title}</MathText> ·<MathText>{" "}</MathText>
                <MathText>{module.difficulty ?? "Dificuldade não informada"}</MathText> ·<MathText>{" "}</MathText>
                {module.pairs.length +
                  module.trueFalse.length +
                  module.multipleChoice.length}<MathText>{" "}</MathText>
                atividades
              </summary>
              <p><MathText>{module.description}</MathText></p>
              {module.objectives?.map((objective) => (
                <p key={objective.id}>
                  <strong>Objetivo <MathText>{objective.id}</MathText>:</strong><MathText>{" "}</MathText>
                  <MathText>{objective.description}</MathText>
                </p>
              ))}
              {[
                ...module.pairs,
                ...module.trueFalse,
                ...module.multipleChoice,
              ].map((item) => (
                <article key={item.id} className="preview-item">
                  <h4>
                    <MathText>{"prompt" in item
                      ? item.prompt
                      : "statement" in item
                        ? item.statement
                        : item.question}</MathText>
                  </h4>
                  <p>
                    <strong>Resposta: </strong>
                    <MathText>{"options" in item
                      ? item.options[item.correctOptionIndex]
                      : String(item.answer)}</MathText>
                  </p>
                  <p><MathText>{item.explanation}</MathText></p>
                  {"options" in item &&
                    item.options.map((option, index) => (
                      <p key={index}>
                        <MathText>{option}</MathText> —<MathText>{" "}</MathText>
                        <MathText>{item.optionExplanations?.[index] ??
                          "Sem justificativa individual no formato legado."}</MathText>
                      </p>
                    ))}
                  <small>
                    Objetivo: <MathText>{item.objectiveId ?? "não informado"}</MathText> · Fontes:<MathText>{" "}</MathText>
                    <MathText>{item.sourceIds?.join(", ") ?? "não informadas"}</MathText>
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
              disabled={!reviewed}
              onClick={activate}
            >
              <MathText>{existing ? "Confirmar substituição do pacote" : "Ativar pacote"}</MathText>
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
