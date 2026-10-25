"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Gamepad2,
  Link2,
  ListChecks,
  Puzzle,
  XCircle,
} from "lucide-react";
import {
  summarizePack,
  type GameModule,
  type GamePack,
  type GameType,
} from "../lib/game-content";
import { recordAttempt, shuffled, type Progress } from "../lib/learning-engine";
import { PageHeading, ProgressBar } from "./ui";
import { GamePackStudio } from "./game-pack-studio";

type UpdateProgress = (change: (progress: Progress) => Progress) => void;

export function Games({
  packs,
  customPacks,
  savePack,
  removePack,
  progress,
  update,
}: {
  packs: GamePack[];
  customPacks: GamePack[];
  savePack: (pack: GamePack) => "created" | "updated";
  removePack: (id: string) => void;
  progress: Progress;
  update: UpdateProgress;
}) {
  const [packId, setPackId] = useState(packs[0].id);
  const pack = packs.find((item) => item.id === packId) ?? packs[0];
  const [moduleId, setModuleId] = useState(pack.modules[0].id);
  const module =
    pack.modules.find((item) => item.id === moduleId) ?? pack.modules[0];
  const [active, setActive] = useState<GameType | null>(null);

  function choosePack(id: string) {
    const next = packs.find((item) => item.id === id) ?? packs[0];
    setPackId(next.id);
    setModuleId(next.modules[0].id);
    setActive(null);
  }

  if (active === "pairs") {
    return (
      <PairGame
        key={`${pack.id}:${module.id}:pairs`}
        pack={pack}
        module={module}
        progress={progress}
        update={update}
        onClose={() => setActive(null)}
      />
    );
  }
  if (active === "trueFalse") {
    return (
      <TrueFalseGame
        key={`${pack.id}:${module.id}:true-false`}
        pack={pack}
        module={module}
        progress={progress}
        update={update}
        onClose={() => setActive(null)}
      />
    );
  }
  if (active === "multipleChoice") {
    return (
      <ChoiceGame
        key={`${pack.id}:${module.id}:choice`}
        pack={pack}
        module={module}
        progress={progress}
        update={update}
        onClose={() => setActive(null)}
      />
    );
  }

  const totals = summarizePack(pack);
  return (
    <>
      <PageHeading
        eyebrow="LABORATÓRIO DE JOGOS"
        title="Aprenda jogando com qualquer assunto."
        description="Escolha um pacote, pratique em três formatos e importe novos conteúdos gerados com o prompt da Evolua."
      />
      <section className="panel game-catalog">
        <div className="game-catalog-heading">
          <span className="round-icon lime">
            <Gamepad2 />
          </span>
          <div>
            <span className="eyebrow">CONTEÚDO ATIVO</span>
            <h2>{pack.title}</h2>
            <p>{pack.description}</p>
          </div>
          <span className="tag">
            {pack.id === "metodologia-cientifica" ? "Oficial" : "Importado"}
          </span>
        </div>
        <div className="game-selectors">
          <label className="field-label">
            Pacote de conteúdo
            <select
              aria-label="Pacote de conteúdo"
              value={pack.id}
              onChange={(event) => choosePack(event.target.value)}
            >
              {packs.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Módulo
            <select
              aria-label="Módulo do jogo"
              value={module.id}
              onChange={(event) => setModuleId(event.target.value)}
            >
              {pack.modules.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="module-description">{module.description}</p>
        <div className="game-grid">
          <GameCard
            icon={<Link2 />}
            tone="lime"
            title="Conecte os pares"
            description="Relacione conceitos e respostas antes que sua memória te pregue uma peça."
            count={module.pairs.length}
            disabled={module.pairs.length < 2}
            onPlay={() => setActive("pairs")}
          />
          <GameCard
            icon={<Puzzle />}
            tone="lavender"
            title="Verdadeiro ou falso"
            description="Decida rápido e use a explicação para consolidar cada conceito."
            count={module.trueFalse.length}
            disabled={!module.trueFalse.length}
            onPlay={() => setActive("trueFalse")}
          />
          <GameCard
            icon={<ListChecks />}
            tone="peach"
            title="Desafio de alternativas"
            description="Enfrente uma rodada curta com feedback imediato a cada resposta."
            count={module.multipleChoice.length}
            disabled={!module.multipleChoice.length}
            onPlay={() => setActive("multipleChoice")}
          />
        </div>
        <p className="game-pack-total">
          Este pacote contém {totals.pairs} pares, {totals.trueFalse} afirmações
          e {totals.multipleChoice} questões em {pack.modules.length} módulo(s).
        </p>
      </section>
      <GamePackStudio
        customPacks={customPacks}
        savePack={(newPack) => {
          const result = savePack(newPack);
          setPackId(newPack.id);
          setModuleId(newPack.modules[0].id);
          setActive(null);
          return result;
        }}
        removePack={(id) => {
          removePack(id);
          if (packId === id) choosePack("metodologia-cientifica");
        }}
      />
    </>
  );
}

function GameCard({
  icon,
  tone,
  title,
  description,
  count,
  disabled,
  onPlay,
}: {
  icon: React.ReactNode;
  tone: string;
  title: string;
  description: string;
  count: number;
  disabled: boolean;
  onPlay: () => void;
}) {
  return (
    <article className="game-card">
      <span className={`round-icon large ${tone}`}>{icon}</span>
      <span className="tag">{count} desafios</span>
      <h3>{title}</h3>
      <p>{description}</p>
      <button
        className="button button-primary full"
        disabled={disabled}
        onClick={onPlay}
      >
        {disabled ? "Sem conteúdo neste módulo" : `Jogar ${title}`}
        {!disabled && <ArrowRight size={17} />}
      </button>
    </article>
  );
}

function gameAttempt(
  update: UpdateProgress,
  eventId: string,
  itemId: string,
  correct: boolean,
) {
  update((progress) =>
    recordAttempt(progress, {
      id: eventId,
      itemId,
      kind: "quiz",
      correct,
    }),
  );
}

function GameHeader({
  title,
  module,
  current,
  total,
  onClose,
  position,
}: {
  title: string;
  module: GameModule;
  current: number;
  total: number;
  onClose: () => void;
  position?: number;
}) {
  return (
    <>
      <div className="session-toolbar">
        <button className="text-button" onClick={onClose}>
          <ArrowLeft size={17} /> Sair do jogo
        </button>
        <span>{title}</span>
        <span>
          {Math.min(position ?? current, total)} de {total}
        </span>
      </div>
      <ProgressBar
        value={total ? (current / total) * 100 : 0}
        label={`Progresso em ${title}`}
      />
      <div className="session-context">
        <span className="tag">{module.title}</span>
        <span className="muted small-text">
          Progresso salvo neste navegador
        </span>
      </div>
    </>
  );
}

function GameSummary({
  title,
  correct,
  total,
  gainedXp,
  onClose,
}: {
  title: string;
  correct: number;
  total: number;
  gainedXp: number;
  onClose: () => void;
}) {
  return (
    <section className="session-summary panel game-summary">
      <span className="summary-medal">
        <Gamepad2 size={45} />
      </span>
      <span className="eyebrow">RODADA CONCLUÍDA</span>
      <h1>{title}</h1>
      <p>
        Você praticou, recebeu feedback e deixou novas conexões mais fortes.
      </p>
      <div className="summary-stats">
        <div>
          <strong>
            {correct}/{total}
          </strong>
          <span>acertos</span>
        </div>
        <div>
          <strong>+{gainedXp}</strong>
          <span>XP conquistados</span>
        </div>
        <div>
          <strong>{total ? Math.round((correct / total) * 100) : 0}%</strong>
          <span>aproveitamento</span>
        </div>
      </div>
      <button className="button button-primary" onClick={onClose}>
        Escolher outro jogo <ArrowRight size={17} />
      </button>
    </section>
  );
}

function PairGame({
  pack,
  module,
  progress,
  update,
  onClose,
}: {
  pack: GamePack;
  module: GameModule;
  progress: Progress;
  update: UpdateProgress;
  onClose: () => void;
}) {
  const [items] = useState(() => shuffled(module.pairs).slice(0, 6));
  const [answers] = useState(() => shuffled(items));
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [sessionId] = useState(
    () => `game-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [initialXp] = useState(progress.xp);

  if (matched.length === items.length) {
    return (
      <GameSummary
        title="Todas as conexões foram encontradas!"
        correct={correct}
        total={attempts}
        gainedXp={progress.xp - initialXp}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="study-session game-session">
      <GameHeader
        title="Conecte os pares"
        module={module}
        current={matched.length}
        total={items.length}
        onClose={onClose}
      />
      <section className="panel pair-board">
        <div className="pair-instructions">
          <Link2 size={23} />
          <div>
            <h1>Qual resposta completa cada conceito?</h1>
            <p>Escolha um cartão da esquerda e depois sua conexão.</p>
          </div>
        </div>
        <div className="pair-columns">
          <div>
            <span className="eyebrow">CONCEITOS</span>
            {items.map((item) => (
              <button
                key={item.id}
                className={`pair-option ${selected === item.id ? "selected" : ""} ${matched.includes(item.id) ? "matched" : ""}`}
                disabled={matched.includes(item.id)}
                aria-pressed={selected === item.id}
                onClick={() => {
                  setSelected(item.id);
                  setFeedback("");
                }}
              >
                {item.prompt}
              </button>
            ))}
          </div>
          <div>
            <span className="eyebrow">RESPOSTAS</span>
            {answers.map((answer) => (
              <button
                key={answer.id}
                className={`pair-option answer ${matched.includes(answer.id) ? "matched" : ""}`}
                disabled={!selected || matched.includes(answer.id)}
                onClick={() => {
                  const item = items.find(
                    (candidate) => candidate.id === selected,
                  );
                  if (!item) return;
                  const isCorrect = item.id === answer.id;
                  const attempt = attempts + 1;
                  setAttempts(attempt);
                  if (isCorrect) {
                    setMatched((current) => [...current, item.id]);
                    setCorrect((value) => value + 1);
                    setFeedback(item.explanation);
                  } else {
                    setFeedback(
                      "Essas peças ainda não formam um par. Tente outra conexão.",
                    );
                  }
                  gameAttempt(
                    update,
                    `${sessionId}:${attempt}`,
                    `game:${pack.id}:pairs:${item.id}`,
                    isCorrect,
                  );
                  setSelected(null);
                }}
              >
                {answer.answer}
              </button>
            ))}
          </div>
        </div>
        {feedback && (
          <p className="inline-message pair-feedback" role="status">
            {feedback}
          </p>
        )}
      </section>
    </div>
  );
}

function TrueFalseGame({
  pack,
  module,
  progress,
  update,
  onClose,
}: {
  pack: GamePack;
  module: GameModule;
  progress: Progress;
  update: UpdateProgress;
  onClose: () => void;
}) {
  const [items] = useState(() => shuffled(module.trueFalse).slice(0, 10));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [sessionId] = useState(
    () => `game-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [initialXp] = useState(progress.xp);
  const item = items[index];

  if (!item) {
    return (
      <GameSummary
        title="Você concluiu o verdadeiro ou falso!"
        correct={score}
        total={items.length}
        gainedXp={progress.xp - initialXp}
        onClose={onClose}
      />
    );
  }
  const correct = answer === item.answer;
  return (
    <div className="study-session game-session">
      <GameHeader
        title="Verdadeiro ou falso"
        module={module}
        current={index}
        position={index + 1}
        total={items.length}
        onClose={onClose}
      />
      <section className="question-card game-question-card">
        <span className="eyebrow">ANALISE A AFIRMAÇÃO</span>
        <h1>{item.statement}</h1>
        <div className="truth-options">
          {[
            { value: true, label: "Verdadeiro", icon: CheckCircle2 },
            { value: false, label: "Falso", icon: XCircle },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={label}
              className={`truth-option ${answer === value ? (correct ? "correct" : "incorrect") : ""}`}
              disabled={answer !== null}
              onClick={() => {
                const isCorrect = value === item.answer;
                setAnswer(value);
                if (isCorrect) setScore((current) => current + 1);
                gameAttempt(
                  update,
                  `${sessionId}:${index}`,
                  `game:${pack.id}:true-false:${item.id}`,
                  isCorrect,
                );
              }}
            >
              <Icon size={24} /> {label}
            </button>
          ))}
        </div>
      </section>
      {answer !== null && (
        <section
          className={`feedback ${correct ? "positive" : "needs-review"}`}
          role="status"
        >
          <h2>{correct ? "Boa leitura!" : "Quase — vale rever a ideia."}</h2>
          <p>{item.explanation}</p>
          <button
            className="button button-primary"
            onClick={() => {
              setIndex((current) => current + 1);
              setAnswer(null);
            }}
          >
            {index === items.length - 1 ? "Ver resultado" : "Próxima afirmação"}
            <ArrowRight size={17} />
          </button>
        </section>
      )}
    </div>
  );
}

function ChoiceGame({
  pack,
  module,
  progress,
  update,
  onClose,
}: {
  pack: GamePack;
  module: GameModule;
  progress: Progress;
  update: UpdateProgress;
  onClose: () => void;
}) {
  const [items] = useState(() => shuffled(module.multipleChoice).slice(0, 10));
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [sessionId] = useState(
    () => `game-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const [initialXp] = useState(progress.xp);
  const item = items[index];
  const options = useMemo(
    () =>
      item
        ? shuffled(
            item.options.map((text, originalIndex) => ({
              text,
              originalIndex,
            })),
          )
        : [],
    [item],
  );

  if (!item) {
    return (
      <GameSummary
        title="Desafio de alternativas concluído!"
        correct={score}
        total={items.length}
        gainedXp={progress.xp - initialXp}
        onClose={onClose}
      />
    );
  }
  const correct = answer === item.correctOptionIndex;
  return (
    <div className="study-session game-session">
      <GameHeader
        title="Desafio de alternativas"
        module={module}
        current={index}
        position={index + 1}
        total={items.length}
        onClose={onClose}
      />
      <section className="question-card game-question-card">
        <span className="eyebrow">ESCOLHA UMA ALTERNATIVA</span>
        <h1>{item.question}</h1>
        <div className="quiz-options">
          {options.map((option, optionIndex) => {
            const isCorrect = option.originalIndex === item.correctOptionIndex;
            const selected = answer === option.originalIndex;
            return (
              <button
                className={`quiz-option ${answer !== null && isCorrect ? "correct" : ""} ${answer !== null && selected && !isCorrect ? "incorrect" : ""}`}
                key={option.originalIndex}
                disabled={answer !== null}
                onClick={() => {
                  setAnswer(option.originalIndex);
                  if (isCorrect) setScore((current) => current + 1);
                  gameAttempt(
                    update,
                    `${sessionId}:${index}`,
                    `game:${pack.id}:choice:${item.id}`,
                    isCorrect,
                  );
                }}
              >
                <span className="option-letter">
                  {String.fromCharCode(65 + optionIndex)}
                </span>
                <span>{option.text}</span>
                {answer !== null && isCorrect ? (
                  <CheckCircle2 size={19} />
                ) : answer !== null && selected ? (
                  <XCircle size={19} />
                ) : null}
              </button>
            );
          })}
        </div>
      </section>
      {answer !== null && (
        <section
          className={`feedback ${correct ? "positive" : "needs-review"}`}
          role="status"
        >
          <h2>
            {correct ? "Resposta certa!" : "Essa não era a melhor opção."}
          </h2>
          {!correct && (
            <p>
              <strong>Resposta correta: </strong>
              {item.options[item.correctOptionIndex]}
            </p>
          )}
          <p>{item.explanation}</p>
          {item.optionExplanations && (
            <details>
              <summary>Entender todas as alternativas</summary>
              {item.options.map((option, i) => (
                <p key={i}>
                  <strong>{option}</strong>
                  <br />
                  {item.optionExplanations![i]}
                </p>
              ))}
            </details>
          )}
          <button
            className="button button-primary"
            onClick={() => {
              setIndex((current) => current + 1);
              setAnswer(null);
            }}
          >
            {index === items.length - 1 ? "Ver resultado" : "Próxima questão"}
            <ArrowRight size={17} />
          </button>
        </section>
      )}
    </div>
  );
}
