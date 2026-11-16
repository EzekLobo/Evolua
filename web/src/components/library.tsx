"use client";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronDown,
  FileText,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { content } from "../lib/content";
import type { Source } from "../lib/content-schema";
import type { Progress } from "../lib/learning-engine";
import { PageHeading, SourceButton } from "./ui";
import { CourseManager, type CourseManagerProps } from "./course-manager";
import { CourseReader } from "./course-reader";
type Tab = "guias" | "glossario" | "relacoes" | "discursivo" | "simulados";
const tabs: { id: Tab; label: string }[] = [
  { id: "guias", label: "Guias de estudo" },
  { id: "glossario", label: "Glossário" },
  { id: "relacoes", label: "Conexões" },
  { id: "discursivo", label: "Treino discursivo" },
  { id: "simulados", label: "Simulados" },
];
export function Library({
  progress,
  update,
  onSource,
  courses,
  uid,
}: {
  progress: Progress;
  update: (fn: (p: Progress) => Progress) => void;
  onSource: (s: Source) => void;
  courses: CourseManagerProps;
  uid: string;
}) {
  const [tab, setTab] = useState<Tab>("guias"),
    [search, setSearch] = useState(""),
    [topicId, setTopicId] = useState("");
  const [modelId, setModelId] = useState("");
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [showOriginalCourse, setShowOriginalCourse] = useState(false);
  const model = content.examModels.find((m) => m.id === modelId);
  function matches(text: string, topic?: string) {
    return (
      (!topicId || !topic || topicId === topic) &&
      text
        .toLocaleLowerCase("pt-BR")
        .includes(search.toLocaleLowerCase("pt-BR"))
    );
  }
  const glossary = content.glossary.filter((t) =>
    matches(`${t.term} ${t.definition}`, t.topicId),
  );
  const relations = content.relations.filter((r) =>
    matches(`${r.from} ${r.to} ${r.description}`, r.topicId),
  );
  const practices = content.examPractice.filter((q) =>
    matches(`${q.prompt} ${q.approach}`, q.topicId),
  );
  const guides = content.studyGuides.filter((g) =>
    matches(`${g.title} ${g.purpose}`),
  );
  const models = content.examModels.filter((m) =>
    matches(`${m.title} ${m.focus}`),
  );
  function note(id: string, value: string) {
    update((p) => ({ ...p, notes: { ...p.notes, [id]: value } }));
  }
  if (creatingCourse) return <>
    <button className="button button-outline" onClick={() => setCreatingCourse(false)}>← Voltar à biblioteca</button>
    <CourseManager {...courses} uid={uid} activate={(pack) => {
      const result = courses.activate(pack);
      setCreatingCourse(false);
      return result;
    }} />
  </>;
  const openedCourse = courses.activeCourses.find(c => `${c.pack.id}:${c.pack.revision}` === selectedCourse);
  if (openedCourse) return <>
    <CourseReader key={selectedCourse} pack={openedCourse.pack} uid={uid} />
  </>;
  return (
    <>
      <PageHeading
        eyebrow="SUA BIBLIOTECA"
        title="Entenda. Conecte. Aprofunde."
        description="Um espaço para consultar conceitos, organizar ideias e praticar sua escrita."
      />
      {!showOriginalCourse && <section className="library-courses" aria-labelledby="library-courses-title">
        <div className="library-courses-heading"><h2 id="library-courses-title">Seus cursos</h2><button className="button button-primary" onClick={() => setCreatingCourse(true)}><span aria-hidden="true">＋</span> Novo curso</button></div>
        <div className="resource-grid">
          <article className="panel library-course-card"><BookOpen size={24} aria-hidden="true"/><h3>Preparação: ciência e metodologia</h3><p>Fundamentos, autores e métodos, com guias de estudo e exercícios para preparação da prova.</p><p className="muted">{content.studyGuides.length} guias · Glossário e simulados</p><button className="button button-outline" onClick={()=>setShowOriginalCourse(true)}>Abrir curso <ArrowRight size={16}/></button></article>
          {courses.activeCourses.map(c => <article className="panel library-course-card" key={`${c.pack.id}:${c.pack.revision}`}>
            <BookOpen size={24} aria-hidden="true" />
            <h3>{c.pack.title}</h3><p>{c.pack.description}</p>
            <p className="muted">{c.pack.modules.length} módulos · {c.pack.modules.reduce((total,m) => total + m.lessons.length, 0)} aulas</p>
            <button className="button button-outline" onClick={() => setSelectedCourse(`${c.pack.id}:${c.pack.revision}`)}>Abrir curso <ArrowRight size={16} /></button>
          </article>)}
        </div>
        {!courses.activeCourses.length && <p>Seus cursos aparecerão aqui após a importação. Clique em Novo curso para começar.</p>}
      </section>}
      {showOriginalCourse && <>
      <button className="button button-outline" onClick={()=>setShowOriginalCourse(false)}>← Voltar aos cursos</button>
      <h2>Preparação: ciência e metodologia</h2>
      <div className="tabs" role="tablist" aria-label="Recursos de estudo">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={t.id === tab}
            onClick={() => {
              setTab(t.id);
              setModelId("");
              setSearch("");
              setTopicId("");
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="library-filters">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label="Buscar na biblioteca"
            placeholder="O que você quer descobrir?"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {["glossario", "relacoes", "discursivo"].includes(tab) && (
          <select
            aria-label="Filtrar por assunto"
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
        )}
      </div>
      {tab === "guias" && (
        <div className="resource-stack">
          {guides.map((guide) => (
            <details className="panel resource-details" key={guide.id}>
              <summary>
                <span className="round-icon lime">
                  <BookOpen size={22} />
                </span>
                <div>
                  <h2>{guide.title}</h2>
                  <p>{guide.purpose}</p>
                </div>
                <ChevronDown size={19} />
              </summary>
              <div className="resource-content">
                <div className="guide-columns">
                  <GuideSection
                    title="Mapa do conhecimento"
                    items={guide.visualTree}
                  />
                  <GuideSection
                    title="Passo a passo"
                    items={guide.flow}
                    numbered
                  />
                  <GuideSection
                    title="Conexões importantes"
                    items={guide.diagram}
                  />
                  <GuideSection
                    title="Estratégias para aprender"
                    items={guide.strategies}
                  />
                </div>
                <GuideSection
                  title="Reflita sobre o que aprendeu"
                  items={guide.metacognition}
                />
                <SourceButton source={guide.source} onSource={onSource} />
              </div>
            </details>
          ))}
          {!guides.length && <Empty />}
        </div>
      )}
      {tab === "glossario" && (
        <div className="resource-grid">
          {glossary
            .sort((a, b) => a.term.localeCompare(b.term, "pt-BR"))
            .map((term) => (
              <article className="panel glossary-card" key={term.id}>
                <span className="tag">
                  {content.topics.find((t) => t.id === term.topicId)?.name}
                </span>
                <h2>{term.term}</h2>
                <p>{term.definition}</p>
                <SourceButton source={term.source} onSource={onSource} />
              </article>
            ))}
          {!glossary.length && <Empty />}
        </div>
      )}
      {tab === "relacoes" && (
        <div className="resource-grid">
          {relations.map((r) => (
            <article className="panel relation-card" key={r.id}>
              <span className="round-icon small lavender">
                <Network size={17} />
              </span>
              <div className="concept-connection">
                <h3>{r.from}</h3>
                <ArrowRight size={20} />
                <h3>{r.to}</h3>
              </div>
              <p>{r.description}</p>
              <SourceButton source={r.source} onSource={onSource} />
            </article>
          ))}
          {!relations.length && <Empty />}
        </div>
      )}
      {tab === "discursivo" && (
        <div className="resource-stack">
          <div className="tip-callout">
            <Sparkles size={22} />
            <p>
              Escreva antes de consultar o roteiro. Depois use o checklist para
              avaliar sua resposta. Este treino é autoavaliativo.
            </p>
          </div>
          {practices.map((q) => (
            <details className="panel resource-details" key={q.id}>
              <summary>
                <span className="round-icon peach">
                  <FileText size={20} />
                </span>
                <div>
                  <span className="eyebrow">{q.weight}</span>
                  <h2>{q.prompt}</h2>
                </div>
                <ChevronDown size={18} />
              </summary>
              <div className="resource-content">
                <label className="field-label">
                  Sua resposta
                  <textarea
                    maxLength={20000}
                    rows={6}
                    value={progress.notes[q.id] ?? ""}
                    onChange={(e) => note(q.id, e.target.value)}
                    placeholder="Organize sua resposta: defina, relacione, explique e conclua."
                  />
                </label>
                <p className="small-text muted">
                  Rascunho salvo neste navegador.
                </p>
                <details className="answer-guide">
                  <summary>Conferir roteiro e checklist</summary>
                  <p>{q.approach}</p>
                  <ul className="checklist">
                    {q.checklist.map((text, i) => (
                      <li key={i}>
                        <Check size={16} />
                        {text}
                      </li>
                    ))}
                  </ul>
                </details>
                <SourceButton source={q.source} onSource={onSource} />
              </div>
            </details>
          ))}
          {!practices.length && <Empty />}
        </div>
      )}
      {tab === "simulados" &&
        (model ? (
          <section className="panel exam-workspace">
            <button className="text-button" onClick={() => setModelId("")}>
              ← Voltar aos simulados
            </button>
            <span className="eyebrow">TREINO AUTOAVALIATIVO</span>
            <h2>{model.title}</h2>
            <p>{model.duration}</p>
            <p className="muted">
              Reserve um momento tranquilo. Ao terminar, compare suas respostas
              com a rubrica; não há correção automática.
            </p>
            {model.questions.map((question, i) => (
              <label key={i} className="field-label exam-question">
                <strong>
                  {i + 1}. {question}
                </strong>
                <textarea
                  rows={6}
                  maxLength={20000}
                  value={progress.notes[`${model.id}:${i}`] ?? ""}
                  onChange={(e) => note(`${model.id}:${i}`, e.target.value)}
                  placeholder="Desenvolva sua resposta aqui..."
                />
              </label>
            ))}
            <details className="answer-guide">
              <summary>Terminei: conferir critérios de avaliação</summary>
              <ul className="checklist">
                {model.rubric.map((text, i) => (
                  <li key={i}>
                    <Check size={17} />
                    {text}
                  </li>
                ))}
              </ul>
            </details>
            <SourceButton source={model.source} onSource={onSource} />
          </section>
        ) : (
          <div className="resource-grid">
            {models.map((m, i) => (
              <article key={m.id} className="panel exam-model">
                <span className="model-number">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="tag">
                  {m.questions.length} questões discursivas
                </span>
                <h2>{m.title}</h2>
                <p>{m.focus}</p>
                <p className="muted small-text">{m.duration}</p>
                <button
                  className="button button-outline full"
                  onClick={() => setModelId(m.id)}
                >
                  Abrir simulado <ArrowRight size={16} />
                </button>
              </article>
            ))}
            {!models.length && <Empty />}
          </div>
        ))}
      </>}
    </>
  );
}
function GuideSection({
  title,
  items,
  numbered = false,
}: {
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  return (
    <section className="guide-section">
      <h3>{title}</h3>
      {numbered ? (
        <ol>
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
      ) : (
        <ul>
          {items.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
function Empty() {
  return (
    <div className="panel empty-state">
      <Search size={30} />
      <h2>Nenhuma conexão por aqui ainda.</h2>
      <p>Tente outro termo ou remova o filtro de assunto.</p>
    </div>
  );
}
