// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useAuth } from "../src/hooks/use-auth";
import { EvoluaApp } from "../src/components/evolua-app";
vi.mock("../src/hooks/use-auth", () => ({ useAuth: vi.fn() }));
beforeEach(() => {
  window.scrollTo = vi.fn();
  history.replaceState(null, "", "/#jogos");
  vi.mocked(useAuth).mockReturnValue({ user: null, ready: true, busy: false,
    allowed: false, canGenerate: false, message: "", configured: true, login: vi.fn(), logout: vi.fn() });
});
afterEach(cleanup);
it("blocks direct navigation, ignores local admin flags and exposes no public signup or Google login", () => {
  localStorage.setItem("admin", "true");
  render(<EvoluaApp />);
  expect(screen.getByRole("heading", { name: "Acesso restrito" })).toBeTruthy();
  expect(screen.queryByRole("navigation")).toBeNull();
  expect(screen.queryByRole("button", { name: "Importar arquivo JSON" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Google|Cadastrar|Criar conta/i })).toBeNull();
  localStorage.clear();
});
it("does not allow access when Firebase is unconfigured or authorization is pending", () => {
  const auth = vi.mocked(useAuth)();
  vi.mocked(useAuth).mockReturnValue({ ...auth, configured: false });
  const view = render(<EvoluaApp />);
  expect(screen.getByText(/aguardando configuração/)).toBeTruthy();
  vi.mocked(useAuth).mockReturnValue({ ...auth, ready: false });
  view.rerender(<EvoluaApp />);
  expect(screen.getByRole("status").textContent).toContain("Verificando");
  expect(screen.queryByRole("navigation")).toBeNull();
});
