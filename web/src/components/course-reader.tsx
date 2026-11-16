"use client";
import { useEffect, useState } from "react";
import { MathText } from "./math-text";
import { Map } from "lucide-react";
import type { CourseBlock, CoursePack } from "../lib/course-schema";
import { privateStorageKey } from "../lib/private-storage";
import { firebaseAuth } from "../lib/firebase-client";
import { learningId, readCourseLearning, writeCourseLearning, type CourseLearning } from "../lib/course-learning";

function Block({ block }: { block: CourseBlock }) {
  if (block.type === "text") return <div className="concept-paragraphs">{block.text.split(/\n\s*\n/).filter(Boolean).map((text,i)=><p key={i}><MathText>{text}</MathText></p>)}</div>;
  if (block.type === "list") { const items=block.items.map((s,i)=><li key={i}><MathText>{s}</MathText></li>); return block.ordered ? <ol>{items}</ol> : <ul>{items}</ul>; }
  if (block.type === "resolved-example") return <aside><h4><MathText>{block.title}</MathText></h4><p><MathText>{block.prompt}</MathText></p><ol>{block.steps.map(s=><li key={s.id}><MathText>{s.action}</MathText><p><MathText>{s.reasoning}</MathText></p></li>)}</ol><p><MathText>{block.conclusion}</MathText></p></aside>;
  if (block.type === "counterexample") return <aside><h4><MathText>{block.title}</MathText></h4>{[block.situation,`Erro comum: ${block.commonMistake}`,block.correction,block.whyItMatters].map((s,i)=><p key={i}><MathText>{s}</MathText></p>)}</aside>;
  if (block.type === "synthesis") return <aside><h4>Síntese da seção</h4><ul>{block.keyPoints.map((s,i)=><li key={i}><MathText>{s}</MathText></li>)}</ul><p><MathText>{block.takeaway}</MathText></p></aside>;
  return <aside><h4>Analogia para compreender</h4><p><MathText>{block.familiarSituation}</MathText></p><p><MathText>{block.concept}</MathText></p><ul>{block.mappings.map(s=><li key={s.id}><MathText>{`${s.familiar} → ${s.concept}`}</MathText></li>)}</ul><p><MathText>{`Limites: ${block.limits.join("; ")}`}</MathText></p><p><MathText>{block.returnToConcept}</MathText></p><p><MathText>{block.question}</MathText></p></aside>;
}

export function CourseReader({ pack, uid }: { pack: CoursePack; uid: string }) {
  const lessons = pack.modules.flatMap(m=>m.lessons);
  const [index,setIndex]=useState(0), [answer,setAnswer]=useState(""), [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [learning,setLearning]=useState<CourseLearning>({});
  const [game,setGame]=useState(0), [flipped,setFlipped]=useState(false);
  const [studying,setStudying]=useState(false);
  const [previewLesson,setPreviewLesson]=useState<number|null>(null);
  const [step,setStep]=useState(0);
  const [response,setResponse]=useState("");
  const [checked,setChecked]=useState<boolean|null>(null);
  function changeStep(next:number) { setStep(next);setResponse("");setFlipped(false);setChecked(null);setMessage("");setAnswer(""); }
  useEffect(()=>{
    function load(){try {const data=readCourseLearning(uid);setLearning(data);const saved=data[learningId(pack)];if(saved)setIndex(Math.min(saved.lesson,lessons.length-1));}catch{setMessage("Não foi possível recuperar o acompanhamento.");}}
    load(); const listener=(e:StorageEvent)=>{if(e.key===privateStorageKey(uid,"course-progress"))load();};
    window.addEventListener("storage",listener);return()=>window.removeEventListener("storage",listener);
  },[uid,pack,lessons.length]);
  function persist(position:number, correct?:boolean) {
    try {
      const data=readCourseLearning(uid), id=learningId(pack), previous=data[id]??{lesson:0,results:{}};
      const results={...previous.results}, activity=lesson.activities[game];
      if(correct!==undefined) results[activity.id]={correct,attempts:(results[activity.id]?.attempts??0)+1,due:Date.now()+(correct?86400000:0),signature:activity.expectedAnswer};
      const saved=writeCourseLearning(uid,{...data,[id]:{lesson:position,results}});
      setLearning(saved);setIndex(position);setFlipped(false);setGame(0);setAnswer("");
    } catch {setMessage("Não foi possível salvar. Seu estado anterior foi preservado.");}
  }
  const lesson=lessons[index] ?? lessons[0];
  function isComplete(position:number) { return lessons[position].activities.every(a=>{const r=learning[learningId(pack)]?.results[a.id];return r?.correct&&r.signature===a.expectedAnswer;}); }
  function isUnlocked(position:number) { return lessons.slice(0,position).every((_,i)=>isComplete(i)); }
  function navigate(n:number) { if(!isUnlocked(n))return;persist(n);changeStep(0); }
  async function help(action:string) {
    setBusy(true);setMessage("");
    try {
      const token=await firebaseAuth().currentUser?.getIdToken();
      const context=step<lesson.sections.length?lesson.sections[step]:lesson.sections.filter(s=>lesson.activities[step-lesson.sections.length]?.sectionIds.includes(s.id));
      const response=await fetch("/api/tutor",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({action,question:answer.slice(0,1000),lesson:lesson.title,context:JSON.stringify(context).slice(0,24000)})});
      const result=await response.json();setMessage(result.message);
    } catch {setMessage("Suporte indisponível. Consulte as explicações e fontes da aula.");} finally {setBusy(false);}
  }
  if (!studying) return <section className="panel course-reader course-plan">
    <span className="eyebrow">PLANO DO CURSO</span><h2><MathText>{pack.title}</MathText></h2><p><MathText>{pack.description}</MathText></p>
    <p className="muted">{pack.modules.length} módulos · {lessons.length} aulas · <MathText>{pack.level}</MathText></p>
    <button onClick={()=>setStudying(true)}><MathText>{learning[learningId(pack)] ? "Continuar curso" : "Iniciar curso"}</MathText></button>
    <h3>Módulos e aulas</h3>
    {pack.modules.map((module,i)=><details key={module.id} open={module.lessons.some(l=>l.id===lesson.id)}><summary>{i+1}. <MathText>{module.title}</MathText><span className="module-count">{module.lessons.length} aulas</span></summary><p><MathText>{module.description}</MathText></p><ol className="course-lesson-list">{module.lessons.map(l=>{const position=lessons.findIndex(item=>item.id===l.id),unlocked=isUnlocked(position),complete=isComplete(position),current=unlocked&&!complete&&lessons.slice(0,position).every((_,j)=>isComplete(j));return <li key={l.id} className={current?"lesson-current":unlocked?"lesson-available":"lesson-locked"}><button aria-expanded={previewLesson===position} aria-current={current?"step":undefined} onClick={()=>setPreviewLesson(previewLesson===position?null:position)}><span><MathText>{l.title}</MathText></span><span className="lesson-state"><MathText>{complete?"✓ Concluída":current?"● Aula atual":unlocked?"Disponível":"🔒 Bloqueada"}</MathText></span></button>{previewLesson===position&&<div className="lesson-inline-preview"><p><MathText>{l.description}</MathText></p><p className="muted">{l.sections.length} seções · {l.activities.length} desafios</p>{unlocked?<button onClick={()=>{navigate(position);setPreviewLesson(null);setStudying(true);}}><MathText>{complete?"Revisar aula":"Iniciar aula"}</MathText></button>:<p className="muted">Conclua as aulas anteriores para desbloquear.</p>}</div>}</li>;})}</ol></details>)}
  </section>;
  return <section className="panel course-reader lesson-horizontal"><button className="lesson-plan-icon" aria-label="Abrir plano do curso" title="Plano do curso" onClick={()=>setStudying(false)}><Map size={19}/></button><h2><MathText>{lesson.title}</MathText></h2><p className="muted"><MathText>{pack.title}</MathText> · Aula {index+1} de {lessons.length}</p><p><MathText>{pack.editorial.status === "draft" ? "Rascunho sem revisão editorial" : "Declaração editorial informada pelo autor do arquivo"}</MathText></p>
    <p><MathText>{lesson.description}</MathText></p><details><summary>Objetivos da aula</summary><ul>{pack.objectives.filter(o=>lesson.objectiveIds.includes(o.id)).map(o=><li key={o.id}><MathText>{o.description}</MathText></li>)}</ul></details>
    <div className="lesson-step-header"><span>Etapa {step+1} de {lesson.sections.length+lesson.activities.length+1}</span><span><MathText>{step<lesson.sections.length ? "Aprender" : step<lesson.sections.length+lesson.activities.length ? "Praticar" : "Conclusão"}</MathText></span></div>
    <progress aria-label="Progresso da aula" max={lesson.sections.length+lesson.activities.length+1} value={step+1}/>
    {step<lesson.sections.length ? (()=>{const section=lesson.sections[step];return <article key={section.id}><h3><MathText>{section.title}</MathText></h3>{section.blocks.map(b=><Block key={b.id} block={b}/>)}<details><summary>Fontes desta etapa</summary>{pack.sources.filter(f=>section.sourceIds.includes(f.id)).map(f=><p key={f.id}><MathText>{f.title}</MathText> — <MathText>{f.locator}</MathText><br/><MathText>{f.excerpt}</MathText></p>)}</details></article>;})() : step<lesson.sections.length+lesson.activities.length ? (()=>{const activity=lesson.activities[step-lesson.sections.length];return <article key={activity.id}><span className="eyebrow">DESAFIO {step-lesson.sections.length+1}</span><h3><MathText>{activity.title}</MathText></h3>{"scenario" in activity&&<p><MathText>{activity.scenario}</MathText></p>}<p><MathText>{activity.prompt}</MathText></p>{"constraints" in activity&&<ul>{activity.constraints.map((c,i)=><li key={i}><MathText>{c}</MathText></li>)}</ul>}
      <label>Sua resposta<textarea value={response} maxLength={12000} disabled={flipped} onChange={e=>setResponse(e.target.value)} placeholder="Tente resolver antes de conferir a explicação."/></label>
      {!flipped ? <button disabled={!response.trim()} onClick={()=>setFlipped(true)}>Conferir resposta</button> : <><aside><h4>Resposta de referência</h4><p><MathText>{activity.expectedAnswer}</MathText></p><p><MathText>{activity.feedback}</MathText></p></aside><p>Compare sua resposta com os critérios. Este desafio tem avaliação pessoal, sem correção automática.</p><div className="lesson-actions">{[true,false].map(correct=><button key={String(correct)} aria-pressed={checked===correct} onClick={()=>{try{const data=readCourseLearning(uid),id=learningId(pack),previous=data[id]??{lesson:index,results:{}};setLearning(writeCourseLearning(uid,{...data,[id]:{...previous,results:{...previous.results,[activity.id]:{correct,attempts:(previous.results[activity.id]?.attempts??0)+1,due:Date.now()+(correct?86400000:0),signature:activity.expectedAnswer}}}}));setChecked(correct);}catch{setMessage("Não foi possível salvar sua avaliação.");}}}><MathText>{correct?"Atendi aos critérios":"Preciso revisar"}</MathText></button>)}</div>{checked===false&&<button onClick={()=>changeStep(Math.max(0,lesson.sections.findIndex(s=>activity.sectionIds.includes(s.id))))}>Revisar explicação relacionada</button>}</>}
    </article>;})() : <article><h3>Etapas da aula concluídas</h3><p>Você chegou ao fim das explicações e desafios. As respostas abertas foram comparadas por você; isso não certifica domínio.</p><p>{lesson.activities.filter(a=>{const r=learning[learningId(pack)]?.results[a.id];return r?.signature===a.expectedAnswer&&r.correct;}).length} de {lesson.activities.length} desafios com critérios atendidos na sua avaliação.</p><button onClick={()=>changeStep(0)}>Revisar aula</button>{index+1<lessons.length?<button disabled={!isComplete(index)} onClick={()=>navigate(index+1)}>Iniciar próxima aula</button>:<button onClick={()=>setStudying(false)}>Voltar ao plano do curso</button>}</article>}
    {step<lesson.sections.length+lesson.activities.length&&<details className="lesson-help" key={step}><summary>Precisa de ajuda nesta etapa?</summary><label>Sua dúvida<textarea maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="O que você gostaria de entender melhor?"/></label><div className="lesson-actions"><button disabled={busy||!answer.trim()} onClick={()=>void help("explain")}>Tirar dúvida</button><button disabled={busy} onClick={()=>void help("analogy")}>Pedir analogia</button></div><div className="lesson-help-response" role="status" aria-live="polite">{busy ? "Preparando explicação…" : message && <MathText>{message}</MathText>}</div></details>}
    <nav className="lesson-navigation" aria-label="Etapas da aula"><button disabled={step===0} onClick={()=>changeStep(step-1)}>← Voltar</button>{step<lesson.sections.length+lesson.activities.length&&<button disabled={step>=lesson.sections.length&&checked===null} onClick={()=>changeStep(step+1)}><MathText>{step<lesson.sections.length?"Continuar →":"Próxima etapa →"}</MathText></button>}</nav>
  </section>;
}
