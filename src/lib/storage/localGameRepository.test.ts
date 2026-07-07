import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localGameRepository } from "./localGameRepository";
import { createMockGameState } from "../__test-fixtures__/gameState";
import { CLE_INDEX, cleSlot } from "./slots";
import type { IndexSlots } from "./slots";

const CLE_LEGACY = "projet-broc:game-state:v1";

/** Mock localStorage pour Node — Vitest tourne sans DOM par défaut. */
class MemoryStorage {
  private data = new Map<string, string>();
  getItem(k: string) {
    return this.data.has(k) ? this.data.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
  removeItem(k: string) {
    this.data.delete(k);
  }
  clear() {
    this.data.clear();
  }
}

beforeEach(() => {
  const storage = new MemoryStorage();
  vi.stubGlobal("window", { localStorage: storage });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function ecrireIndex(index: IndexSlots): void {
  window.localStorage.setItem(CLE_INDEX, JSON.stringify(index));
}

describe("localGameRepository — load", () => {
  it("retourne null si rien n'est stocké", async () => {
    expect(await localGameRepository.load()).toBeNull();
  });

  it("retourne null si JSON invalide (corruption) dans le slot actif", async () => {
    window.localStorage.setItem(cleSlot(1), "not-valid-json{");
    expect(await localGameRepository.load()).toBeNull();
  });

  it("retourne l'état parsé du slot actif si JSON valide", async () => {
    const state = createMockGameState({ budget: 777 });
    window.localStorage.setItem(cleSlot(1), JSON.stringify(state));
    const loaded = await localGameRepository.load();
    expect(loaded?.budget).toBe(777);
  });

  it("lit le slot actif d'après l'index, pas toujours le slot 1", async () => {
    ecrireIndex({
      actif: 2,
      slots: {
        1: { nom: null, derniereSession: 1 },
        2: { nom: null, derniereSession: 2 },
        3: null,
      },
    });
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ budget: 1 })),
    );
    window.localStorage.setItem(
      cleSlot(2),
      JSON.stringify(createMockGameState({ budget: 2 })),
    );

    const loaded = await localGameRepository.load();
    expect(loaded?.budget).toBe(2);
  });

  it("migre la legacy vers le slot 1 au premier load (save unique existante)", async () => {
    window.localStorage.setItem(
      CLE_LEGACY,
      JSON.stringify(createMockGameState({ budget: 999 })),
    );

    const loaded = await localGameRepository.load();

    expect(loaded?.budget).toBe(999);
    expect(window.localStorage.getItem(cleSlot(1))).toBeTruthy();
    expect(window.localStorage.getItem(CLE_LEGACY)).toBeNull();
  });
});

describe("localGameRepository — save", () => {
  it("écrit le state sérialisé sous la clé du slot actif", async () => {
    const state = createMockGameState({ budget: 42 });
    await localGameRepository.save(state);
    const raw = window.localStorage.getItem(cleSlot(1));
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).budget).toBe(42);
  });

  it("save puis load restitue l'état", async () => {
    const state = createMockGameState({ jourActuel: 17 });
    expect(await localGameRepository.save(state)).toBe(true);
    expect((await localGameRepository.load())?.jourActuel).toBe(17);
  });

  it("save écrase l'écriture précédente du même slot", async () => {
    await localGameRepository.save(createMockGameState({ budget: 1 }));
    await localGameRepository.save(createMockGameState({ budget: 2 }));
    expect((await localGameRepository.load())?.budget).toBe(2);
  });

  it("save sur le slot actif 3 n'écrase pas le slot 1", async () => {
    ecrireIndex({
      actif: 3,
      slots: {
        1: { nom: null, derniereSession: 1 },
        2: null,
        3: null,
      },
    });
    window.localStorage.setItem(
      cleSlot(1),
      JSON.stringify(createMockGameState({ budget: 111 })),
    );

    await localGameRepository.save(createMockGameState({ budget: 333 }));

    expect(JSON.parse(window.localStorage.getItem(cleSlot(1))!).budget).toBe(
      111,
    );
    expect(JSON.parse(window.localStorage.getItem(cleSlot(3))!).budget).toBe(
      333,
    );
  });

  it("save met à jour derniereSession du slot actif dans l'index", async () => {
    const avant = Date.now();
    await localGameRepository.save(createMockGameState());
    const idx = JSON.parse(
      window.localStorage.getItem(CLE_INDEX)!,
    ) as IndexSlots;
    expect(idx.slots[1]?.derniereSession).toBeGreaterThanOrEqual(avant);
  });

  it("save ne touche pas derniereSession si l'écriture échoue", async () => {
    const spy = vi
      .spyOn(window.localStorage, "setItem")
      .mockImplementation(() => {
        throw new Error("quota dépassé");
      });

    const ok = await localGameRepository.save(createMockGameState());

    spy.mockRestore();
    expect(ok).toBe(false);
    // toucherDerniereSession n'a jamais été appelé : aucun index n'a été créé.
    expect(window.localStorage.getItem(CLE_INDEX)).toBeNull();
  });
});

describe("localGameRepository — clear", () => {
  it("supprime la clé du slot actif et son entrée d'index", async () => {
    await localGameRepository.save(createMockGameState());
    await localGameRepository.clear();
    expect(window.localStorage.getItem(cleSlot(1))).toBeNull();
    expect(await localGameRepository.load()).toBeNull();
    const idx = JSON.parse(
      window.localStorage.getItem(CLE_INDEX)!,
    ) as IndexSlots;
    expect(idx.slots[1]).toBeNull();
    // clear() laisse l'actif pointer sur le même emplacement (désormais
    // vide) — il ne rebascule jamais, contrairement à supprimerSlot().
    expect(idx.actif).toBe(1);
  });

  it("clear ne touche pas aux autres slots", async () => {
    ecrireIndex({
      actif: 1,
      slots: {
        1: { nom: null, derniereSession: 1 },
        2: { nom: null, derniereSession: 2 },
        3: null,
      },
    });
    window.localStorage.setItem(
      cleSlot(2),
      JSON.stringify(createMockGameState({ budget: 2 })),
    );

    await localGameRepository.clear();

    expect(window.localStorage.getItem(cleSlot(2))).toBeTruthy();
    const idx = JSON.parse(
      window.localStorage.getItem(CLE_INDEX)!,
    ) as IndexSlots;
    expect(idx.slots[2]).not.toBeNull();
  });
});

describe("localGameRepository — environnement sans window", () => {
  it("load() retourne null si window est undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    expect(await localGameRepository.load()).toBeNull();
  });

  it("save() ne plante pas si window est undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    await expect(
      localGameRepository.save(createMockGameState()),
    ).resolves.toBe(false);
  });

  it("clear() ne plante pas si window est undefined (SSR)", async () => {
    vi.stubGlobal("window", undefined);
    await expect(localGameRepository.clear()).resolves.toBeUndefined();
  });
});
