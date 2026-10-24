"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { content } from "../lib/content";
import {
  dateKey,
  isDue,
  isError,
  recordAttempt,
  shuffled,
  type Progress,
} from "../lib/learning-engine";
import type { Flashcard, Quiz, Source } from "../lib/content-schema";
import type { SessionConfig, StartSession } from "./dashboard";
import { PageHeading, ProgressBar, SourceButton } from "./ui";
type Entry = { kind: "card"; item: Flashcard } | { kind: "quiz"; item: Quiz };
type Result = { entry: Entry; correct: boolean };

export function SessionPicker({
  kind,
  progress,
  start,
}: {
  kind: "card" | "quiz" | "review";
  progress: Progress;
  start: StartSession;
}) {
  const [topicId, setTopicId] = useState("");
  const pending = [...content.flashcards, ...content.quizzes].filter((q) =>
    isDue(progress, q.id),
  ).length;
  const errors = [...content.flashcards, ...content.quizzes].filter((q) =>
    isError(progress, q.id),
  ).length;
  const title =
    kind === "card"
      ? "Uma ideia de cada vez."
      : kind === "quiz"
        ? "Desafie o que você sabe."
        : "Relembrar é evoluir.";
  return (
    <>
      <PageHeading
        eyebrow={
          kind === "card"
            ? "FLASHCARDS"
            : kind === "quiz"
              ? "PRÁTICA ATIVA"
              : "REVISÃO ESPAÇADA"
        }
        title={title}
        description={
          kind === "review"
            ? "Revisite os conceitos no momento certo e transforme erros em aprendizado."
            : "Escolha um assunto, encontre seu ritmo e comece uma nova rodada."
        }
      />
      <div className="picker-layout">
        <section className="panel session-picker">
          <span className="round-icon large lime">
            {kind === "quiz" ? (
              <Target size={30} />
            ) : kind === "review" ? (
              <RotateCcw size={30} />
            ) : (
              <Layers size={30} />
            )}
          </span>
          <h2>
            {kind === "review"
              ? "Seu conhecimento, cada vez mais forte"
              : kind === "quiz"
                ? "Pronto para um novo desafio?"
                : "Dê um impulso à sua memória"}
          </h2>
          <p>
            {kind === "review"
              ? `${pending} atividades aguardam revisão. A fila inclui cards e quizzes que você já praticou.`
              : kind === "quiz"
                ? `${content.quizzes.length} questões, feedback por alternativa e aprendizado a cada resposta.`
                : `${content.flashcards.length} cards para aprender, explicar e conectar conceitos.`}
          </p>
          {kind !== "review" && (
            <label className="field-label">
              Qual assunto você quer praticar?
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
              >
                <option value="">Todos os assuntos</option>
                {content.topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className="button button-primary full"
            disabled={kind === "review" && !pending}
            onClick={() => start({ kind, topicId: topicId || undefined })}
          >
            {kind === "review" ? "Começar revisão" : "Começar rodada"}
            <ArrowRight size={18} />
          </button>
          {kind === "quiz" && (
            <button
              className="button button-outline full"
              onClick={() =>
                start({ kind: "exam", topicId: topicId || undefined })
              }
            >
              <Trophy size={17} /> Desafio de até 10 perguntas
            </button>
          )}
          {kind === "review" && (
            <button
              className="button button-outline full"
              disabled={!errors}
              onClick={() => start({ kind: "errors" })}
            >
              Revisar apenas erros ({errors})<ArrowRight size={16} />
            </button>
          )}
          <span className="muted small-text">
            <Clock size={14} />{" "}
            {kind === "review"
              ? "A próxima data é ajustada após cada resposta."
              : "Sem cronômetro. Aprenda no seu tempo."}
          </span>
        </section>
        <section className="picker-tips">
          <span className="eyebrow">COMO FUNCIONA</span>
          <h2>
            {kind === "card"
              ? "Aprender vai além de reconhecer."
              : "Um novo passo a cada tentativa."}
          </h2>
          {(kind === "card"
            ? [
                [
                  "01",
                  "Tente lembrar",
                  "Leia a pergunta e formule uma resposta antes de virar o card.",
                ],
                [
                  "02",
                  "Confira e reflita",
                  "Compare sua resposta e consulte a fonte quando precisar.",
                ],
                [
                  "03",
                  "Avalie sua confiança",
                  "Sua autoavaliação ajuda a definir a próxima revisão.",
                ],
              ]
            : kind === "quiz"
              ? [
                  [
                    "01",
                    "Escolha uma alternativa",
                    "Pratique sem medo de errar.",
                  ],
                  [
                    "02",
                    "Entenda o porquê",
                    "Cada opção tem uma explicação para aprofundar o conceito.",
                  ],
                  [
                    "03",
                    "Consolide a memória",
                    "Questões que precisam de atenção voltam na revisão.",
                  ],
                ]
              : [
                  [
                    "01",
                    "Revise no momento certo",
                    "Acertos consecutivos aumentam o intervalo: 1, 3, 7, 14 e 30 dias.",
                  ],
                  [
                    "02",
                    "Dê atenção aos erros",
                    "Um erro traz a atividade para a fila de hoje.",
                  ],
                  [
                    "03",
                    "Domine com consistência",
                    "Dois acertos consecutivos sinalizam domínio inicial.",
                  ],
                ]
          ).map(([n, t, d]) => (
            <div className="tip-step" key={n}>
              <span>{n}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </div>
          ))}
          <div className="tip-callout">
            <Sparkles size={20} />
            <p>
              XP celebra sua dedicação. O que realmente importa é o que você
              leva consigo.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
export function StudySession({
  config,
  progress,
  update,
  onClose,
  onSource,
}: {
  config: SessionConfig;
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  onClose: () => void;
  onSource: (s: Source) => void;
}) {
  const [queue] = useState<Entry[]>(() => {
    const cards: Entry[] = content.flashcards
      .filter((c) => !config.topicId || c.topicId === config.topicId)
      .map((item) => ({ kind: "card", item }));
    const quizzes: Entry[] = content.quizzes
      .filter((q) => !config.topicId || q.topicId === config.topicId)
      .map((item) => ({ kind: "quiz", item }));
    if (config.kind === "card") return shuffled(cards);
    if (config.kind === "quiz") return shuffled(quizzes);
    if (config.kind === "exam") return shuffled(quizzes).slice(0, 10);
    const test = config.kind === "errors" ? isError : isDue;
    return shuffled(
      [...cards, ...quizzes].filter((e) => test(progress, e.item.id)),
    );
  });
  const [sessionId] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [initialXp] = useState(progress.xp);
  const [index, setIndex] = useState(0),
    [revealed, setRevealed] = useState(false),
    [answer, setAnswer] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);
  const current = queue[index];
  const questionBodyRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (questionBodyRef.current) questionBodyRef.current.scrollTop = 0;
  }, [current?.item.id]);
  const options = useMemo(
    () =>
      current?.kind === "quiz"
        ? shuffled(current.item.options.map((text, i) => ({ text, index: i })))
        : [],
    [current],
  );
  const answered = results.length > index;
  const title =
    config.kind === "exam"
      ? "Desafio de conhecimento"
      : config.kind === "review" || config.kind === "errors"
        ? "Revisão inteligente"
        : config.kind === "card"
          ? "Flashcards"
          : "Quiz";
  function record(correct: boolean, confidence?: number) {
    if (!current || answered) return;
    setResults((r) => [...r, { entry: current, correct }]);
    update((p) =>
      recordAttempt(p, {
        id: `${sessionId}:${index}`,
        itemId: current.item.id,
        kind: current.kind,
        correct,
        confidence,
      }),
    );
  }
  function next() {
    setIndex((i) => i + 1);
    setAnswer(null);
    setRevealed(false);
  }
  if (!current) {
    const correct = results.filter((r) => r.correct).length;
    return (
      <section className="session-summary panel">
        <span className="summary-medal">
          <Trophy size={45} />
        </span>
        <span className="eyebrow">MAIS UM PASSO NA SUA JORNADA</span>
        <h1>{queue.length ? "Rodada concluída!" : "Tudo em dia por aqui."}</h1>
        <p>
          {queue.length
            ? "Cada tentativa constrói conhecimento. Celebre o que aprendeu e volte ao que ainda precisa de atenção."
            : "Continue praticando para criar sua fila personalizada de revisão."}
        </p>
        {queue.length > 0 && (
          <div className="summary-stats">
            <div>
              <strong>
                {correct}/{results.length}
              </strong>
              <span>acertos</span>
            </div>
            <div>
              <strong>+{progress.xp - initialXp}</strong>
              <span>XP conquistados</span>
            </div>
            <div>
              <strong>{Math.round((correct / results.length) * 100)}%</strong>
              <span>aproveitamento</span>
            </div>
          </div>
        )}
        <button className="button button-primary" onClick={onClose}>
          Voltar para minha jornada <ArrowRight size={17} />
        </button>
        {results.some((r) => !r.correct) && (
          <div className="summary-review">
            <h2>Vale uma segunda olhada</h2>
            {results
              .filter((r) => !r.correct)
              .map(({ entry }) => (
                <article key={entry.item.id}>
                  <h3>
                    {entry.kind === "card"
                      ? entry.item.front
                      : entry.item.question}
                  </h3>
                  <p>
                    {entry.kind === "card"
                      ? entry.item.back
                      : entry.item.explanation}
                  </p>
                  <SourceButton
                    source={entry.item.source}
                    onSource={onSource}
                  />
                </article>
              ))}
          </div>
        )}
      </section>
    );
  }
  const topic = content.topics.find((t) => t.id === current.item.topicId);
  const correct = answered && results[index].correct;
  const due = progress.items[current.item.id]?.due;
  return (
    <div className="study-session">
      <header className="session-header">
        <div className="session-toolbar">
          <button className="text-button" onClick={onClose}>
            <ArrowLeft size={17} /> Sair da rodada
          </button>
          <span>{title}</span>
          <span>
            {index + 1} de {queue.length}
          </span>
        </div>
        <ProgressBar
          value={(index / queue.length) * 100}
          label="Progresso da rodada"
        />
        <div className="session-context">
          <span className="tag">{topic?.name}</span>
          <span className="muted small-text">
            {current.kind === "card"
              ? "Pense antes de revelar"
              : "Escolha uma alternativa"}
          </span>
        </div>
      </header>
      <div className="session-layout">
        <section
          ref={questionBodyRef}
          className={`question-card ${current.kind === "card" ? "flashcard" : ""}`}
          aria-label="Conteúdo da atividade"
          tabIndex={0}
        >
          <div className="question-kind">
            <span>
              {current.kind === "card" ? (
                <Layers size={16} />
              ) : (
                <Target size={16} />
              )}
              {current.kind === "card" ? current.item.type : "QUIZ"}
            </span>
            {current.kind === "card" && (
              <span>
                {
                  ["", "Essencial", "Intermediário", "Avançado"][
                    current.item.difficulty
                  ]
                }
              </span>
            )}
          </div>
          <h1>
            {current.kind === "card"
              ? current.item.front
              : current.item.question}
          </h1>
          {current.kind === "card" ? (
            revealed ? (
              <div className="card-answer">
                <span className="eyebrow">CONECTE COM A SUA RESPOSTA</span>
                <p>{current.item.back}</p>
              </div>
            ) : (
              <div className="recall-prompt">
                <BookOpen size={25} strokeWidth={1.4} />
                <p>
                  Formule a resposta na sua mente.
                  <br />
                  Depois, revele para conferir o que lembrou.
                </p>
              </div>
            )
          ) : (
            <div className="quiz-options">
              {options.map((option, i) => {
                const optionCorrect =
                  option.index === current.item.correctOptionIndex;
                const selected = answer === option.index;
                return (
                  <button
                    className={`quiz-option ${answered && optionCorrect ? "correct" : ""} ${answered && selected && !optionCorrect ? "incorrect" : ""}`}
                    key={option.index}
                    disabled={answered}
                    onClick={() => {
                      setAnswer(option.index);
                      record(optionCorrect);
                    }}
                  >
                    <span className="option-letter">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{option.text}</span>
                    {answered && optionCorrect ? (
                      <CheckCircle2 size={19} />
                    ) : answered && selected ? (
                      <X size={19} />
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
          <div className="question-source">
            <SourceButton source={current.item.source} onSource={onSource} />
          </div>
        </section>
        <aside
          className={`session-actions ${answered ? (correct ? "positive" : "needs-review") : ""}`}
          aria-label="Controles da atividade"
        >
          {answered ? (
            <>
              <div className="session-result-heading" role="status">
                <span className="round-icon lime">
                  {correct ? (
                    <CheckCircle2 size={22} />
                  ) : (
                    <BookOpen size={22} />
                  )}
                </span>
                <h2>
                  {correct
                    ? "Boa! Mais uma conexão feita."
                    : "Aprender também é revisitar."}
                </h2>
                <p className="review-date">
                  <Zap size={13} />
                  {due === dateKey()
                    ? "Revisão hoje"
                    : due
                      ? "Próxima revisão: " +
                        new Date(`${due}T12:00:00Z`).toLocaleDateString(
                          "pt-BR",
                          { timeZone: "UTC" },
                        )
                      : "Progresso registrado"}
                </p>
              </div>
              {current.kind === "quiz" && (
                <div
                  className="session-explanation"
                  tabIndex={0}
                  role="region"
                  aria-label="Explicação da resposta"
                >
                  <p>
                    {answer !== null
                      ? current.item.optionExplanations[answer]
                      : ""}
                  </p>
                  {!correct && (
                    <p>
                      <strong>Resposta correta: </strong>
                      {current.item.options[current.item.correctOptionIndex]}
                    </p>
                  )}
                  <details>
                    <summary>Entender todas as alternativas</summary>
                    {options.map((option) => (
                      <p key={option.index}>
                        <strong>{option.text}</strong>
                        <br />
                        {current.item.optionExplanations[option.index]}
                      </p>
                    ))}
                  </details>
                </div>
              )}
              <div className="session-action-footer">
                <button className="button button-primary full" onClick={next}>
                  {index === queue.length - 1
                    ? "Ver meu resultado"
                    : "Próxima atividade"}
                  <ArrowRight size={17} />
                </button>
              </div>
            </>
          ) : current.kind === "card" && revealed ? (
            <div className="confidence-panel">
              <h2>Como foi lembrar disso?</h2>
              <p>Sua resposta orienta a próxima revisão.</p>
              <div className="confidence-options">
                {[
                  "Não lembrei",
                  "Lembrei parcialmente",
                  "Consigo explicar",
                  "Consigo diferenciar",
                ].map((label, i) => (
                  <button
                    key={label}
                    className={`confidence confidence-${i}`}
                    onClick={() => record(i >= 2, i)}
                  >
                    <span>
                      {i === 0 ? (
                        <RotateCcw size={18} />
                      ) : i === 1 ? (
                        <BookOpen size={18} />
                      ) : i === 2 ? (
                        <Check size={18} />
                      ) : (
                        <Sparkles size={18} />
                      )}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="session-guidance">
              <span className="round-icon lime">
                {current.kind === "card" ? (
                  <Layers size={22} />
                ) : (
                  <Target size={22} />
                )}
              </span>
              <h2>
                {current.kind === "card"
                  ? "Primeiro, tente lembrar."
                  : "Qual alternativa faz sentido?"}
              </h2>
              <p>
                {current.kind === "card"
                  ? "Explique o conceito com suas palavras antes de conferir a resposta."
                  : "Leia com atenção e escolha uma opção. Você verá a explicação logo depois."}
              </p>
              {current.kind === "card" && (
                <button
                  className="button button-primary full"
                  onClick={() => setRevealed(true)}
                >
                  <RotateCcw size={16} /> Revelar resposta
                </button>
              )}
            </div>
          )}
          <p className="session-save-status">
            <span className="status-dot" /> Progresso salvo neste navegador
          </p>
        </aside>
      </div>
    </div>
  );
}
