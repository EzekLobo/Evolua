import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { verify } = vi.hoisted(() => ({ verify: vi.fn() }));
vi.mock("firebase-admin/app", () => ({
  cert: vi.fn(), getApps: () => [{ name: "evolua-admin" }], initializeApp: vi.fn(),
}));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: verify }) }));
import { POST } from "../src/app/api/auth/access/route";

beforeEach(() => {
  vi.stubEnv("FIREBASE_PROJECT_ID", "test-project");
  vi.stubEnv("FIREBASE_CLIENT_EMAIL", "service@example.test");
  vi.stubEnv("FIREBASE_PRIVATE_KEY", "test-key");
  vi.stubEnv("FIREBASE_OWNER_UID", "owner-uid");
  vi.stubEnv("FIREBASE_ALLOWED_UIDS", "member-uid");
  verify.mockReset();
});
afterEach(() => vi.unstubAllEnvs());
const request = (token?: string) => new Request("https://example.test/api/auth/access", {
  method: "POST", headers: token ? { authorization: `Bearer ${token}` } : {},
});
describe("Firebase server authorization", () => {
  it("rejects absent and invalid tokens without granting access", async () => {
    expect((await POST(request())).status).toBe(401);
    expect(verify).not.toHaveBeenCalled();
    verify.mockRejectedValue(new Error("invalid signature"));
    const response = await POST(request("forged"));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ allowed: false, canGenerate: false });
  });
  it("checks revocation and authorizes only the verified owner UID", async () => {
    verify.mockResolvedValue({ uid: "owner-uid", firebase: { sign_in_provider: "password" } });
    const response = await POST(request("valid"));
    expect(verify).toHaveBeenCalledWith("valid", true);
    expect(await response.json()).toEqual({ allowed: true, canGenerate: true });
    expect(response.headers.get("cache-control")).toContain("no-store");
    for (const identity of [{ uid: "other", firebase: { sign_in_provider: "password" } }, { uid: "owner-uid", firebase: { sign_in_provider: "google.com" } }]) {
      verify.mockResolvedValue(identity);
      const denied = await POST(request("valid"));
      expect(denied.status).toBe(403);
      expect(await denied.json()).toEqual({ allowed: false, canGenerate: false });
    }
  });
  it("fails closed when owner or credentials are not configured", async () => {
    verify.mockResolvedValue({ uid: "owner-uid", firebase: { sign_in_provider: "password" } });
    vi.stubEnv("FIREBASE_OWNER_UID", "");
    expect(await (await POST(request("valid"))).json()).toEqual({ allowed: false, canGenerate: false });
    vi.stubEnv("FIREBASE_PRIVATE_KEY", "");
    expect((await POST(request("valid"))).status).toBe(503);
  });
  it("allows approved students without generation and denies them after removal", async () => {
    verify.mockResolvedValue({ uid: "member-uid", firebase: { sign_in_provider: "password" } });
    expect(await (await POST(request("valid"))).json()).toEqual({ allowed: true, canGenerate: false });
    vi.stubEnv("FIREBASE_ALLOWED_UIDS", "");
    expect((await POST(request("valid"))).status).toBe(403);
  });
  it("rejects revoked and disabled sessions", async () => {
    for (const code of ["auth/id-token-revoked", "auth/user-disabled", "auth/id-token-expired"]) {
      verify.mockRejectedValue({ code });
      expect((await POST(request("invalid"))).status).toBe(401);
    }
  });
});
