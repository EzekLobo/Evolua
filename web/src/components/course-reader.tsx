"use client";
import { useEffect, useState } from "react";
import type { CourseBlock, CoursePack } from "../lib/course-schema";
import { privateStorageKey } from "../lib/private-storage";
import { firebaseAuth } from "../lib/firebase-client";
import { learningId, readCourseLearning, writeCourseLearning, recommendation, type CourseLearning } from "../lib/course-learning";

function Block({ block }: { block: CourseBlock }) {
  if (block.type === "text") return <p>{block.text}</p>;
  if (block.type === "list") return block.ordered ? <ol>{block.items.map((s,i)=><li key={i}>{s}</li>)}</ol> : <ul>{block.items.map((s,i)=><li key={i}>{s}</li>)}</ul>;
  if (block.type === "resolved-example") return <aside><h4>{block.title}</h4><p>{block.prompt}</p><ol>{block.steps.map(s=><li key={s.id}>{s.action}<p>{s.reasoning}</p></li>)}</ol><p>{block.conclusion}</p></aside>;
  if (block.type === "counterexample") return <aside><h4>{block.title}</h4><p>{block.situation}</p><p>Erro comum: {block.commonMistake}</p><p>{block.correction}</p><p>{block.whyItMatters}</p></aside>;
  if (block.type === "synthesis") return <aside><ul>{block.keyPoints.map((s,i)=><li key={i}>{s}</li>)}</ul><p>{block.takeaway}</p></aside>;
  return <aside><p>{block.familiarSituation}</p><p>{block.concept}</p><ul>{block.mappings.map(s=><li key={s.id}>{s.familiar} → {s.concept}</li>)}</ul><p>Limites: {block.limits.join("; ")}</p><p>{block.returnToConcept}</p><p>{block.question}</p></aside>;
}

export function CourseReader({ pack, uid }: { pack: CoursePack; uid: string }) {
  const lessons = pack.modules.flatMap(m=>m.lessons);
  const [index,setIndex]=useState(0), [answer,setAnswer]=useState(""), [revealed,setRevealed]=useState(false), [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  const [learning,setLearning]=useState<CourseLearning>({});
  const [game,setGame]=useState(0), [flipped,setFlipped]=useState(false);
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
  function navigate(n:number) { persist(n);setRevealed(false); }
  async function help(action:string) {
    setBusy(true);setMessage("");
    try {
      const token=await firebaseAuth().currentUser?.getIdToken();
      const response=await fetch("/api/tutor",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({action,question:answer.slice(0,1000),lesson:lesson.title})});
      const result=await response.json();setMessage(result.message);
    } catch {setMessage("Suporte indisponível. Consulte as explicações e fontes da aula.");} finally {setBusy(false);}
  }
  return <section className="panel"><h2>{pack.title}</h2><p>{pack.editorial.status === "draft" ? "Demonstração / rascunho sem revisão editorial" : "Declaração editorial informada pelo autor do arquivo"}</p>
    <label>Aula <select value={index} onChange={e=>navigate(Number(e.target.value))}>{lessons.map((l,i)=><option key={l.id} value={i}>{l.title}</option>)}</select></label>
    <h3>{lesson.title}</h3><p>{lesson.description}</p><h4>Objetivos</h4><ul>{pack.objectives.filter(o=>lesson.objectiveIds.includes(o.id)).map(o=><li key={o.id}>{o.description}</li>)}</ul>
    {lesson.sections.map(s=><article key={s.id}><h3>{s.title}</h3>{s.blocks.map(b=><Block key={b.id} block={b}/>)}<details><summary>Fontes desta seção</summary>{pack.sources.filter(f=>s.sourceIds.includes(f.id)).map(f=><p key={f.id}>{f.title} — {f.locator}<br/>{f.excerpt}</p>)}</details></article>)}
    <h3>Prática e reflexão</h3><p>Compare sua resposta com a referência. A autoavaliação não atribui XP nem certifica domínio.</p>
    <h4>Jogo de recuperação: cartas da aula</h4><p>{lesson.activities[game].prompt}</p>
    <button onClick={()=>setFlipped(true)}>Virar carta</button>
    {flipped&&<div><p>{lesson.activities[game].expectedAnswer}</p><p>{lesson.activities[game].feedback}</p><button onClick={()=>persist(index,true)}>Lembrei — autoavaliação</button><button onClick={()=>persist(index,false)}>Preciso revisar — autoavaliação</button></div>}
    <button onClick={()=>{setGame((game+1)%lesson.activities.length);setFlipped(false);}}>Outra carta</button>
    <p>Objetivos: {lesson.activities[game].objectiveIds.map(id=>pack.objectives.find(o=>o.id===id)?.title).join(", ")}</p>
    <button onClick={()=>{const title=lesson.sections.find(s=>s.id===lesson.activities[game].sectionIds[0])?.title;Array.from(document.querySelectorAll("h3")).find(el=>el.textContent===title)?.scrollIntoView();}}>Voltar à explicação da carta</button>
    {lesson.activities.map(a=><details key={a.id}><summary>{a.title}</summary><p>{a.prompt}</p>{"scenario" in a&&<p>{a.scenario}</p>}{"constraints" in a&&<ul>{a.constraints.map((c,i)=><li key={i}>{c}</li>)}</ul>}<p>Retome: {a.sectionIds.map(id=>lesson.sections.find(s=>s.id===id)?.title??id).join(", ")}</p><details><summary>Comparar com resposta de referência</summary><p>{a.expectedAnswer}</p><p>{a.feedback}</p></details></details>)}
    <h3>Dúvidas e analogias</h3><textarea aria-label="Sua dúvida ou resposta" maxLength={1000} value={answer} onChange={e=>setAnswer(e.target.value)}/><button disabled={busy} onClick={()=>void help("explain")}>Tirar dúvida</button><button disabled={busy} onClick={()=>void help("analogy")}>Pedir analogia</button><p role="status">{message}</p>
    <h3>Próximo passo sugerido</h3><p>{recommendation(pack,learning).reason}: {lessons[recommendation(pack,learning).index].title}</p><button onClick={()=>navigate(recommendation(pack,learning).index)}>Seguir sugestão</button><p>{revealed?"Retome as seções vinculadas às atividades antes de avançar.":"Você pode escolher outra aula a qualquer momento."}</p><button onClick={()=>setRevealed(true)}>Quero revisar esta aula</button>{index+1<lessons.length&&<button onClick={()=>navigate(index+1)}>Próxima aula</button>}
  </section>;
}
