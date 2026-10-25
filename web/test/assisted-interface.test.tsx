// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EvoluaApp } from "../src/components/evolua-app";
import { AI_PREFERENCE_KEY } from "../src/lib/assisted-authoring";
import { restoreBackup, PACKS_STORAGE_KEY } from "../src/lib/backup";
import { emptyProgress, STORAGE_KEY } from "../src/lib/learning-engine";
import { testGamePack } from "./game-fixture";

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/#jogos");
  window.scrollTo = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function load(withPack = true) {
  if (withPack)
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify([testGamePack]));
  const user = userEvent.setup();
  render(<EvoluaApp />);
  await screen.findByRole("heading", {
    name: "Aprenda jogando com qualquer assunto.",
  });
  if (withPack)
    await user.selectOptions(
      screen.getByLabelText("Pacote de conteúdo"),
      testGamePack.id,
    );
  return user;
}

describe("assisted authoring and full games", () => {
  it("opens the chosen provider without sending prompt in its URL and persists preference", async () => {
    const user = await load(false);
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    await user.selectOptions(
      screen.getByLabelText("Minha IA preferida"),
      "claude",
    );
    await user.click(
      screen.getByRole("button", { name: "Copiar prompt e abrir IA" }),
    );
    expect(open).toHaveBeenCalledWith(
      "https://claude.ai/",
      "_blank",
      "noopener,noreferrer",
    );
    expect(await navigator.clipboard.readText()).toContain(
      "Procedimento de qualidade",
    );
    expect(localStorage.getItem(AI_PREFERENCE_KEY)).toBe("claude");
    cleanup();
    render(<EvoluaApp />);
    await waitFor(() =>
      expect(
        (screen.getByLabelText("Minha IA preferida") as HTMLSelectElement)
          .value,
      ).toBe("claude"),
    );
  });
  it("offers manual fallback if copying fails", async () => {
    const user = await load(false);
    vi.spyOn(window, "open").mockReturnValue(null);
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied"),
    );
    await user.click(
      screen.getByRole("button", { name: "Copiar prompt e abrir IA" }),
    );
    expect(
      await screen.findByText(/Cópia automática indisponível/),
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Abrir ChatGPT" })).toBeTruthy();
  });
  it("preserves invalid input, offers repair and requires preview confirmation before replacing", async () => {
    const user = await load();
    const textarea = screen.getByLabelText("Resposta da IA");
    fireEvent.change(textarea, { target: { value: "{broken}" } });
    await user.click(
      screen.getByRole("button", { name: "Validar e visualizar" }),
    );
    expect(screen.getByRole("alert").textContent).toContain("Sintaxe inválida");
    expect(
      (screen.getByLabelText("Prompt de correção") as HTMLTextAreaElement)
        .value,
    ).toContain("{broken}");
    expect((textarea as HTMLTextAreaElement).value).toBe("{broken}");
    const updated = { ...testGamePack, title: "Revisado", revision: 2 };
    fireEvent.change(textarea, { target: { value: JSON.stringify(updated) } });
    await user.click(
      screen.getByRole("button", { name: "Validar e visualizar" }),
    );
    const activate = screen.getByRole("button", {
      name: "Confirmar substituição do pacote",
    }) as HTMLButtonElement;
    expect(activate.disabled).toBe(true);
    expect(
      JSON.parse(localStorage.getItem(PACKS_STORAGE_KEY)!)[0].revision,
    ).toBe(1);
    await user.click(screen.getByRole("checkbox"));
    await user.click(activate);
    expect(
      JSON.parse(localStorage.getItem(PACKS_STORAGE_KEY)!)[0].revision,
    ).toBe(2);
  });
  it("syncs package removal from another tab", async () => {
    await load();
    act(() => {
      localStorage.removeItem(PACKS_STORAGE_KEY);
      window.dispatchEvent(
        new StorageEvent("storage", { key: PACKS_STORAGE_KEY, newValue: null }),
      );
    });
    await waitFor(() =>
      expect(
        screen.queryByRole("option", { name: testGamePack.title }),
      ).toBeNull(),
    );
  });
  it("reports quota failure without replacing the old package", async () => {
    const user = await load();
    fireEvent.change(screen.getByLabelText("Resposta da IA"), {
      target: { value: JSON.stringify({ ...testGamePack, revision: 2 }) },
    });
    await user.click(
      screen.getByRole("button", { name: "Validar e visualizar" }),
    );
    await user.click(screen.getByRole("checkbox"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    await user.click(
      screen.getByRole("button", { name: "Confirmar substituição do pacote" }),
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Armazenamento cheio",
    );
    expect(
      JSON.parse(localStorage.getItem(PACKS_STORAGE_KEY)!)[0].revision,
    ).toBe(1);
  });
  it("finishes the pair game with a mistake and correct XP accounting", async () => {
    const user = await load();
    await user.click(
      screen.getByRole("button", { name: "Jogar Conecte os pares" }),
    );
    await user.click(screen.getByRole("button", { name: "2 + 2" }));
    await user.click(screen.getByRole("button", { name: "5" }));
    for (const [prompt, answer] of [
      ["2 + 2", "4"],
      ["2 + 3", "5"],
    ]) {
      await user.click(screen.getByRole("button", { name: prompt }));
      await user.click(screen.getByRole("button", { name: answer }));
    }
    expect(
      screen.getByRole("heading", {
        name: "Todas as conexões foram encontradas!",
      }),
    ).toBeTruthy();
    const progress = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(progress.xp).toBe(18);
    expect(
      Object.values(progress.days).map(
        (day) => (day as { reviews: number }).reviews,
      ),
    ).toEqual([3]);
  });
  it("finishes true/false and numbers the first and last questions correctly", async () => {
    const user = await load();
    await user.click(
      screen.getByRole("button", { name: "Jogar Verdadeiro ou falso" }),
    );
    for (let i = 0; i < 2; i++) {
      expect(screen.getByText(`${i + 1} de 2`)).toBeTruthy();
      const statement = screen.getByRole("heading", { level: 1 }).textContent;
      await user.click(
        screen.getByRole("button", {
          name: statement?.includes("igual a 4") ? "Verdadeiro" : "Falso",
        }),
      );
      expect(
        (
          screen.getByRole("button", {
            name: "Verdadeiro",
          }) as HTMLButtonElement
        ).disabled,
      ).toBe(true);
      await user.click(
        screen.getByRole("button", {
          name: i === 1 ? "Ver resultado" : "Próxima afirmação",
        }),
      );
    }
    expect(screen.getByText("2/2")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(24);
  });
  it("finishes the choice game after a wrong answer and shows the right explanation", async () => {
    const user = await load();
    await user.click(
      screen.getByRole("button", { name: "Jogar Desafio de alternativas" }),
    );
    expect(screen.getByText("1 de 1")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /^[AB]\s*5$/ }));
    expect(screen.getByRole("status").textContent).toContain(
      "Resposta correta: 4",
    );
    await user.click(screen.getByRole("button", { name: "Ver resultado" }));
    expect(screen.getByText("0/1")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(4);
  });
  it("restores both packages and progress, while old backups preserve packages", () => {
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify([testGamePack]));
    const progress = { ...emptyProgress(), xp: 37 };
    restoreBackup({ app: "evolua", progress });
    expect(JSON.parse(localStorage.getItem(PACKS_STORAGE_KEY)!)).toHaveLength(
      1,
    );
    restoreBackup({ app: "evolua", progress, packs: [] });
    expect(JSON.parse(localStorage.getItem(PACKS_STORAGE_KEY)!)).toEqual([]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(37);
  });
  it("rolls back packages when saving restored progress fails", () => {
    localStorage.setItem(PACKS_STORAGE_KEY, JSON.stringify([testGamePack]));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(emptyProgress()));
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key,
      value,
    ) {
      if (key === STORAGE_KEY)
        throw new DOMException("full", "QuotaExceededError");
      return original.call(this, key, value);
    });
    expect(() =>
      restoreBackup({
        app: "evolua",
        progress: { ...emptyProgress(), xp: 50 },
        packs: [],
      }),
    ).toThrow();
    expect(JSON.parse(localStorage.getItem(PACKS_STORAGE_KEY)!)).toHaveLength(
      1,
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(0);
  });
  it("restores a full backup through the profile confirmation dialog", async () => {
    const user = await load(false);
    await user.click(screen.getByRole("button", { name: "Abrir meu perfil" }));
    await user.upload(
      screen.getByLabelText("Selecionar backup"),
      new File(
        [
          JSON.stringify({
            app: "evolua",
            progress: { ...emptyProgress(), xp: 99 },
            packs: [testGamePack],
          }),
        ],
        "backup.json",
        { type: "application/json" },
      ),
    );
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Restaurar backup",
      }),
    );
    await user.click(screen.getByRole("link", { name: "Jogos" }));
    expect(
      screen.getByRole("option", { name: testGamePack.title }),
    ).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(99);
  });
});
