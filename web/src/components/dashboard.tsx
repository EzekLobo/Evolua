"use client";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Gamepad2,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { content, course } from "../lib/content";
import {
  accuracy,
  achievements,
  addDays,
  dateKey,
  isDue,
  mastered,
  streak,
  totalAttempts,
  type Progress,
} from "../lib/learning-engine";
import {
  awardIcons,
  BotanicalArt,
  PageHeading,
  ProgressBar,
  topicIcons,
} from "./ui";
export type View =
  | "inicio"
  | "trilhas"
  | "cards"
  | "quiz"
  | "jogos"
  | "revisao"
  | "biblioteca"
  | "conquistas"
  | "perfil";
export type SessionConfig = {
  kind: "card" | "quiz" | "review" | "errors" | "exam";
  topicId?: string;
};
export type StartSession = (config: SessionConfig) => void;

export function Dashboard({
  progress,
  navigate,
  start,
}: {
  progress: Progress;
  navigate: (v: View) => void;
  start: StartSession;
}) {
  const today = dateKey(),
    daily = progress.days[today];
  const known = content.flashcards.filter((c) =>
    mastered(progress, c.id),
  ).length;
  const due = [...content.flashcards, ...content.quizzes].filter((item) =>
    isDue(progress, item.id),
  ).length;
  const rewards = achievements(
    progress,
    content.flashcards.map((c) => c.id),
  );
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const next =
    content.topics.find((t) =>
      content.flashcards.some(
        (c) => c.topicId === t.id && !mastered(progress, c.id),
      ),
    ) ?? content.topics[0];
  return (
    <>
      <PageHeading
        title={
          progress.name
            ? `Vamos evoluir, ${progress.name.split(" ")[0]}?`
            : "Seu próximo nível começa aqui."
        }
        description="Cada pequeno passo abre um mundo de possibilidades."
        action={
          <span className="date-pill">
            <span className="status-dot" /> Seu espaço de aprendizado
          </span>
        }
      />
      <div className="dashboard-columns">
        <div className="dashboard-main">
          <section className="hero">
            <div className="hero-content">
              <span className="hero-label">
                <Sparkles size={14} /> APRENDA. PRATIQUE. EVOLUA.
              </span>
              <h2>
                Um pouco a cada dia.
                <br />
                <span>Um novo você amanhã.</span>
              </h2>
              <p>
                Transforme curiosidade em conhecimento.
                <br />
                Sua próxima conquista está a uma missão de distância.
              </p>
              <button
                className="button button-lime"
                onClick={() => start({ kind: "card", topicId: next.id })}
              >
                Começar a aprender <ArrowRight size={18} />
              </button>
              <span className="hero-footnote">
                <Clock size={13} /> 5 min para dar o próximo passo
              </span>
            </div>
            <BotanicalArt />
          </section>
          <div className="stats-grid">
            <Stat
              icon={<Zap />}
              tone="lime"
              value={progress.xp.toLocaleString("pt-BR")}
              label="XP conquistados"
              sub={`Nível ${Math.floor(progress.xp / 200) + 1} · Explorador`}
            />
            <Stat
              icon={<Flame />}
              tone="peach"
              value={`${streak(progress)}`}
              label="dias de sequência"
              sub="Um hábito que transforma"
            />
            <Stat
              icon={<BookOpen />}
              tone="lavender"
              value={`${known}/${content.flashcards.length}`}
              label="cards dominados"
              sub={`${Math.round((known / content.flashcards.length) * 100)}% da sua jornada`}
            />
          </div>
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONHECIMENTO EM MOVIMENTO</span>
              <h2>Suas trilhas de aprendizado</h2>
            </div>
            <button className="text-button" onClick={() => navigate("trilhas")}>
              Ver todas <ArrowUpRight size={16} />
            </button>
          </div>
          <div className="course-grid">
            {content.topics.slice(0, 2).map((topic, i) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                index={i}
                progress={progress}
                start={start}
              />
            ))}
          </div>
          <section className="practice-banner">
            <span className="round-icon lavender">
              <Gamepad2 size={23} />
            </span>
            <div>
              <h3>Aprender também pode ser um jogo.</h3>
              <p>Conecte pares, avalie afirmações e vença novos desafios.</p>
            </div>
            <button
              className="button button-outline"
              onClick={() => navigate("jogos")}
            >
              Explorar jogos <ArrowRight size={16} />
            </button>
          </section>
        </div>
        <aside className="dashboard-aside">
          <section className="panel daily-goal">
            <div className="section-heading">
              <h3>Sua missão de hoje</h3>
              <span className="round-icon small lime">
                <Target size={17} />
              </span>
            </div>
            <div
              className="goal-ring"
              style={
                {
                  "--angle": `${Math.min(1, (daily?.reviews ?? 0) / progress.goal) * 360}deg`,
                } as React.CSSProperties
              }
            >
              <div>
                <strong>
                  {daily?.reviews ?? 0}
                  <span>/{progress.goal}</span>
                </strong>
                <small>atividades</small>
              </div>
            </div>
            <h4>
              {(daily?.reviews ?? 0) >= progress.goal
                ? "Missão cumprida!"
                : "Pequenos passos, grandes conquistas."}
            </h4>
            <p className="muted">
              {(daily?.reviews ?? 0) >= progress.goal
                ? "Você investiu em seu próximo nível hoje."
                : `Mais ${Math.max(0, progress.goal - (daily?.reviews ?? 0))} atividades para fechar sua meta.`}
            </p>
            <button
              className="button button-primary full"
              onClick={() => start({ kind: due ? "review" : "card" })}
            >
              {due ? "Revisar agora" : "Continuar jornada"}{" "}
              <ArrowRight size={17} />
            </button>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h3>Consistência é tudo</h3>
              <Flame size={18} className="orange-text" />
            </div>
            <p className="muted small-text">Sua atividade nos últimos 7 dias</p>
            <div className="week">
              {week.map((day) => (
                <div key={day}>
                  <span
                    className={
                      progress.days[day]?.reviews
                        ? "day active"
                        : day === today
                          ? "day today"
                          : "day"
                    }
                  >
                    {progress.days[day]?.reviews ? (
                      <Check size={15} />
                    ) : (
                      new Date(`${day}T12:00:00Z`).getUTCDate()
                    )}
                  </span>
                  <small>
                    {new Intl.DateTimeFormat("pt-BR", {
                      weekday: "narrow",
                      timeZone: "UTC",
                    }).format(new Date(`${day}T12:00:00Z`))}
                  </small>
                </div>
              ))}
            </div>
            <div className="aside-note">
              <span className="status-dot" />
              {totalAttempts(progress)
                ? "Cada dia conta. Continue assim!"
                : "O melhor dia para começar é hoje."}
            </div>
          </section>
          <section className="panel">
            <div className="section-heading">
              <h3>Próximas conquistas</h3>
              <Trophy size={18} />
            </div>
            <div className="mini-awards">
              {rewards
                .filter((r) => !r.unlocked)
                .concat(rewards.filter((r) => r.unlocked))
                .slice(0, 3)
                .map((r) => {
                  const Icon = awardIcons[r.icon as keyof typeof awardIcons];
                  return (
                    <div className="mini-award" key={r.id}>
                      <span
                        className={`award-icon ${r.unlocked ? "earned" : ""}`}
                      >
                        <Icon size={20} />
                      </span>
                      <div>
                        <strong>{r.name}</strong>
                        <p>{r.description}</p>
                      </div>
                      {r.unlocked && <Check size={15} />}
                    </div>
                  );
                })}
            </div>
            <button
              className="text-button full"
              onClick={() => navigate("conquistas")}
            >
              Explorar conquistas <ChevronRight size={15} />
            </button>
          </section>
          <div className="quote">
            <span>“</span>
            <p>Aprender é a única coisa de que a mente nunca se cansa.</p>
            <small>Continue curioso.</small>
          </div>
        </aside>
      </div>
    </>
  );
}
function Stat({
  icon,
  tone,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  tone: string;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <section className="stat">
      <span className={`round-icon ${tone}`}>{icon}</span>
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
        <small>{sub}</small>
      </div>
    </section>
  );
}
export function TopicCard({
  topic,
  index,
  progress,
  start,
}: {
  topic: (typeof content.topics)[number];
  index: number;
  progress: Progress;
  start: StartSession;
}) {
  const cards = content.flashcards.filter((c) => c.topicId === topic.id),
    quiz = content.quizzes.filter((q) => q.topicId === topic.id),
    known = cards.filter((c) => mastered(progress, c.id)).length;
  const Icon = topicIcons[index % 4];
  const tone = ["sage", "lavender", "peach", "blue"][index % 4];
  return (
    <article className="topic-card">
      <div className={`topic-art ${tone}`}>
        <span className="topic-number">
          TRILHA {String(index + 1).padStart(2, "0")}
        </span>
        <div className="topic-orbit" />
        <Icon className="topic-art-icon" strokeWidth={1.2} />
        <span className="art-dot dot-one" />
        <span className="art-dot dot-two" />
        <span className="topic-category">{course.area}</span>
      </div>
      <div className="topic-body">
        <div className="topic-meta">
          <span>{cards.length} cards</span>
          <span>·</span>
          <span>{quiz.length} questões</span>
        </div>
        <h3>{topic.name}</h3>
        <p>{topic.description}</p>
        <div className="topic-progress-label">
          <span>{known ? "Seu progresso" : "Pronto para começar"}</span>
          <strong>{Math.round((known / (cards.length || 1)) * 100)}%</strong>
        </div>
        <ProgressBar
          value={(known / (cards.length || 1)) * 100}
          label={`Domínio em ${topic.name}`}
        />
        <button
          className="topic-link"
          onClick={() => start({ kind: "card", topicId: topic.id })}
        >
          {known ? "Continuar trilha" : "Explorar trilha"}
          <ArrowRight size={17} />
        </button>
      </div>
    </article>
  );
}
export function Trails({
  progress,
  start,
}: {
  progress: Progress;
  start: StartSession;
}) {
  return (
    <>
      <PageHeading
        eyebrow="SUA JORNADA"
        title="Um mundo para descobrir."
        description="Escolha uma trilha e transforme um assunto em uma nova habilidade."
      />
      <div className="course-intro">
        <span className="round-icon lime">
          <BookOpen />
        </span>
        <div>
          <h2>{course.title}</h2>
          <p>
            4 trilhas · {content.flashcards.length} cards ·{" "}
            {content.quizzes.length} quizzes · No seu ritmo
          </p>
        </div>
        <span className="tag">Curso disponível</span>
      </div>
      <div className="course-grid all-topics">
        {content.topics.map((topic, i) => (
          <TopicCard
            key={topic.id}
            topic={topic}
            index={i}
            progress={progress}
            start={start}
          />
        ))}
      </div>
      <p className="bottom-note">
        Novos assuntos poderão fazer parte da Evolua. Hoje, sua jornada começa
        pela Metodologia Científica.
      </p>
    </>
  );
}
export function Awards({ progress }: { progress: Progress }) {
  const rewards = achievements(
    progress,
    content.flashcards.map((c) => c.id),
  );
  return (
    <>
      <PageHeading
        eyebrow="CADA PASSO TEM VALOR"
        title="Sua evolução merece ser celebrada."
        description={`${rewards.filter((r) => r.unlocked).length} de ${rewards.length} conquistas desbloqueadas. Continue aprendendo no seu ritmo.`}
      />
      <div className="award-grid">
        {rewards.map((r) => {
          const Icon = awardIcons[r.icon as keyof typeof awardIcons];
          return (
            <article
              key={r.id}
              className={`panel award-card ${r.unlocked ? "unlocked" : ""}`}
            >
              <span className="award-medal">
                <Icon size={35} strokeWidth={1.5} />
              </span>
              <span className="tag">
                {r.unlocked ? "Conquistado" : "A conquistar"}
              </span>
              <h2>{r.name}</h2>
              <p>{r.description}</p>
              {r.unlocked && <Check size={18} />}
            </article>
          );
        })}
      </div>
      <div className="panel insight">
        <Zap />
        <div>
          <h3>Você já acumulou {progress.xp} XP</h3>
          <p>
            Nível {Math.floor(progress.xp / 200) + 1} ·{" "}
            {200 - (progress.xp % 200)} XP até o próximo nível. Acerto geral:{" "}
            {accuracy(progress)}%.
          </p>
        </div>
      </div>
    </>
  );
}
