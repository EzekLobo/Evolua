// @vitest-environment jsdom
import { beforeEach, expect, it } from "vitest";
import raw from "../content/course-example.json";
import { coursePackSchema } from "../src/lib/course-schema";
import { learningId, readCourseLearning, writeCourseLearning, recommendation } from "../src/lib/course-learning";
import { backupSchema, restoreBackup } from "../src/lib/backup";
import { emptyProgress } from "../src/lib/learning-engine";
const pack=coursePackSchema.parse(raw);
beforeEach(()=>localStorage.clear());
it("isolates accounts and restores course position and performance to target UID",()=>{
 const data={[learningId(pack)]:{lesson:1,results:{}}};
 writeCourseLearning("a",data);
 expect(readCourseLearning("b")).toEqual({});
 restoreBackup(backupSchema.parse({app:"evolua",progress:emptyProgress(),courseLearning:data,uid:"a"}),"b");
 expect(readCourseLearning("b")).toEqual(data);
 expect(readCourseLearning("a")).toEqual(data);
});
it("prioritizes due and wrong answers, ignores changed answers",()=>{
 const a=pack.modules[0].lessons[0].activities[0];
 const data={[learningId(pack)]:{lesson:1,results:{[a.id]:{correct:false,attempts:1,due:1,signature:a.expectedAnswer}}}};
 expect(recommendation(pack,data,2).index).toBe(0);
 data[learningId(pack)].results[a.id].signature="changed";
 expect(recommendation(pack,data,2).index).toBe(1);
});
