import { z } from "zod";
import { privateStorageKey } from "./private-storage";
import type { CoursePack } from "./course-schema";
export const courseLearningSchema = z.record(z.string(), z.object({
  lesson: z.number().int().min(0),
  results: z.record(z.string(), z.object({ correct: z.boolean(), attempts: z.number().int().positive(), due: z.number().finite(), signature: z.string() })),
}));
export type CourseLearning = z.infer<typeof courseLearningSchema>;
export function learningId(pack: CoursePack) { return `${pack.id}:${pack.revision}`; }
export function readCourseLearning(uid: string): CourseLearning {
  return courseLearningSchema.parse(JSON.parse(localStorage.getItem(privateStorageKey(uid,"course-progress")) ?? "{}"));
}
export function writeCourseLearning(uid:string, data:CourseLearning) {
  const parsed=courseLearningSchema.parse(data);
  localStorage.setItem(privateStorageKey(uid,"course-progress"),JSON.stringify(parsed));
  return parsed;
}
export function recommendation(pack:CoursePack, data:CourseLearning, now=Date.now()) {
  const lessons=pack.modules.flatMap(m=>m.lessons), state=data[learningId(pack)];
  for(const mode of ["due","wrong"] as const) {
    for(let i=0;i<lessons.length;i++) for(const a of lessons[i].activities) {
      const result=state?.results[a.id];
      if(result?.signature===a.expectedAnswer && (mode==="due"?result.due<=now:!result.correct)) return {index:i, reason:mode==="due"?"Revisão programada":"Retomar dificuldade registrada"};
    }
  }
  return {index:Math.min(state?.lesson??0,lessons.length-1),reason:state?"Retomar a aula em andamento":"Começar o curso"};
}
