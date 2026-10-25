// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EvoluaApp } from "../src/components/evolua-app";
import { emptyProgress, STORAGE_KEY } from "../src/lib/learning-engine";
import { GAME_PACKS_STORAGE_KEY } from "../src/hooks/use-game-packs";
import { testGamePack } from "./game-fixture";
beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, "", "/");
  Object.defineProperty(window, "scrollTo", { value: vi.fn(), writable: true });
});
afterEach(cleanup);
async function load() {
  render(<EvoluaApp />);
  await screen.findByRole("heading", {
    name: "Seu próximo nível começa aqui.",
  });
  return userEvent.setup();
}
describe("Evolua application flows without network or browser automation", () => {
  it("starts with real zero progress and displays all four study trails", async () => {
    const user = await load();
    expect(screen.getByText("XP conquistados")).toBeTruthy();
    await user.click(screen.getByRole("link", { name: "Minhas trilhas" }));
    expect(
      await screen.findByRole("heading", { name: "Um mundo para descobrir." }),
    ).toBeTruthy();
    expect(
      screen.getAllByRole("button", { name: "Explorar trilha" }),
    ).toHaveLength(4);
  });
  it("reveals a flashcard, records self-evaluation, saves it and moves to the next card", async () => {
    const user = await load();
    await user.click(
      screen.getByRole("button", { name: "Começar a aprender" }),
    );
    expect(
      screen.queryByRole("button", { name: "Consigo explicar" }),
    ).toBeNull();
    const controls = screen.getByRole("complementary", {
      name: "Controles da atividade",
    });
    await user.click(
      within(controls).getByRole("button", { name: "Revelar resposta" }),
    );
    expect(within(controls).getAllByRole("button")).toHaveLength(4);
    await user.click(
      within(controls).getByRole("button", { name: "Consigo explicar" }),
    );
    expect(
      await screen.findByRole("heading", {
        name: "Boa! Mais uma conexão feita.",
      }),
    ).toBeTruthy();
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(saved.xp).toBe(12);
    expect(Object.keys(saved.items)).toHaveLength(1);
    await user.click(
      within(controls).getByRole("button", { name: "Próxima atividade" }),
    );
    expect(
      screen.getByRole("button", { name: "Revelar resposta" }),
    ).toBeTruthy();
  });
  it("locks quiz options after an answer and provides feedback per alternative", async () => {
    const user = await load();
    await user.click(screen.getByRole("link", { name: "Quizzes" }));
    await user.click(
      await screen.findByRole("button", { name: "Começar rodada" }),
    );
    const options = screen
      .getAllByRole("button")
      .filter((el) => el.classList.contains("quiz-option"));
    expect(options.length).toBeGreaterThan(1);
    await user.click(options[0]);
    expect(options.every((el) => (el as HTMLButtonElement).disabled)).toBe(
      true,
    );
    expect(screen.getByText("Entender todas as alternativas")).toBeTruthy();
    const controls = screen.getByRole("complementary", {
      name: "Controles da atividade",
    });
    expect(
      within(controls).getByRole("region", { name: "Explicação da resposta" }),
    ).toBeTruthy();
    expect(
      within(controls).getByRole("button", { name: "Próxima atividade" }),
    ).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBeGreaterThan(
      0,
    );
  });
  it("shows source references in a dialog and closes on Escape", async () => {
    const user = await load();
    await user.click(
      screen.getByRole("button", { name: "Começar a aprender" }),
    );
    await user.click(screen.getByRole("button", { name: /Ver fonte/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("TRECHO DE REFERÊNCIA")).toBeTruthy();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("saves profile preferences and restores them on reload", async () => {
    const user = await load();
    await user.click(screen.getByRole("button", { name: "Abrir meu perfil" }));
    await user.type(
      await screen.findByLabelText("Como podemos chamar você?"),
      "Ana",
    );
    await user.selectOptions(
      screen.getByLabelText("Meta diária de atividades"),
      "5",
    );
    await user.click(
      screen.getByRole("button", { name: "Salvar preferências" }),
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).name).toBe("Ana");
    cleanup();
    history.replaceState(null, "", "/");
    render(<EvoluaApp />);
    expect(
      await screen.findByRole("heading", { name: "Vamos evoluir, Ana?" }),
    ).toBeTruthy();
  });
  it("filters glossary and persists discursive drafts", async () => {
    const user = await load();
    await user.click(screen.getByRole("link", { name: "Biblioteca" }));
    await user.click(await screen.findByRole("tab", { name: "Glossário" }));
    await user.type(
      screen.getByRole("textbox", { name: "Buscar na biblioteca" }),
      "zzzzzz",
    );
    expect(
      screen.getByRole("heading", { name: "Nenhuma conexão por aqui ainda." }),
    ).toBeTruthy();
    await user.click(screen.getByRole("tab", { name: "Treino discursivo" }));
    const details = document.querySelectorAll(".resource-details");
    await user.click(details[0].querySelector("summary")!);
    const note = within(details[0] as HTMLElement).getByLabelText(
      "Sua resposta",
    );
    await user.type(note, "Ciência utiliza métodos e critérios de validação.");
    expect(
      Object.values(JSON.parse(localStorage.getItem(STORAGE_KEY)!).notes),
    ).toContain("Ciência utiliza métodos e critérios de validação.");
  });
  it("requires confirmation before deleting progress", async () => {
    const p = emptyProgress();
    p.xp = 120;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    const user = await load();
    await user.click(screen.getByRole("button", { name: "Abrir meu perfil" }));
    await user.click(
      await screen.findByRole("button", { name: "Reiniciar progresso" }),
    );
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(120);
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Apagar progresso local",
      }),
    );
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBe(0),
    );
  });
  it("opens the game laboratory and records a true-or-false answer", async () => {
    localStorage.setItem(
      GAME_PACKS_STORAGE_KEY,
      JSON.stringify([testGamePack]),
    );
    const user = await load();
    await user.click(screen.getByRole("link", { name: "Jogos" }));
    expect(
      await screen.findByRole("heading", {
        name: "Aprenda jogando com qualquer assunto.",
      }),
    ).toBeTruthy();
    await user.selectOptions(
      screen.getByLabelText("Pacote de conteúdo"),
      testGamePack.id,
    );
    await user.click(
      screen.getByRole("button", { name: "Jogar Verdadeiro ou falso" }),
    );
    await user.click(screen.getByRole("button", { name: "Verdadeiro" }));
    expect(screen.getByRole("status")).toBeTruthy();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).xp).toBeGreaterThan(
      0,
    );
  });
  it("imports and activates a valid modular game package", async () => {
    const user = await load();
    await user.click(screen.getByRole("link", { name: "Jogos" }));
    const pack = {
      schema: "evolua-game-pack",
      version: 1,
      id: "matematica-basica",
      title: "Matemática básica",
      description: "Operações fundamentais.",
      modules: [
        {
          id: "soma",
          title: "Adição",
          description: "Pratique somas simples.",
          pairs: [
            {
              id: "par-um",
              prompt: "2 + 2",
              answer: "4",
              explanation: "Dois mais dois é quatro.",
            },
            {
              id: "par-dois",
              prompt: "3 + 2",
              answer: "5",
              explanation: "Três mais dois é cinco.",
            },
          ],
          trueFalse: [],
          multipleChoice: [],
        },
      ],
    };
    const file = new File([JSON.stringify(pack)], "matematica.json", {
      type: "application/json",
    });
    await user.upload(
      screen.getByLabelText("Selecionar pacote de jogos"),
      file,
    );
    await screen.findByRole("region", { name: "Prévia do pacote" });
    expect(localStorage.getItem(GAME_PACKS_STORAGE_KEY)).toBeNull();
    await user.click(
      screen.getByLabelText(
        "Revisei as atividades, as referências e os alertas apresentados.",
      ),
    );
    await user.click(screen.getByRole("button", { name: "Ativar pacote" }));
    expect(
      await screen.findByText(
        "Pacote “Matemática básica” importado e pronto para jogar.",
      ),
    ).toBeTruthy();
    expect(
      (screen.getByLabelText("Pacote de conteúdo") as HTMLSelectElement).value,
    ).toBe("matematica-basica");
    const saved = JSON.parse(localStorage.getItem(GAME_PACKS_STORAGE_KEY)!);
    expect(saved[0].title).toBe("Matemática básica");
  });
});
