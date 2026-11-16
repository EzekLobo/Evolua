// @vitest-environment jsdom
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGamePacks } from "../src/hooks/use-game-packs";
import { useProgress } from "../src/hooks/use-progress";
import { restoreBackup } from "../src/lib/backup";
import { emptyProgress } from "../src/lib/learning-engine";
import { privateStorageKey, privateStorageKeys } from "../src/lib/private-storage";
import { testGamePack } from "./game-fixture";

const ACCOUNT_A = "uid-a";
const ACCOUNT_B = "uid-b";

function AccountHarness({ uid }: { uid: string }) {
  const progress = useProgress(uid);
  const packs = useGamePacks(uid);
  return (
    <>
      <output data-testid="ready">{String(progress.ready)}</output>
      <output data-testid="xp">{progress.progress.xp}</output>
      <output data-testid="custom-packs">
        {packs.customPacks.map((pack) => pack.id).join(",")}
      </output>
      <button
        onClick={() =>
          progress.update((current) => ({ ...current, xp: current.xp + 5 }))
        }
      >
        add-progress
      </button>
      <button onClick={() => packs.savePack(testGamePack)}>save-pack</button>
    </>
  );
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("EP-110 private UID storage", () => {
  it("keeps account A and B isolated and restores A after switching back", async () => {
    const user = userEvent.setup();
    const view = render(<AccountHarness uid={ACCOUNT_A} />);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    await user.click(screen.getByRole("button", { name: "add-progress" }));
    await user.click(screen.getByRole("button", { name: "save-pack" }));
    expect(screen.getByTestId("xp").textContent).toBe("5");
    expect(screen.getByTestId("custom-packs").textContent).toContain(
      testGamePack.id,
    );

    view.rerender(<AccountHarness uid={ACCOUNT_B} />);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    expect(screen.getByTestId("xp").textContent).toBe("0");
    expect(screen.getByTestId("custom-packs").textContent).toBe("");
    await user.click(screen.getByRole("button", { name: "add-progress" }));
    expect(screen.getByTestId("xp").textContent).toBe("5");

    view.rerender(<AccountHarness uid={ACCOUNT_A} />);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    expect(screen.getByTestId("xp").textContent).toBe("5");
    expect(screen.getByTestId("custom-packs").textContent).toContain(
      testGamePack.id,
    );
    expect(localStorage.getItem(privateStorageKey(ACCOUNT_B, "progress"))).toContain(
      '"xp":5',
    );
  });

  it("ignores a storage event belonging to another UID", async () => {
    render(<AccountHarness uid={ACCOUNT_A} />);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    const foreign = { ...emptyProgress(), xp: 900 };
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: privateStorageKey(ACCOUNT_B, "progress"),
          newValue: JSON.stringify(foreign),
        }),
      );
    });
    expect(screen.getByTestId("xp").textContent).toBe("0");
  });

  it("does not auto-import legacy global progress", async () => {
    localStorage.setItem("evolua.progress.v1", JSON.stringify({ ...emptyProgress(), xp: 77 }));
    render(<AccountHarness uid={ACCOUNT_A} />);
    await waitFor(() => expect(screen.getByTestId("ready").textContent).toBe("true"));
    expect(screen.getByTestId("xp").textContent).toBe("0");
  });

  it("restores only into the current UID, ignoring an editable UID field", () => {
    const progress = { ...emptyProgress(), xp: 42 };
    const tampered = JSON.parse(
      JSON.stringify({
        app: "evolua",
        uid: ACCOUNT_B,
        progress,
        packs: [testGamePack],
      }),
    );
    restoreBackup(tampered, ACCOUNT_A);
    const keysA = privateStorageKeys(ACCOUNT_A);
    expect(JSON.parse(localStorage.getItem(keysA.progress)!)).toMatchObject({ xp: 42 });
    expect(JSON.parse(localStorage.getItem(keysA.gamePacks)!)).toHaveLength(1);
    expect(localStorage.getItem(privateStorageKey(ACCOUNT_B, "progress"))).toBeNull();
  });

  it("preserves the original namespace when restore storage fails", () => {
    const keys = privateStorageKeys(ACCOUNT_A);
    const oldProgress = { ...emptyProgress(), xp: 11 };
    localStorage.setItem(keys.progress, JSON.stringify(oldProgress));
    localStorage.setItem(keys.gamePacks, JSON.stringify([testGamePack]));
    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
      this: Storage,
      key: string,
      value: string,
    ) {
      if (key === keys.progress) throw new DOMException("full", "QuotaExceededError");
      return originalSetItem.call(this, key, value);
    });

    expect(() =>
      restoreBackup(
        { app: "evolua", progress: { ...emptyProgress(), xp: 99 }, packs: [] },
        ACCOUNT_A,
      ),
    ).toThrow();
    expect(JSON.parse(localStorage.getItem(keys.progress)!)).toMatchObject({ xp: 11 });
    expect(JSON.parse(localStorage.getItem(keys.gamePacks)!)).toHaveLength(1);
  });
});
