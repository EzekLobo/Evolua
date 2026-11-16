// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuth } from "../src/hooks/use-auth";
import { AuthAccount } from "../src/components/auth-account";
const mock = vi.hoisted(() => ({ listener: null as null | ((user: unknown) => Promise<void>), login: vi.fn(), logout: vi.fn() }));
vi.mock("../src/lib/firebase-client", () => ({ authConfigured: true, firebaseAuth: () => ({}), authError: () => "Falha ao entrar. Tente novamente." }));
vi.mock("firebase/auth", () => ({
  onIdTokenChanged: (_auth: unknown, callback: typeof mock.listener) => { mock.listener = callback; return vi.fn(); },
  signInWithEmailAndPassword: mock.login, signOut: mock.logout,
}));
function Harness() { const auth = useAuth(); return <><AuthAccount auth={auth} /><span>{auth.canGenerate ? "generation-allowed" : "generation-denied"}</span></>; }
beforeEach(() => {
  mock.login.mockReset(); mock.logout.mockReset();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ allowed: true, canGenerate: true }) }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const user = { uid: "owner", displayName: "Owner", email: "owner@example.test", getIdToken: async () => "signed-token" };
it("restores login, verifies access and removes it immediately on logout", async () => {
  render(<Harness />);
  await act(async () => { await mock.listener!(null); });
  expect(screen.getByRole("button", { name: "Entrar" })).toBeTruthy();
  await act(async () => { await mock.listener!(user); });
  expect(screen.getByText("generation-allowed")).toBeTruthy();
  expect(fetch).toHaveBeenCalledWith("/api/auth/access", expect.objectContaining({ headers: { Authorization: "Bearer signed-token" }, cache: "no-store" }));
  await act(async () => { screen.getByRole("button", { name: "Sair da conta" }).click(); });
  expect(screen.getByText("generation-denied")).toBeTruthy();
  expect(mock.logout).toHaveBeenCalledOnce();
});
it("does not restore owner access from an old request after logout", async () => {
  let resolve!: (value: Response) => void;
  vi.mocked(fetch).mockReturnValue(new Promise((done) => { resolve = done; }) as Promise<Response>);
  render(<Harness />);
  let old!: Promise<void>;
  await act(async () => { old = mock.listener!(user); });
  await act(async () => { await mock.listener!(null); });
  await act(async () => { resolve(Response.json({ allowed: true, canGenerate: true })); await old; });
  expect(screen.getByText("generation-denied")).toBeTruthy();
});
it("keeps access denied on server failure and shows recoverable login errors", async () => {
  vi.mocked(fetch).mockRejectedValue(new Error("offline"));
  render(<Harness />);
  await act(async () => { await mock.listener!(user); });
  expect(screen.getByText("generation-denied")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain("permanece bloqueado");
  await act(async () => { await mock.listener!(null); });
  mock.login.mockRejectedValue(new Error("cancelled"));
  fireEvent.change(screen.getByLabelText("E-mail"), { target: { value: "owner@example.test" } });
  fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "test-password" } });
  await act(async () => { fireEvent.submit(screen.getByRole("button", { name: "Entrar" }).closest("form")!); });
  expect(mock.login).toHaveBeenCalledWith({}, "owner@example.test", "test-password");
  expect((screen.getByLabelText("Senha") as HTMLInputElement).value).toBe("");
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Tente novamente"));
});

it("denies authenticated accounts not approved by the administrator", async () => {
  vi.mocked(fetch).mockResolvedValue(Response.json({ allowed: false, canGenerate: false }, { status: 403 }));
  render(<Harness />);
  await act(async () => { await mock.listener!(user); });
  expect(screen.getByText("generation-denied")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain("não possui acesso autorizado");
});

it("locks access when the connection goes offline", async () => {
  render(<Harness />);
  await act(async () => { await mock.listener!(user); });
  expect(screen.getByText("generation-allowed")).toBeTruthy();
  act(() => { window.dispatchEvent(new Event("offline")); });
  expect(screen.getByText("generation-denied")).toBeTruthy();
  expect(screen.getByRole("alert").textContent).toContain("Conecte-se");
});
