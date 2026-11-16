import { afterEach, expect, it, vi } from "vitest";
vi.mock("../src/lib/firebase-server",()=>({AuthFailure:class extends Error {},verifiedIdentity:vi.fn(async()=>({uid:"a"})),canAccess:vi.fn(()=>true)}));
import { POST } from "../src/app/api/tutor/route";
import { canAccess } from "../src/lib/firebase-server";
afterEach(()=>{vi.unstubAllEnvs();vi.mocked(canAccess).mockReturnValue(true);});
const request=()=>new Request("https://test/api/tutor",{method:"POST",body:JSON.stringify({action:"analogy"})});
it("never enables mock in production",async()=>{
 vi.stubEnv("NODE_ENV","production");vi.stubEnv("TUTOR_DEV_MOCK","true");
 const r=await POST(request());expect(r.status).toBe(503);expect(r.headers.get("cache-control")).toContain("no-store");
});
it("requires authorization and explicitly enabled development mode",async()=>{
 vi.stubEnv("NODE_ENV","development");vi.stubEnv("TUTOR_DEV_MOCK","true");
 expect((await POST(request())).status).toBe(200);
 vi.mocked(canAccess).mockReturnValue(false);expect((await POST(request())).status).toBe(403);
});
